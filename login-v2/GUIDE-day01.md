# GUIDE-day01 — 目录骨架与组合根

预计时间：**90 分钟**（读概念 20 分钟 + 手打 55 分钟 + 验收 15 分钟）

> 本教程的每一天都以「你能自己打出同构的代码」为验收标准。
> 参考答案在 `solution/dayNN/`，**手打完再对照**，不要先看答案。

---

## 📖 概念：为什么第一天就要「骨架 + 组合根」

v1 的目录长这样：

```
login-v1/src/
├── application/      # 用例（但里面有 SQL）
├── domain/           # 实体（但 import 了 bcrypt）
├── infrastructure/   # 仓储
├── presentation/     # 路由（但里面有业务判断）
└── index.ts          # 端口、装配、启动全在这一个文件里
```

问题不在「层名写错了」，而在三条边界没有**物理隔离**：

1. 任何文件都能 import 任何文件 —— 依赖方向只靠自觉；
2. 装配散落在路由文件和 index.ts 里 —— 想换实现要翻全仓库；
3. 没有守卫 —— 三个月后没人知道哪条纪律是硬约束。

v2 的第一天不做业务，只立两样东西：**多模块的目录形状** 和 **唯一的组合根**。

```
login-v2/solution/day01/src/
├── config/index.ts          # 环境变量 → Config（唯一校验点）
├── main.ts                  # 组合根：装配一切 + HTTP 挂载
└── modules/
    ├── shared/              # 共享底座（端口 + 基础设施实现）
    │   ├── domain/
    │   │   ├── domain-event.ts
    │   │   └── ports/       # TimeProvider / IdGenerator / EventBus
    │   ├── infrastructure/  # SystemTimeProvider / CryptoIdGenerator / InMemoryEventBus
    │   └── index.ts         # 模块公开面（barrel）
    └── auth/                # 业务模块骨架
        ├── compose.ts       # createAuthModule() → { createRouter() }
        └── index.ts
```

两条从第一天就生效的纪律：

- **模块之间只许通过对方的 `index.ts` 说话**。`modules/auth` 永远不许 `import '../shared/infrastructure/xxx'`；
- **只有 `main.ts` 知道「谁是谁的实现」**。模块自己不许 `new` 别人的基础设施，依赖从构造函数进（Day 05 兑现）。

`shared` 的 `TimeProvider`：为什么时间也要是端口？因为「30 分钟后解锁」的测试不想真的等 30 分钟。
Day 03 起你会看到 `FakeTimeProvider.advance()` 一行代码完成时间旅行 —— 前提是实体**永不调 `Date.now()`**。

---

## ✍️ 手打目标

> 每个文件都要求：`@file` / `@author` 文件头 + 为什么这么做（不是「做了什么」）。

### 0. 工程配置（先跑通工具链）

| 文件 | 要点 |
|------|------|
| `package.json` | scripts：`test`=vitest run、`typecheck`=tsc --noEmit、`lint`=eslint src tests、`format:check`=prettier --check、`gate`=四件套串联；`type: commonjs`（ts-node 跑 main） |
| `tsconfig.json` | 12 条 strict：`strict`、`noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`、`noImplicitOverride`、`noFallthroughCasesInSwitch`、`allowUnreachableCode:false`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noPropertyAccessFromIndexSignature`、`isolatedModules`、`forceConsistentCasingInFileNames` |
| `eslint.config.mjs` | typescript-eslint recommended + `no-explicit-any: error` + `ban-ts-comment: error` + `max-params: ['error', 4]` + `no-unused-vars` 放行 `^_` 前缀 |
| `.prettierrc` | `{ semi:false, singleQuote:true, printWidth:120, trailingComma:"all" }` |
| `vitest.config.ts` | `minWorkers: 1, maxWorkers: 2`（教程机器内存小；真实项目按 CI 配置） |

### 1. `src/config/index.ts`

zod 校验环境变量，导出 `ConfigSchema` / `Config` / `loadConfig(env = process.env)`：

- `port`（`z.coerce.number()`，默认 3000）、`dbPath`（默认 `login-v2.db`）、`bcryptRounds`（4-15，默认 10）、`nodeEnv`；
- 非法值在**启动时**抛错（fail fast），而不是在深夜的某个请求里；
- 同时导出 `loadEnvFile()`：启动时若工作目录有 `.env` 就加载。**本机配置写 `.env`、永不提交，仓库只提交 `.env.example` 模板**——这个习惯从 Day 01 就开始养（配一份 `.env.example`，新环境 `cp .env.example .env` 即可跑）。

### 2. `src/modules/shared/domain/ports/`

```ts
// time-provider.port.ts —— 时间的唯一来源；禁止 Entity 里出现 Date.now()
export interface TimeProvider {
  /** 当前时间（Unix 毫秒） */
  now(): number
}
```
再写 `id-generator.port.ts`（`generate(): string`）和 `event-bus.port.ts`：

```ts
export type EventHandler = (event: DomainEvent) => void | Promise<void>
export interface EventBus {
  subscribe(eventName: string, handler: EventHandler): void
  publish(event: DomainEvent): Promise<void>
}
```

### 3. `src/modules/shared/domain/domain-event.ts`

```ts
export abstract class DomainEvent {
  readonly occurredAt: number
  constructor(occurredAt: number) { this.occurredAt = occurredAt }
}
```

### 4. `src/modules/shared/infrastructure/`

- `system-time-provider.ts`：`now() => Date.now()`（**全项目唯一**该出现 `Date.now()` 的角落之一）
- `crypto-id-generator.ts`：`randomBytes(16).toString('hex')`（对比 v1 的 `Math.random()`）
- `in-memory-event-bus.ts`：按 `event.constructor.name` 路由；关键实现细节：

```ts
async publish(event: DomainEvent): Promise<void> {
  const handlers = this.#handlers.get(event.constructor.name) ?? []
  // 先包成 Promise 再进 allSettled：订阅方**同步**抛错也会被兜住
  await Promise.allSettled(handlers.map((handler) => Promise.resolve().then(() => handler(event))))
}
```
> 自己动手写一遍「同步抛错的订阅者」测试，你会先掉进 `allSettled` 不接同步错误的坑 —— 这正是要手打的原因。

### 5. `src/modules/auth/compose.ts`（骨架）+ `index.ts`

```ts
export interface AuthModule { createRouter: () => Router }
export function createAuthModule(): AuthModule {
  // 骨架阶段没有端点：/auth 下暂时全是 404。Day 05 挂上真实路由。
  return { createRouter: () => Router() }
}
```
`index.ts` 只转发 `createAuthModule` 与 `AuthModule` 类型 —— **模块公开面从第一天就定形**。

### 6. `src/main.ts`（组合根）

```ts
export function createApp(): AppBundle {
  const auth = createAuthModule()          // ① 模块装配
  const app = express()                    // ② HTTP 装配
  app.use(express.json())
  app.get('/health', (_req, res) => { res.status(200).json({ status: 'ok' }) })
  app.use('/auth', auth.createRouter())
  return { app }
}
if (require.main === module) { /* 只有直接运行才 listen */ }
```
要点：`createApp` 单独导出给 e2e 测试复用（**测的装配 = 跑的装配**），`require.main === module` 保证被测试 import 时不占端口。

### 7. 测试（3 + 1 个文件）

- `src/config/index.test.ts`：默认值 / 非法值抛错 / 环境变量覆盖；
- `src/modules/shared/infrastructure/in-memory-event-bus.test.ts`：类名路由、订阅者抛错隔离、无订阅者不炸；
- `src/modules/shared/infrastructure/crypto-id-generator.test.ts`：16 字节 hex、不重复；
- `tests/health.e2e.test.ts`：supertest 打真 `createApp()`，200 + `{ status: 'ok' }`。

---

## ✅ 验收点

```bash
cd solution/day01
npm install
npm run gate          # prettier + tsc + eslint + vitest 四连
npm start             # 另开终端：curl localhost:3000/health → {"status":"ok"}
```

| 检查 | 期望 |
|------|------|
| `npm test` | **4 个文件 / 8 个测试**全过 |
| `npm run typecheck` | 0 error（12 条 strict 全开） |
| `npm run lint` | 0 error（含 `no-explicit-any`） |
| 目录结构 | `src/modules/{shared,auth}`，两个 `index.ts` 都是纯 barrel |
| 纪律自查 | `grep -rn "Date.now()" src` 只出现在 `system-time-provider.ts` |

---

## 🚨 违规 → 症状

| 违规 | 症状（怎么发现的） |
|------|--------------------|
| 模块内部件被外部 import（如 `main.ts` 直接 import `shared/infrastructure/system-time-provider`） | Day 06 的架构守卫测试直接红：`跨模块 import 必须命中 index.ts` |
| `main.ts` 里写业务判断 | `createApp` 越来越长、e2e 和生产的装配开始分叉（「测的装配 ≠ 跑的装配」是老 bug 温床） |
| 实体里 `Date.now()` | Day 03 的「锁定到期」测试只能 `sleep`；CI 上偶发失败（时间竞态） |
| 没有 `index.ts` barrel，全项目按相对路径互 import | 移动一个文件要改 20 处 import；模块边界无从谈起 |
| `any` 逃逸（`as any`、`@ts-ignore`） | eslint 直接 error；类型系统失去意义，重构靠运气 |

---

## 🔭 与真实仓库（NKDate）的对应

- 真实仓库模块更多（`users` / `orders` / …），**每个模块同样只有一个 `index.ts` 公开面**；`shared` 在真实仓库拆成多个入口（`@shared/ports`、`@shared/infrastructure`），教程为少一层心智负担合成一个；
- 组合根在真实仓库里就是 `src/main.ts` + 各模块 `compose.ts`，和你今天打的结构同形；
- `TimeProvider` 不是教学道具：真实仓库里所有「过期/锁定/TTL」判定都走注入的时钟，测试从不需要等真实时间。
