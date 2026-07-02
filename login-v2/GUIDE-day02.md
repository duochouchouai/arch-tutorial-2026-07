# GUIDE-day02 — 忘记密码 + 重置密码

预计时间：**40 分钟**（概念 5 分钟 + 手打 30 分钟 + 验证 5 分钟）

---

## 📖 今天做什么

在 day01 的基础上增加「忘记密码 / 重置密码」功能。

和 v1 day03 做同一个功能，但这次：
- 用 `crypto.randomBytes` 生成 token（对比 v1 的 `Math.random()`）
- token 1 小时过期（对比 v1 的永久有效）
- 不泄露邮箱是否注册（对比 v1 的「该邮箱未注册」）
- 重置后 token 立即失效（对比 v1 的 token 可重复使用）
- token 存储和校验都用参数化查询（对比 v1 的字符串拼接）

功能入口：
- `POST /auth/forgot-password` — 提交邮箱，生成重置 token（模拟发邮件）
- `POST /auth/reset-password` — 提交 token + 新密码，重置密码

---

## 🗑️ v1 回顾：Day 03 的问题

| 问题 | v1 写法 | 后果 |
|------|---------|------|
| ❌ `Math.random()` 生成 token | `Math.random().toString(36).substring(2)` | 可预测，攻击者能伪造重置链接 |
| ❌ token 永久有效 | 存进去就没人管 | 三个月前的重置链接还能用 |
| ❌ 泄露邮箱是否注册 | `if (!user) { '该邮箱未注册' }` | 攻击者可批量枚举有效邮箱 |
| ❌ token 重置后只置空 | `reset_token = ''` | 和 `NULL` 语义混乱 |
| ❌ SQL 拼接 | `WHERE email = '${email}'` | 注入攻击 |

今天 v2 的实现会解决每一个问题。

---

## 🎯 架构变化

day01 → day02 的改动分布：

```
src/
├── domain/
│   └── user-repository.ts        ← 加 3 个新方法（接口）
├── application/
│   ├── forgot-password.ts         ← 新增（用例）
│   └── reset-password.ts          ← 新增（用例）
├── infrastructure/
│   ├── database.ts                ← 表加 2 列
│   └── user-repository-sqlite.ts  ← 实现 3 个新方法
├── presentation/
│   ├── auth-schema.ts             ← 加 2 个 schema
│   └── auth-controller.ts         ← 加 2 个路由
└── index.ts                       ← 注册新用例
```

**一共改了 7 个文件，新增 2 个文件。** 每层只改自己该改的部分：
- domain：只加接口方法签名
- application：只写业务逻辑
- infrastructure：只写 SQL
- presentation：只写路由和校验

---

## ✍️ 今天要改的文件

### Step 1 — domain/user-repository.ts（加 3 个接口方法）

找到 `UserRepository` 接口，在 `create` 方法后面加上：

```typescript
export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<UserWithPassword | null>;
  findByEmail(email: string): Promise<UserWithPassword | null>;   // ← 新增
  create(input: CreateUserInput): Promise<User>;

  // 忘记密码 / 重置密码                                           // ← 新增
  updateResetToken(userId: number, token: string, expiresAt: string): Promise<void>;
  findByResetToken(token: string): Promise<UserWithPassword | null>;
  updatePassword(userId: number, newHashedPassword: string): Promise<void>;
}
```

**📝 先定义接口，再实现。** 这就是依赖倒置——domain 层先声明「我需要什么」，infrastructure 层再来实现。

注意 `findByResetToken` 的查询预期会同时校验过期时间（`WHERE reset_token = ? AND reset_token_expires_at > now`），但这个逻辑在基础设施层实现——接口只声明行为，不假设实现方式。

---

### Step 2 — infrastructure/database.ts（表加 2 列）

在 `CREATE TABLE users` 的 SQL 末尾加上：

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  hashed_password TEXT NOT NULL,
  reset_token TEXT,              ← 新增
  reset_token_expires_at TEXT    ← 新增
)
```

**注意：** 如果你已经跑过 day01 的代码，数据库文件已经存在，新列不会自动加上。你需要**删除 `login-v2.db` 再启动**——这就是为什么生产环境需要数据库迁移脚本。

但在本教程中，因为每天都是独立练习，删库重来是最简单的。

---

### Step 3 — infrastructure/user-repository-sqlite.ts（实现 3 个新方法）

在 `create` 方法后面加上：

```typescript
async findByEmail(email: string): Promise<UserWithPassword | null> {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  return row ? toUserWithPassword(row) : null;
}

async updateResetToken(userId: number, token: string, expiresAt: string): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?')
    .run(token, expiresAt, userId);
}

async findByResetToken(token: string): Promise<UserWithPassword | null> {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires_at > ?',
  ).get(token, new Date().toISOString()) as UserRow | undefined;
  return row ? toUserWithPassword(row) : null;
}

async updatePassword(userId: number, newHashedPassword: string): Promise<void> {
  const db = getDatabase();
  db.prepare(
    'UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
  ).run(newHashedPassword, userId);
}
```

**📝 关键设计点：**

1. **`findByResetToken` 同时校验过期**：SQL 的 `WHERE` 条件里直接比较 `reset_token_expires_at > ?`。token 过期了直接查不到，等价于「无效」。不需要在应用层再手动判断。

2. **`updatePassword` 同时清空 token**：重置密码后 `reset_token` 和 `reset_token_expires_at` 都设为 `NULL`。同一 token 不能重复使用——对比 v1 的 `reset_token = ''`。

3. **所有查询都是参数化 `?` 占位符**：和 day01 保持一致，没有新增任何 SQL 注入入口。

---

### Step 4 — 新建 application/forgot-password.ts

创建新文件 `src/application/forgot-password.ts`：

```typescript
import crypto from 'node:crypto';
import { UserRepository } from '../domain/user-repository';

export class ForgotPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await this.userRepository.updateResetToken(user.id, token, expiresAt);

      console.log('重置链接: http://localhost:3000/auth/reset-password?token=' + token);
      console.log('（模拟发邮件，生产环境应接入邮件服务）');
    }
    // 邮箱不存在 → 什么都不做，但仍然返回成功
  }
}
```

**📝 v1 vs v2 的关键差异：**

| 方面 | v1（Day 03） | v2（Day 02） |
|------|-------------|-------------|
| 随机数 | `Math.random()` | `crypto.randomBytes(32)` |
| 安全性 | 可预测，~10^15 种 | 密码学安全，2^256 种 |
| 过期时间 | ❌ 无 | ✅ 1 小时 |
| 邮箱枚举 | ❌ 泄露是否注册 | ✅ 统一返回「已发送」 |
| 发邮件 | ❌ 只打 log | ✅ 只打 log（暂同，留待后续改进） |

---

### Step 5 — 新建 application/reset-password.ts

创建新文件 `src/application/reset-password.ts`：

```typescript
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { ValidationError, UnauthorizedError } from '../shared/errors';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export class ResetPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ResetPasswordInput) {
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new ValidationError('密码至少6个字符');
    }

    const user = await this.userRepository.findByResetToken(input.token);
    if (!user) {
      throw new UnauthorizedError('重置链接无效或已过期');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedPassword);
  }
}
```

**📝 两层校验：**

1. **参数校验**（代码层）：密码长度 `>= 6`，不够则抛 `ValidationError`
2. **业务校验**（数据库层）：`findByResetToken` 查不到（token 无效或过期），抛 `UnauthorizedError`

两层校验分工明确——代码层管「输入格式」，数据库层管「业务状态」。不像 v1 全部堆在 handler 里。

---

### Step 6 — presentation/auth-schema.ts（加 2 个 schema）

在文件末尾加上：

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token 不能为空'),
  newPassword: z.string().min(6, '密码至少6个字符'),
});
```

---

### Step 7 — presentation/auth-controller.ts（改签名 + 加路由）

有两处改动：

**① 函数签名（第 4-6 行附近）：** 导入新 schema 和 use case，并加新参数：

```typescript
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth-schema';
import { RegisterUserUseCase } from '../application/register-user';
import { LoginUserUseCase } from '../application/login-user';
import { ForgotPasswordUseCase } from '../application/forgot-password';   // ← 新增
import { ResetPasswordUseCase } from '../application/reset-password';     // ← 新增
import { AppError } from '../shared/errors';

export function createAuthController(
  registerUseCase: RegisterUserUseCase,
  loginUseCase: LoginUserUseCase,
  forgotPasswordUseCase: ForgotPasswordUseCase,   // ← 新增
  resetPasswordUseCase: ResetPasswordUseCase,     // ← 新增
): Router {
```

**② 路由注册（在 login 路由后面）：** 加两个新路由：

```typescript
  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await forgotPasswordUseCase.execute(email);
      res.json({ success: true, message: '重置链接已发送到您的邮箱' });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await resetPasswordUseCase.execute(input);
      res.json({ success: true, message: '密码重置成功' });
    } catch (error) {
      handleError(res, error);
    }
  });
```

注意到 `forgot-password` 的 controller 代码只有 9 行——因为业务逻辑全在 use case 里。Controller 只管「拿请求 → 调用例 → 返回响应」。

---

### Step 8 — src/index.ts（注册新用例）

在组合根中，登录用例下面加上：

```typescript
import { ForgotPasswordUseCase } from './application/forgot-password';
import { ResetPasswordUseCase } from './application/reset-password';

const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepository);
const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);
```

然后更新路由注册，传入新参数：

```typescript
app.use('/auth', createAuthController(
  registerUseCase,
  loginUseCase,
  forgotPasswordUseCase,
  resetPasswordUseCase,
));
```

**组合根又变长了**——但这是好事。所有依赖关系都集中在一个地方，一目了然。不看代码正文，只看 `index.ts` 就知道整个应用有哪些组件。

---

## ✅ 验证

```bash
# 确保删掉之前 day01 的数据库（如果有）
rm login-v2.db

# 启动
npm start

# 测试注册
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"alice@example.com"}'
# → {"success":true,"data":{"id":1,"username":"alice","email":"alice@example.com"}}

# 测试忘记密码（你会看到服务端日志打印出重置链接）
curl -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com"}'
# → {"success":true,"message":"重置链接已发送到您的邮箱"}

# 从服务端日志复制 token，替换下面 <TOKEN>，测试重置
curl -X POST http://localhost:3000/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<TOKEN>","newPassword":"654321"}'
# → {"success":true,"message":"密码重置成功"}

# 用新密码登录
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"654321"}'
# → {"success":true,"data":{"id":1,"username":"alice","email":"alice@example.com"}}

# 用旧密码登录（应该失败）
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# → {"success":false,"message":"用户名或密码错误"}

# 测试未注册邮箱（不应泄露邮箱是否存在）
curl -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com"}'
# → {"success":true,"message":"重置链接已发送到您的邮箱"}（和注册邮箱返回一样）
```

---

## 💡 今天学到了什么

### 对比 v1 的同一个功能

| 对比项 | v1（屎山） | v2（清洁架构） |
|--------|-----------|--------------|
| Token 生成 | `Math.random()` | `crypto.randomBytes(32)` |
| Token 过期 | 永久有效 | 1 小时 + SQL 层校验 |
| 邮箱枚举 | 泄露是否注册 | 统一返回「已发送」 |
| 重置后 token | 置空字符串 | 设为 NULL + 返回码保护 |
| 错误处理 | 无 | ValidationError + UnauthorizedError |
| 数据库 | 字符串拼接 | 参数化查询 |
| 代码分布 | 全在 main.js | domain → application → infrastructure → presentation 各司其职 |

### 观察：清洁架构下的「改动冲击波」

回顾今天改动的 7 个文件，你会发现一个规律：

```
domain/user-repository    加方法签名
          ↓                     3 个方法「流经」每一层
infrastructure           实现 SQL
          ↓
application              写业务逻辑
          ↓
presentation             加路由
```

每层只改了一点点，而且改的都是自己该负责的部分。**这就是关注点分离的效果。**

对比 v1：v1 加忘记密码时，开发者在 `main.js` 里加了 43 行代码，全部堆在一个文件里。没有「在哪加」「加什么」的指引——想加在哪就加在哪。

### 延伸思考

- `forgot-password` 返回的 `message` 写死了「重置链接已发送到您的邮箱」，不区分邮箱是否存在。如果产品经理要求「已注册的邮箱返回已发送，未注册的提示先去注册」，你会改哪一层？
- 如果要把 token 过期时间从 1 小时改成 30 分钟，改哪个文件？
- 如果要把 `console.log` 模拟发邮件换成真实的邮件服务，应该在哪一层引入变化？
- 对比 v1 day03 的 `Math.random()` 和这里的 `crypto.randomBytes(32)`——谁会在意这点区别？v1 的开发者知道 `Math.random()` 不安全吗？

---

## 📁 参考 solution

`solution/day02/` 包含了完整的 day01 + day02 代码，可直接运行。

```
solution/day02/
├── src/
│   ├── index.ts                                ← 组合根（4 个用例）
│   ├── application/
│   │   ├── register-user.ts                    ← 不变
│   │   ├── login-user.ts                       ← 不变
│   │   ├── forgot-password.ts                  ← ★ 新增
│   │   └── reset-password.ts                   ← ★ 新增
│   ├── domain/
│   │   ├── user.ts                             ← 不变
│   │   └── user-repository.ts                  ← ＋3 个方法
│   ├── infrastructure/
│   │   ├── database.ts                         ← ＋2 列
│   │   └── user-repository-sqlite.ts           ← ＋3 个方法、1 条过期查询
│   ├── presentation/
│   │   ├── auth-schema.ts                      ← ＋2 个 schema
│   │   └── auth-controller.ts                  ← ＋2 个路由
│   └── shared/errors.ts                        ← 不变
```

卡住时对照，但建议先自己试。
