# GUIDE-day03 — 记住我 + 自动登录

预计时间：**40 分钟**

---

## 📖 今天做什么

在 day02 的基础上增加「记住我」功能。

登录时勾选「记住我」，服务端生成一个 token 返回给前端。前端存下这个 token，下次打开 App 时用 `auto-login` 接口自动登录。

功能入口：
- `POST /auth/login` — 新增 `rememberMe` 参数，勾选时返回 token
- `POST /auth/auto-login` — 用 token 自动登录

---

## 🗑️ v1 回顾：Day 04 的问题

| 问题 | v1 写法 | 后果 |
|------|---------|------|
| ❌ `Math.random()` 生成 token | `.slice(2, 18)` | 可预测，和 day03 的 token 生成方式还不一致 |
| ❌ token 永远不过期 | 存进去就没人管 | 一年前的 token 还能用 |
| ❌ `/tokens` 调试接口 | `SELECT * FROM remember_tokens` | 所有用户的 token 直接暴露 |
| ❌ 无防枚举 | `/auto-login` 可被暴力遍历 | token 空间小 + 无限重试 |

今天 v2 的实现：
- `crypto.randomBytes(48)` → 256 位随机，不可枚举
- 30 天过期，数据库层自动过滤过期 token
- 无调试接口，无泄露风险

---

## 🎯 架构变化

```
day02 → day03 改动分布：

src/
├── domain/
│   └── user-repository.ts               ← ＋3 个方法（记住我）
├── application/
│   ├── login-user.ts                    ← 改：加 rememberMe 逻辑
│   └── auto-login.ts                    ← ★ 新增
├── infrastructure/
│   ├── database.ts                      ← ＋remember_tokens 表
│   └── user-repository-sqlite.ts        ← ＋3 个方法
├── presentation/
│   ├── auth-schema.ts                   ← 改 loginSchema + 加 autoLoginSchema
│   └── auth-controller.ts               ← 改 login 路由 + 加 auto-login 路由
└── index.ts                             ← ＋autoLoginUseCase
```

**改 6 个文件，新增 1 个文件。** 模式已经可预测了——每一层只需要做自己那部分改动。

---

## ✍️ 今天要改的文件

### Step 1 — domain/user-repository.ts（加 3 个接口方法）

在 `updatePassword` 后加入：

```typescript
export interface UserRepository {
  // ...前面的方法不变...

  // 记住我
  createRememberToken(userId: number, token: string, expiresAt: string): Promise<void>;
  findUserIdByRememberToken(token: string): Promise<number | null>;
  deleteRememberToken(token: string): Promise<void>;
}
```

注意区别：
- **重置密码**：`findByResetToken` 返回 `UserWithPassword`（需要拿到用户来改密码）
- **记住我**：`findUserIdByRememberToken` 返回 `number | null`（只需要用户 ID，查一次 user 表拿详情）

返回类型上的细微差异反映了业务差异——接口设计就是这么来的。

---

### Step 2 — infrastructure/database.ts（加 remember_tokens 表）

在 `CREATE TABLE users` 后面，创建新表：

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS remember_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL
  )
`);
```

**📝 设计区别：**

| 对比 | 重置密码 token | 记住我 token |
|------|---------------|-------------|
| 存在位置 | users 表的一列 | 独立的 remember_tokens 表 |
| 原因 | 一个用户同时只有一个重置 token | 一个用户可以在多台设备上勾选「记住我」 |
| 一对多关系 | 不适用 | 适用 |

**独立表 = 支持一对多。** users 表上加列只支持「一人一个 token」。

---

### Step 3 — infrastructure/user-repository-sqlite.ts（实现 3 个方法）

在 `updatePassword` 后加入：

```typescript
async createRememberToken(userId: number, token: string, expiresAt: string): Promise<void> {
  const db = getDatabase();
  db.prepare('INSERT INTO remember_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(userId, token, expiresAt);
}

async findUserIdByRememberToken(token: string): Promise<number | null> {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT user_id FROM remember_tokens WHERE token = ? AND expires_at > ?',
  ).get(token, new Date().toISOString()) as { user_id: number } | undefined;
  return row ? row.user_id : null;
}

async deleteRememberToken(token: string): Promise<void> {
  const db = getDatabase();
  db.prepare('DELETE FROM remember_tokens WHERE token = ?').run(token);
}
```

**过期过滤逻辑**：和 `findByResetToken` 一样的模式——SQL 条件里直接加 `AND expires_at > ?`。过期 token 查不到 = 等同于「已过期」，应用层无需额外判断。

---

### Step 4 — application/login-user.ts（改：加 rememberMe）

这是今天**最重要的改动**——修改一个已有的 use case。

需要改三处：

**① 导入 crypto：**
```typescript
import crypto from 'node:crypto';   // ← 新增
import bcrypt from 'bcryptjs';
```

**② 修改接口和返回值：**
```typescript
export interface LoginUserInput {
  username: string;
  password: string;
  rememberMe?: boolean;          // ← 新增
}

export interface LoginResult {
  user: { id: number; username: string; email: string };
  token?: string;                // ← 新增
}
```

**③ 在 execute 方法末尾加入记住我逻辑：**
```typescript
// 在 return safeUser 之前插入：
const result: LoginResult = { user: safeUser };

if (input.rememberMe) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await this.userRepository.createRememberToken(user.id, token, expiresAt);
  result.token = token;
}

return result;
```

**📝 关键设计：**

1. **不破坏已有功能**：`rememberMe` 是可选参数，不传时行为完全和 day02 一样。新增功能向后兼容。

2. **token 长度 48 字节**（比重置密码的 32 字节长）：因为记住我 token 是长期凭证（30 天），需要更大的密钥空间抵御暴力枚举。`48 字节 = 384 位 = 96 个 hex 字符`。

3. **30 天过期**：和 session cookie 的常见周期一致。过期时间存储在数据库层，比前端更可靠。

---

### Step 5 — 新建 application/auto-login.ts

```typescript
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export class AutoLoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(token: string) {
    const userId = await this.userRepository.findUserIdByRememberToken(token);
    if (!userId) {
      throw new UnauthorizedError('自动登录已过期，请重新登录');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    return user;
  }
}
```

**📝 为什么分两步查（查 token → 查 user），而不是一步 JOIN？**

因为缓存策略——在实际项目中，`findUserIdByRememberToken` 可以用 Redis 加速（token → userId 映射），而 `findById` 是另一个缓存条目。两步查为未来的性能优化留下了空间。

**当然，对于本教程来说，这已经超出了当前范畴。这里这么做主要是为了职责单一：一个方法只做一件事。**

---

### Step 6 — presentation/auth-schema.ts（改 loginSchema + 加 autoLoginSchema）

```typescript
export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),        // ← 新增
});

export const autoLoginSchema = z.object({     // ← 新增
  token: z.string().min(1, 'token 不能为空'),
});
```

---

### Step 7 — presentation/auth-controller.ts（改 login + 加 auto-login）

**① import 加两项：**
```typescript
import { ..., autoLoginSchema } from './auth-schema';    // ← 改
import { AutoLoginUseCase } from '../application/auto-login';  // ← 新增
```

**② 函数签名加参数：**
```typescript
export function createAuthController(
  // ...前面参数不变,
  autoLoginUseCase: AutoLoginUseCase,         // ← 新增
): Router {
```

**③ 修改 login 路由：**
```typescript
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUseCase.execute(input);  // ← 改：用 result 接收
    res.status(200).json({ success: true, data: result });  // ← user → result
  } catch (error) {
    handleError(res, error);
  }
});
```

**④ 在 login 和 forgot-password 之间插入 auto-login 路由：**
```typescript
router.post('/auto-login', async (req: Request, res: Response) => {
  try {
    const { token } = autoLoginSchema.parse(req.body);
    const user = await autoLoginUseCase.execute(token);
    res.json({ success: true, data: user });
  } catch (error) {
    handleError(res, error);
  }
});
```

注意 login 的响应从 `{ data: user }` 变成了 `{ data: { user, token } }`。当 `rememberMe` 为 false 时，`token` 是 `undefined`，响应体是 `{ data: { user } }`。

这种「返回值格式随功能扩展」是正常的——前端可以根据 `data.token` 是否存在来判断是否需要存储 token。

---

### Step 8 — src/index.ts（注册新用例）

```typescript
import { AutoLoginUseCase } from './application/auto-login';   // ← 新增

const autoLoginUseCase = new AutoLoginUseCase(userRepository);   // ← 新增

app.use('/auth', createAuthController(
  registerUseCase, loginUseCase,
  forgotPasswordUseCase, resetPasswordUseCase,
  autoLoginUseCase,            // ← 新增
));
```

---

## ✅ 验证

```bash
rm login-v2.db   # 清除之前数据库
npm start

# 测试注册
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"alice@example.com"}'
# → {"success":true,"data":{"id":1,"username":"alice","email":"alice@example.com"}}

# 测试不勾选记住我登录（不应返回 token）
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# → {"success":true,"data":{"user":{"id":1,"username":"alice","email":"alice@example.com"}}}
#  注意：没有 token 字段

# 测试勾选记住我登录（应返回 token）
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","rememberMe":true}'
# → {"success":true,"data":{"user":{...},"token":"f74eb480ce5209..."}}

# 复制返回的 token，替换 <TOKEN>，测试自动登录
curl -X POST http://localhost:3000/auth/auto-login \
  -H 'Content-Type: application/json' \
  -d '{"token":"<TOKEN>"}'
# → {"success":true,"data":{"id":1,"username":"alice","email":"alice@example.com"}}

# 测试无效 token
curl -X POST http://localhost:3000/auth/auto-login \
  -H 'Content-Type: application/json' \
  -d '{"token":"invalid"}'
# → {"success":false,"message":"自动登录已过期，请重新登录"}
```

---

## 💡 今天学到了什么

### 三种 token 的对比

| Token 种类 | 长度 | 过期 | 存储 | 用途 |
|-----------|------|------|------|------|
| 重置密码 token | 32 字节 | 1 小时 | users 表列 | 一次性，用完即废 |
| 记住我 token | 48 字节 | 30 天 | remember_tokens 表 | 长期凭证，可撤销 |

同一项目，**不同安全等级的业务需要不同长度的 token**。v1 的做法是所有的 token 都用 `Math.random().toString(36).substring(2)`——不考虑安全性、不考虑用途差异。

### 向后兼容

今天的 login 改了两个地方：
1. Input 加了可选 `rememberMe`
2. Return 从 `User` 变成了 `{ user, token? }`

如果前端没有传 `rememberMe`，行为完全和之前一样。**扩接口而不是改接口**——这是 API 设计的基本原则。

延伸到 GUIDEs 的教学方式：你觉得现在的节奏合适吗？如果接下来继续 day04（账户锁定/登录限制），我可以继续按这个模式写。
