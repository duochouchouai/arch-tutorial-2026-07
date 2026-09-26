# GUIDE-day06 — 多模块协作与架构守卫

预计时间：**150 分钟**（概念 30 + 手打 90 + 验收 30）

> 手打完再对照 `solution/day06/`（本教程的「终态」基线：Day 07 从它派生）。

---

## 📖 概念

### 1. 为什么要把 users 抽成独立模块

Day 05 结束时，auth 模块里躺着三样不属于「认证」的东西：

```
auth/domain/schemas/user.ts                     ← users 表的行形状
auth/domain/ports/user-account-repository.port.ts
auth/infrastructure/sqlite-user-account-repository.ts   ← users 表 DDL + SQL
```

「账号」是**另一个领域**：将来会有「改昵称 / 换头像 / 会员等级」等与登录无关的用例。
更现实的问题：一个表被两个领域读写时，DDL 与 SQL 会各写一份，慢慢漂移。

### 2. 抽模块的边界怎么划

```
modules/users/
├── domain/
│   ├── ports/
│   │   ├── user-account-repository.port.ts   # 模块**内部**持久化契约
│   │   └── user-account.public.port.ts       # 模块**对外**契约（供 auth 消费）
│   └── schemas/user.ts                       # 行形状（SSOT）
├── application/user-account.public.service.ts # 契约的持有者是应用服务，不是仓储
├── infrastructure/sqlite-user-account-repository.ts # 表 DDL + SQL 唯一落点
├── compose.ts                                 # createUsersModule({ db }) → { account }
└── index.ts                                   # 只发布：组合根 + 公共端口 + 行形状
```

三条要点：

1. **公共端口 ≠ 内部端口**：内部端口可自由增删方法；公共端口是契约，改它要走「先加后发」；
2. **薄转发层**：`UserAccountPublicService` 一行没干，但它是「契约持有者」—— 仓储随时可换，消费者不受影响；将来的审计/缓存/事务有唯一落点；
3. **表归属**：`INSERT INTO users` / `UPDATE users` / `CREATE TABLE users` 全项目只许出现在 `users/infrastructure/`。

### 3. 跨模块的三条纪律

```ts
// ✓ 唯一允许的跨模块写法：走对方 index.ts
import { createUsersModule, type UserAccountPublicPort } from '../users/index'
import type { TimeProvider } from '../shared/index'

// ✗ 一律禁止
import { SqliteUserAccountRepository } from '../users/infrastructure/sqlite-user-account-repository'
```

组合根负责把「别人的实现」接进来：

```ts
// main.ts：装配顺序 = 依赖顺序
const users = createUsersModule({ db })
const auth = createAuthModule({ db, userAccount: users.account, timeProvider, idGenerator, eventBus, bcryptRounds })
```

### 4. 架构守卫：让纪律可执行

`tests/architecture.test.ts` 用三个规则把「口头约定」变成「CI 红灯」：

| 规则 | 检查方式 |
|---|---|
| ① 跨模块 import 必须命中对方 `index.ts` | 扫描源码里所有 `modules/<x>/...` 相对 import，解析后路径必须落在 `modules/<x>/index.ts` |
| ② `domain/` 不许 import 基础设施与 npm 包 | `domain/**` 的 import 只许相对路径 + 白名单（`domain/schemas/`、`domain/validators/`、`domain/events/` 放行 `zod`） |
| ③ `INSERT INTO users` / `UPDATE users` / `CREATE TABLE users` 只许在 `users/infrastructure/` | 全文正则扫描 |

> 守卫测试自己也要有 sanity check（如「扫到的文件数 > 30」），否则正则写错、扫了个空目录也会「全绿」。

### 5. 事件：模块间的最低耦合协作

auth 发 `UserRegisteredEvent`（Day 07 的 notifications 订阅它），
订阅方**只 import auth 的公共面**拿事件类型，auth 对订阅方一无所知。

---

## ✍️ 手打目标

### 1. 新建 `modules/users/`（从 auth 搬 3 个文件）

- 搬 `schemas/user.ts` → `users/domain/schemas/user.ts`（改文件头注释：说明表归属与形状纪律）；
- 拆端口：内部 `UserAccountRepositoryPort`（可自由演进）+ 公共 `UserAccountPublicPort`（契约）；
- 搬仓储实现；**`users/index.ts` 只发布**：`createUsersModule` / `UsersModule` / `UserAccountPublicPort` / `UserRowSchema` / `UserRow`。

### 2. `users/application/user-account.public.service.ts`

四个方法逐个转发到仓储端口。文件头写清「为什么要有这层空转发」（见概念 §2）。

### 3. auth 侧改造

- `auth/index.ts` 不再对外发布用户形状相关的东西（已经不需要）；
- deps 契约：`userAccountRepository: z.custom<UserAccountRepositoryPort>()` → `userAccount: z.custom<UserAccountPublicPort>()`；
- 实体 `import type { UserRow } from '../../../users/index'`（**仍然走公共面**）；
- compose 收 `userAccount`（由 main 传入），不再自己 `new` 仓储；
- `main.ts` 按依赖顺序装配（users 在前）。

### 4. `tests/architecture.test.ts`

手打三个规则时注意：
- 用 `fs.readdirSync(..., { recursive: true })` 或自写递归收集 `.ts`；
- import 解析只看**相对路径**（`./`、`../`），npm 包按名字判定；
- 每条规则给「反例说明」注释（这支测试的价值一半在失败信息里）。

### 5. 全量测试 + 守卫自测

改完跑 `npm test`：既有 82 个测试应全部继续通过（**纯重构**：行为零变化）。
再故意违规一次（例如在 `auth/domain/` 里 `import { z } from 'zod'` 之外的 npm 包，或在别处写一句 `INSERT INTO users`），确认守卫测试**真的会红**。

---

## ✅ 验收点

```bash
cd solution/day06 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **22 个文件 / 85 个测试**全过（含守卫） |
| 守卫自测 | 临时加一句违规代码 → 守卫测试红；删掉 → 恢复绿 |
| 跨模块 import | `grep -rn "modules/users/" src/modules/auth` 的结果全部以 `modules/users/index` 结尾 |
| 表归属 | `grep -rn "INTO users\|CREATE TABLE users" src` 只命中 `users/infrastructure/` |
| 依赖方向 | `grep -rn "modules/auth" src/modules/users` 无结果（users 不知道 auth 存在） |

---

## 🚨 违规 → 症状

| 违规 | 症状 |
|------|------|
| auth 直接 `import` users 的仓储实现 | users 想改 SQL/换库时，auth 跟着编译失败 —— 「契约」形同虚设；守卫规则 ① 红 |
| 在 auth 里给 users 表写 SQL（如「注册时顺便 UPDATE users」） | 两处 DDL/两套列名口径；users 模块加字段时 auth 静默不生效；守卫规则 ③ 红 |
| `domain/` 里 import 第三方库（如 `lodash`、`bcryptjs`） | 领域层不可移植（换运行时即崩）、单测需要装全量依赖；守卫规则 ② 红 |
| 公共端口既有内部方法又有对外方法（合成一个大端口） | 消费者能用的面比需要的宽 → 破坏性改动概率上升；「窄口」失效 |
| 守卫测试没有 sanity check（文件数下限） | 守卫自己「静默失效」：路径改错后它扫到 0 个文件，永远绿 |

---

## 🔭 与真实仓库（NKDate）的对应

- 真实仓库每模块 `index.ts` 即公开面；**窄口原则**体现在「同一提供方按消费者切多个端口」（本教程只有一个消费者 auth，故合成一个端口 + 注释标明动机）；
- `UserAccountPublicService` 这种「薄应用服务」在真实仓库里还会承载审计、缓存、事务；
- 架构守卫在真实仓库是 ESLint 的 `no-restricted-imports` + 自定义脚本双保险：**规则写进 CI，而不是写进文档**。
