# 依赖图与 import 规则（login-v2 Day 07 终态）

## 1. 顶层装配

```
                        main.ts（组合根：唯一知道「谁是谁的实现」）
                          │
        ┌─────────────────┼──────────────────┬───────────────────┐
        ▼                 ▼                  ▼                   ▼
   modules/shared    modules/users      modules/auth      modules/notifications
   （端口+实现）      （表+仓储）        （认证用例）        （订阅事件）
                          │                  │                   │
                          │   UserAccountPublicPort ◄────────────┘（auth 注入）
                          └──────────┐       │
                                     ▼       ▼
                              事件总线：auth 发布 UserRegisteredEvent
                                        notifications 订阅（方向：notifications → auth）
```

装配顺序（`main.ts`）：

```ts
const db = openDatabase(config.dbPath)
const timeProvider = new SystemTimeProvider()
const idGenerator = new CryptoIdGenerator()
const eventBus = new InMemoryEventBus()

const users = createUsersModule({ db, databaseUrl: config.databaseUrl })
const auth = createAuthModule({ db, userAccount: users.account, timeProvider, idGenerator, eventBus, bcryptRounds })
createNotificationsModule({ eventBus })     // 装配即订阅
```

## 2. 模块内部分层

```
modules/<name>/
├── domain/          ← 零 npm 依赖（zod 仅限 schemas/ validators/ events/）
│   ├── value-objects/   （值对象）
│   ├── entities/        （实体）
│   ├── schemas/         （SSOT：api / validator / deps / 行形状）
│   ├── validators/      （业务规则 + 值对象构造）
│   ├── services/        （领域服务：跨实体判据）
│   ├── ports/           （出站契约 + 公共端口）
│   ├── errors/          （模块专属错误）
│   └── events/          （领域事件）
├── application/     ← 用例 + 应用服务（只依赖 domain + 端口）
├── infrastructure/  ← 端口实现（SQLite / bcrypt / 邮件 / pg）
├── presentation/    ← controller + routes（HTTP 适配）
├── compose.ts       ← createXxxModule(deps)
└── index.ts         ← 公开面（barrel）
```

依赖方向：

```
presentation ──► application ──► domain ◄── infrastructure
                                    ▲
                              （端口由 domain 定义，infrastructure 实现）
```

## 3. import 规则矩阵

| 从 ↓ / 到 → | 同模块 domain | 同模块 application | 同模块 infrastructure | 同模块 presentation | 别的模块 | 别的模块内部件 | npm 包 |
|---|---|---|---|---|---|---|---|
| `domain` | ✓ | ✗ | ✗ | ✗ | ✓（仅 `index`） | ✗ | 仅 zod（schemas/validators/events） |
| `application` | ✓ | ✓ | ✗ | ✗ | ✓（仅 `index`） | ✗ | ✗（经端口） |
| `infrastructure` | ✓ | ✗ | ✓ | ✗ | ✓（仅 `index`） | ✗ | ✓（驱动/库） |
| `presentation` | ✓ | ✓ | ✗ | ✓ | ✓（仅 `index`） | ✗ | ✓（express） |
| `compose.ts` | ✓ | ✓ | ✓ | ✓ | ✓（仅 `index`） | ✗ | ✓ |
| `main.ts` | ✗ | ✗ | ✗ | ✗ | ✓（仅 `index` + `config`） | ✗ | ✓ |

三条硬规则由 `tests/architecture.test.ts` 守卫：

1. 跨模块 import 必须解析到对方 `index.ts`（守卫规则 ①）；
2. `domain/**` 的 import 只能是相对路径 + zod 白名单（守卫规则 ②）；
3. `INSERT INTO users` / `UPDATE users` / `CREATE TABLE users` 只在 `users/infrastructure/`（守卫规则 ③）。

## 4. 请求数据流（以登录为例）

```
HTTP POST /auth/login
  │
  ▼ presentation: AuthController.login
  │   ① LoginValidator.validate(body)
  │        ├─ parseOrThrow(LoginSchema)     形状（schemas/api）
  │        ├─ Password.create（宽松档）      业务规则（validators + 值对象）
  │   → ValidatedLogin { username, password: Password }
  │
  ▼ application: LoginUseCase.execute
  │   ② userAccount.findByUsername（跨模块公共端口 → users 应用服务 → 仓储）
  │   ③ UserEntity.fromData(row, timeProvider)
  │   ④ isLockedAt(now) → BcryptPasswordHasher.verify（端口）
  │   ⑤ recordFailedLogin() / recordLogin()（实体业务方法，含递进锁定档位）
  │   ⑥ userAccount.update(user.toRow())
  │   ⑦ idGenerator.generate() → sessionStore.save(token, userId, now + 30d)
  │   → { token, user: user.toSnapshot() }
  │
  ▼ presentation: ok(result) → 200 { success:true, data:{ token, user } }
  │
  └─ 任何环节抛 AppError → errorHandler → { success:false, message, fieldErrors? }（按 statusCode）
```

## 5. 跨模块协作的三种合法姿势

| 姿势 | 例子 | 契约 |
|---|---|---|
| 注入公共端口（同步调用） | auth → users：查账号、写账号 | `UserAccountPublicPort` |
| 注入共享端口（同步调用） | 所有模块 → shared：时钟、id、总线 | `TimeProvider` / `IdGenerator` / `EventBus` |
| 事件（异步、单向） | auth → notifications：注册事件 | `UserRegisteredEvent`（类型从 auth 的 `index` 出） |

非法姿势：直接 import 对方内部件、直接读写对方表、把对方的实现 `new` 在自己模块里。
