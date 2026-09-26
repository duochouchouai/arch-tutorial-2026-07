# GUIDE-day05 — 端口、依赖倒置、用例与基础设施接线

预计时间：**180 分钟**（概念 30 + 手打 115 + 验收 35）

> 手打完再对照 `solution/day05/`。这是全教程改动量最大的一天：30+ 个文件。
> 建议顺序：端口 → 用例 → 基础设施 → 表现层 → compose → main → 测试。

---

## 📖 概念

### 1. v1 的用例里藏着 SQL 和 bcrypt

```ts
// v1 application/login-user.ts（缩写）
const row = await db.get('SELECT * FROM users WHERE username = ?', [username])  // ✗ SQL
const ok = await bcrypt.compare(password, row.password_hash)                    // ✗ 算法
if (ok) { row.failed_attempts = 0; await db.run('UPDATE users ...') }           // ✗ 表结构
```
后果：换库要改用例；测用例必须起数据库；bcrypt 让单测慢到不想跑。

### 2. 端口 + 依赖倒置

用例**自己声明**需要什么能力（端口），基础设施去实现：

| 端口（`domain/ports/`） | 用途 | 实现（`infrastructure/`） |
|---|---|---|
| `UserAccountRepositoryPort` | 账号持久化 | `SqliteUserAccountRepository` |
| `PasswordHasherPort` | 哈希/校验 | `BcryptPasswordHasher` |
| `CodeStorePort` | 验证码存取（按 purpose+target） | `SqliteCodeStore` |
| `SessionStorePort` | 会话存取 | `SqliteSessionStore` |
| `MailSenderPort` | 发邮件 | `ConsoleMailSender` |
| `CodeGeneratorPort` | 生成 6 位码 | `CryptoCodeGenerator` |
| `UserRegisteredPublisherPort` | 发注册事件 | `UserRegisteredPublisher` |

所有端口方法返回 `Promise` —— 即使 `node:sqlite` 是同步 API：**端口形状为「换 Postgres / 换远程服务」预留**，
换实现时签名不变。

### 3. 用例：编排，不实现

```ts
export class LoginUseCase {
  readonly #deps: AuthLoginDeps          // deps 的形状也是 Schema（domain/schemas/deps/）
  constructor(deps: AuthLoginDeps) { this.#deps = deps }

  async execute(input: ValidatedLogin): Promise<LoginResult> {
    const row = await this.#deps.userAccountRepository.findByUsername(input.username)
    if (row === null) throw new InvalidCredentialsError()      // 防枚举：与密码错误同一个错误
    const user = UserEntity.fromData(row, this.#deps.timeProvider)
    if (user.isLockedAt(now)) throw new AccountLockedError()
    if (!(await hash.verify(input.password, user.passwordHash))) {
      user.recordFailedLogin(); await repo.update(user.toRow()); throw new InvalidCredentialsError()
    }
    user.recordLogin(); await repo.update(user.toRow())
    const token = idGenerator.generate()
    await sessionStore.save(token, user.id, now + SESSION_TTL_MS)
    return { token, user: user.toSnapshot() }
  }
}
```

用例只做四件事：取数据 → 判分支 → 调实体业务方法 → 写回。**没有 SQL、没有 bcrypt、没有 Express**。

### 4. 依赖契约也是 Schema（`domain/schemas/deps/auth-deps.ts`）

```ts
export const AuthBaseDepsSchema = z.object({
  userAccountRepository: z.custom<UserAccountRepositoryPort>(),
  timeProvider: z.custom<TimeProvider>(),
  idGenerator: z.custom<IdGenerator>(),
})
export type AuthBaseDeps = z.infer<typeof AuthBaseDepsSchema>
```
好处：打开这个文件就知道「登录用例需要哪些能力」，不用读实现。

### 5. 领域服务：判据不落在存储里

`code-verification.service.ts`：

```ts
export function assertCodeValid(stored: StoredCode | null, input: Code, now: number): void {
  if (stored === null) throw new InvalidCodeError()        // 不存在
  if (stored.expiresAt <= now) throw new InvalidCodeError() // 过期
  if (stored.code !== input.value) throw new InvalidCodeError() // 不匹配
}
```
三种失败**合并成同一个错误**（防探测）；而存储（`SqliteCodeStore`）只负责存/取/删 —— **判据归属**清楚。

### 6. 事务边界与「代码生成不用 Math.random」

- 会话 token / 验证码都经 `IdGenerator` / `CodeGenerator` 端口（密码学随机源），v1 用 `Math.random()` —— 可直接猜测；
- 本阶段没有跨表事务（注册写 users + 消费验证码 + 发事件）—— 教程简化，真实仓库用 outbox 保证「事件不丢」，见 Day 06/07 说明。

---

## ✍️ 手打目标（按依赖顺序）

### 1. `domain/ports/`（7 个）+ `domain/errors/auth.errors.ts`

```ts
export class InvalidCredentialsError extends UnauthorizedError {   // 401
  constructor() { super('用户名或密码错误') }
}
export class AccountLockedError extends AppError {                 // 423
  constructor() { super('账号已锁定，请稍后再试', { code: 'ACCOUNT_LOCKED', statusCode: 423 }) }
}
// UsernameTakenError / EmailTakenError（ConflictError, 409）、InvalidCodeError（ValidationError, 400）
```
模块内部件 + 模块专属错误放模块自己的 `domain/`，共享错误（Validation/Conflict/…）留在 shared。

### 2. `domain/schemas/`

`code-record.ts`（`{ code, expiresAt }`）、`session-record.ts`（`{ userId, expiresAt }`）、`deps/auth-deps.ts`（4 个用例契约）。

### 3. `domain/events/user-registered.event.ts` + `application/user-registered.publisher.ts`

事件 = `UserRegisteredEvent extends DomainEvent`（payload 走 Schema）；
发布器 = 端口实现，**失败只记日志绝不抛**（注册不能被副作用拖垮）。

### 4. `application/` 四个用例

- `send-code.usecase.ts`：`CODE_PURPOSE_REGISTER = 'register'`；生成码 → 存（TTL 5 分钟）→ 发邮件；
- `register.usecase.ts`：**先验码**（否则注册接口能白嫖「邮箱是否已注册」）→ 消费码 → 查重 → 哈希 → 建实体 → 落库 → 发事件；
- `login.usecase.ts`：见上文；
- `session.usecase.ts`：`current(token)` / `logout(token)`。

### 5. `infrastructure/`

`bcrypt-password-hasher`（轮数注入）、`sqlite-code-store`（表主键 `(purpose, target)`）、
`sqlite-session-store`（惰性过期）、`console-mail-sender`（打印验证码）、`crypto-code-generator`（`randomInt` 补齐 6 位）、
`sqlite-user-account-repository`（**users 表 DDL 与 INSERT/UPDATE 的唯一落点**）。

### 6. `presentation/`

`auth.controller.ts`（取输入 → 校验器 → 用例 → 信封；`#extractToken` 解析 `Authorization: Bearer`）、
`auth.routes.ts`（仅映射：`POST /send-code|/register|/login`、`GET|DELETE /session`）。

### 7. `compose.ts`（真装配）+ `main.ts`

```ts
export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  const userAccountRepository = new SqliteUserAccountRepository(deps.db)
  const passwordHasher = new BcryptPasswordHasher(deps.bcryptRounds)
  /* … 端口实现 → 用例（注入端口）→ 校验器 → 控制器 → 路由 … */
}
```
`main.ts` 开始收 `config`（`dbPath` / `bcryptRounds`），并 `openDatabase(config.dbPath)`。
`DB_PATH` 这类本机配置写在自己的 `.env` 里（`cp .env.example .env`），**不要提交**——数据库文件因你而异，仓库只留 `.env.example` 作为清单。

### 8. 测试

- 用例测试（4 个）：用 `tests/support/fakes.ts` 的替身（`InMemoryUserAccountStore` / `FakePasswordHasher` / `FakeMailSender` / `InMemoryCodeStore` …）；
- 仓储测试：`:memory:` 库往返；
- `tests/auth.e2e.test.ts`：**真实实现全链路**（send-code → register → login → session → logout）+ 失败面矩阵（400/401/409/423）。

---

## ✅ 验收点

```bash
cd solution/day05 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **20 个文件 / 80 个测试**全过 |
| 冒烟 | `npm start` 后：`curl -X POST localhost:3000/auth/send-code -H 'Content-Type: application/json' -d '{"email":"a@b.com"}'` → 控制台打印验证码；用该码 register → login 拿 token |
| 分层自查 | `grep -rn "bcrypt" src/modules/auth/{domain,application}` 无结果 |
| SQL 自查 | `grep -rn "SELECT\|INSERT" src/modules/auth/{domain,application,presentation}` 无结果 |
| 用例测试速度 | 全部 < 100ms（没有真 bcrypt / 真库） |

---

## 🚨 违规 → 症状

| 违规 | 症状 |
|------|------|
| 用例里 `import bcrypt` | 单测变慢（10 倍+）；换算法要改用例 |
| 用例里写 SQL | 「换 Postgres」从「新增一个文件」变成「全仓库改」；表结构改动牵动业务层 |
| 端口方法返回同步值（`UserRow \| null`） | 换异步实现（PG/远程）时签名全变 —— 契约级返工 |
| 判据（过期/不匹配）写在 `SqliteCodeStore` 里 | fake 存储行为与真存储不一致，用例测试通过但 e2e 红 |
| `Math.random()` 生成验证码/token | 可预测；「6 位数字暴力破解」从理论变成分钟级 |
| 用例直接 `new Date()` 判过期 | 测试写不动；CI 凌晨跑和白天跑结果不同 |
| 事件发布失败抛回注册用例 | 「注册成功但用户看到 500」；副作用把主流程拖垮 |

---

## 🔭 与真实仓库（NKDate）的对应

- 端口命名：真实仓库用 `XxxRepositoryPort` / `XxxServicePort`；`Promise` 形状一致；
- 真实仓库的 deps 契约同样 `z.custom<Port>()` 标注（不运行时校验对象内部）；
- 事件发布在真实仓库是 outbox（同事务写表 + worker 重放）；教程用内存总线 + 「失败不抛」，纪律相同、可靠性降级；
- `bcryptRounds` 从配置进（生产 10+，测试 4）—— 真实仓库同样按环境调。
