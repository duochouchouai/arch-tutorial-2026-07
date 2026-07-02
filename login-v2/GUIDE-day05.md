# GUIDE-day05 — 第三方登录（微信 + QQ）

预计时间：**35 分钟**

---

## 📖 今天做什么

在 day04 的基础上增加微信和 QQ 第三方登录。

`POST /auth/oauth` — 传入 `{ provider, code }`，服务端模拟 OAuth 流程，首次登录自动创建用户，后续登录返回已有用户。

对比 v1 day06：v1 复制粘贴了两个几乎一样的路由（`/oauth/wechat` + `/oauth/qq`）。v2 用一个路由 + 参数化 provider 搞定。

---

## 🗑️ v1 回顾：Day 06 的问题

| 问题 | v1 写法 | 后果 |
|------|---------|------|
| ❌ 复制粘贴式开发 | 微信 50 行 / QQ 50 行，95% 相同 | 修一个 bug 要改两处、往往漏一个 |
| ❌ AppSecret 硬编码 | `appSecret: 'wechat_secret_abc123'` 写在代码里 | 提交到 GitHub = 泄露密钥 |
| ❌ 用户名冲突 | 微信用户 `wechat_xxx`，QQ 用户 `qq_xxx` | 同一个人绑定两个账号 → 两条数据 |
| ❌ 自动注册密码为空 | `INSERT INTO ... password = ''` | OAuth 用户无法走普通登录 |

v2 的改进：
- **一个路由 + 一个用例**，通过 `provider` 参数区分
- **没有 AppSecret**——本教程是模拟场景（真实项目应该放环境变量 + 配置中心）
- **provider 校验集中在一处**——`z.enum(['wechat', 'qq'])`

---

## 🎯 架构变化

```
day04 → day05 改动分布：

src/
├── domain/
│   └── user-repository.ts               ← ＋CreateOAuthUserInput + 2 个方法
├── application/
│   └── oauth-login.ts                   ← ★ 新增
├── infrastructure/
│   ├── database.ts                      ← users 表 ＋2 列
│   └── user-repository-sqlite.ts        ← ＋2 个方法
├── presentation/
│   ├── auth-schema.ts                   ← ＋oauthSchema
│   └── auth-controller.ts               ← ＋/auth/oauth 路由
└── index.ts                             ← ＋OAuthLoginUseCase
```

**改 6 个文件，新增 1 个文件。**

---

## ✍️ 今天要改的文件

### Step 1 — domain/user-repository.ts（加 2 个接口方法）

在 `LockStatus` 之后加入新类型：

```typescript
export interface CreateOAuthUserInput {
  username: string;
  email: string;
  oauthProvider: string;
  oauthId: string;
}
```

然后在 `lockAccount` 之前加入：

```typescript
  // 第三方登录
  findByOAuth(provider: string, oauthId: string): Promise<User | null>;
  createOAuthUser(input: CreateOAuthUserInput): Promise<User>;
```

**📝 为什么没有 `OAuthUserWithPassword`？**

因为 OAuth 用户没有密码。`findByOAuth` 返回普通的 `User` 就够了——OAuth 用户从不需要密码验证。

这和 `findByUsername` 返回 `UserWithPassword`（需要验证密码）形成对比。**不同的业务场景需要不同的返回类型，接口签名能表达这种区别。**

---

### Step 2 — infrastructure/database.ts（users 表加 2 列）

```sql
CREATE TABLE IF NOT EXISTS users (
  ...其他列不变...
  oauth_provider TEXT,       ← 新增：'wechat' 或 'qq'
  oauth_id TEXT              ← 新增：第三方平台的 openid
)
```

**为什么这里用 `TEXT` 而不是单独的 `oauth_users` 表？**

和「记住我」不同，一个用户同时只能有一个微信账号和 QQ 账号（各一个）。这是 1:1 关系，用列存储比用表更简单。如果以后需要「一个用户绑定多个微信账号」，再考虑拆表。

**这就是设计决策的权衡：** 不是所有东西都要做成 1:N 的表——但做决策之前你得先意识到这个 trade-off。

---

### Step 3 — infrastructure/user-repository-sqlite.ts（实现 2 个方法）

在 `lockAccount` 之后、`createRememberToken` 之前插入：

```typescript
async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT id, username, email FROM users WHERE oauth_provider = ? AND oauth_id = ?',
  ).get(provider, oauthId) as UserRow | undefined;
  return row ? toUser(row) : null;
}

async createOAuthUser(input: CreateOAuthUserInput): Promise<User> {
  const db = getDatabase();
  const result = db.prepare(
    'INSERT INTO users (username, email, hashed_password, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?)',
  ).run(input.username, input.email, '', input.oauthProvider, input.oauthId);
  // 注意：OAuth 用户的密码是空字符串——这些用户不能走普通登录

  return { id: Number(result.lastInsertRowid), username: input.username, email: input.email };
}
```

以及别忘了更新 import：

```typescript
import { CreateOAuthUserInput, CreateUserInput, LockStatus, UserRepository, UserWithPassword } from '../domain/user-repository';
```

**📝 `hashed_password = ''`——这合理吗？**

对于纯 OAuth 用户来说合理。他们永远通过微信/QQ 登录，不需要密码。

但如果你以后想支持「OAuth 用户设置密码然后切换成普通登录」，这里就需要改——比如允许 `hashed_password` 为 NULL，或者新建一个「设置密码」的用例。

**合理的设计不是预知未来，而是让未来的改动范围最小。** 今天 OAuth 用户没有密码，所以存空字符串。哪天需要支持「设密码」了，改 `createOAuthUser` 一个地方就行。

---

### Step 4 — 新建 application/oauth-login.ts

```typescript
import { UserRepository } from '../domain/user-repository';
import { ValidationError } from '../shared/errors';

const PROVIDERS = ['wechat', 'qq'] as const;
export type OAuthProvider = typeof PROVIDERS[number];

export interface OAuthLoginInput {
  provider: OAuthProvider;
  code: string;
}

export class OAuthLoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: OAuthLoginInput) {
    if (!PROVIDERS.includes(input.provider)) {
      throw new ValidationError(`不支持的登录方式：${input.provider}（支持 wechat / qq）`);
    }

    // 模拟用 code 换取 openid
    const openid = `${input.provider}_${input.code}`;

    // 查找是否已有绑定
    let user = await this.userRepository.findByOAuth(input.provider, openid);

    if (!user) {
      // 首次登录，自动创建用户
      user = await this.userRepository.createOAuthUser({
        username: `${input.provider}_${openid.slice(-8)}`,
        email: '',
        oauthProvider: input.provider,
        oauthId: openid,
      });
    }

    return user;
  }
}
```

**📝 为什么 v2 只有一个用例而 v1 有两个路由？**

因为 **v1 是用「路由」来区分 provider**，v2 是用「参数」来区分。核心逻辑是完全相同的，v1 把它写了两次，v2 只写一次。

```
v1（复制粘贴）：                    v2（参数化）：
POST /oauth/wechat                POST /auth/oauth
POST /oauth/qq                    → provider: 'wechat' | 'qq'
```

这个区别在代码量上最明显——v1 多了一倍，但逻辑完全没增加。**重复代码 = 不必要的维护成本。**

**关于 provider 校验：** 这里有两次校验——Zod 的 `z.enum(['wechat', 'qq'])` 在前端入口拦一道，use case 里的 `PROVIDERS.includes` 再拦一道。双保险，不依赖某层的校验。

---

### Step 5 — presentation/auth-schema.ts（加 oauthSchema）

```typescript
export const oauthSchema = z.object({
  provider: z.enum(['wechat', 'qq'], { message: '不支持的登录方式（支持 wechat / qq）' }),
  code: z.string().min(1, 'code 不能为空'),
});
```

`z.enum` 自动限制值为数组中的某个值——传 `github` 会直接被 Zod 拒绝，不会进到 use case。

---

### Step 6 — presentation/auth-controller.ts（加 import + 路由）

**① import 加两项：**
```typescript
import { ..., oauthSchema } from './auth-schema';
import { OAuthLoginUseCase } from '../application/oauth-login';
```

**② 函数签名加参数：**
```typescript
export function createAuthController(
  // ...前面参数不变,
  oauthLoginUseCase: OAuthLoginUseCase,
): Router {
```

**③ 在 reset-password 路由后、return 前插入：**
```typescript
  router.post('/oauth', async (req: Request, res: Response) => {
    try {
      const input = oauthSchema.parse(req.body);
      const user = await oauthLoginUseCase.execute(input);
      res.json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });
```

---

### Step 7 — src/index.ts（注册新用例）

```typescript
import { OAuthLoginUseCase } from './application/oauth-login';   // ← 新增

const oauthLoginUseCase = new OAuthLoginUseCase(userRepository);   // ← 新增

app.use('/auth', createAuthController(
  registerUseCase, loginUseCase,
  forgotPasswordUseCase, resetPasswordUseCase,
  autoLoginUseCase, oauthLoginUseCase,     // ← 新增
));
```

---

## ✅ 验证

```bash
rm login-v2.db
npm start

# 1. 微信登录（首次 — 自动注册）
curl -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"wechat","code":"abc123"}'
# → {"success":true,"data":{"id":1,"username":"wechat_t_abc123","email":""}}

# 2. QQ 登录（首次 — 自动注册）
curl -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"qq","code":"xyz789"}'
# → {"success":true,"data":{"id":2,"username":"qq_q_xyz789","email":""}}

# 3. 同一个微信 code 再次登录（返回相同用户——幂等）
curl -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"wechat","code":"abc123"}'
# → {"success":true,"data":{"id":1,...}} 注意 id 不变

# 4. 不支持的 provider（被 Zod 拦截）
curl -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"github","code":"test"}'
# → {"success":false,"message":"不支持的登录方式（支持 wechat / qq）"}

# 5. 之前功能仍然可用
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"a@b.com"}'
# → 正常注册
```

---

## 💡 今天学到了什么

### 对比 v1 day06

| 对比项 | v1（屎山） | v2（清洁架构） |
|--------|-----------|--------------|
| 代码量 | 两个路由 × 50 行 = 100 行 | 一个用例 × 30 行 = 30 行 |
| 逻辑复用 | 复制粘贴，95% 重复 | 参数化，100% 复用 |
| provider 校验 | 散落在两个路由里 | Zod `z.enum` + 用例 `includes` 双重校验 |
| 新增 provider | 再复制一份（第 3 份） | 加一行 `'github'` 到 `PROVIDERS` |
| AppSecret | 硬编码 | 本教程模拟（真实项目放环境变量） |
| 密码处理 | 空字符串（和普通用户混在一起） | 空字符串（但集中在 createOAuthUser） |

### 对比 v1 和 v2 的「多 provider 处理」设计

v1 的做法（复制粘贴路由）：

```
POST /oauth/wechat → 50 行代码（wechat 专用）
POST /oauth/qq     → 50 行代码（qq 专用，95% 相同）
→ 要加 github？再写 50 行
→ 修复一个 bug 要改 2 处（以后是 3 处、N 处）
```

v2 的做法（参数化）：

```
POST /auth/oauth   → 30 行代码（参数 provider 区分）
→ 要加 github？加一行到 PROVIDERS[]，一行到 z.enum()
→ 修复 bug 只改 1 处
```

**复制粘贴是最隐蔽的技术债——因为它当时确实是最快的方式。** 但每次复制都是在为未来的自己埋坑。

### 延伸思考

- 如果要加「GitHub 登录」，需要改几个文件？改多少行代码？
- 如果每个 provider 的 openid 生成逻辑不一样（微信用 unionid、QQ 用 openid），应该在哪里处理这种差异？
- 为什么 `findByOAuth` 返回 `User` 而 `findByUsername` 返回 `UserWithPassword`？
- OAuth 用户没有密码——如果以后想支持「OAuth 用户设置密码」，需要改哪些文件？

---

## 📁 参考 solution

`solution/day05/` 包含完整的 day01 → day05 代码。
