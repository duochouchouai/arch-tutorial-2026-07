# GUIDE-day03 — 领域实体：行为与字段的归属

预计时间：**120 分钟**（概念 25 + 手打 70 + 验收 25）

> 手打完再对照 `solution/day03/`。

---

## 📖 概念

### 1. 实体不是「带类型的 JSON」

v1 的 `domain/user.ts`：

```ts
export interface User {                 // v1：一堆公开字段
  id: number
  username: string
  failedAttempts: number
  lockedUntil: string | null
}
```
「锁定」这件事在 v1 里以「谁都能改字段」的形式散布在用例中：

```ts
// v1 application/login-user.ts 里的片段
user.failedAttempts += 1
if (user.failedAttempts >= 5) {
  user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()
}
await repo.save(user)
```

问题：锁定规则能被任何文件绕过；`Date.now()` 出现处无法测；改一次规则要全仓库找。

### 2. 实体 = 数据 + 行为（规则跟着数据走）

```ts
export class UserEntity {
  readonly id: string
  readonly username: string
  readonly #now: TimeProvider          // 时间从构造进
  #failedAttempts: number
  #lockedUntil: number | null
  // ...

  recordFailedLogin(): void { /* 锁定规则在这里，别处不可绕过 */ }
  recordLogin(): void { /* 清零规则在这里 */ }
  isLockedAt(time: number): boolean { /* 判据：传入的时刻 */ }
  toRow(): UserRow { /* 实体 → 表行（跨模块/持久化桥） */ }
  toSnapshot(): PublicUser { /* 实体 → 对外形状（白名单） */ }
}
```

四条纪律：

1. **`#private` 状态**：外部只能 `getter` 读、业务方法改。`user.failedAttempts = 0` 在类型层面就不存在；
2. **永不 `Date.now()`**：时间从构造注入的 `TimeProvider` 取。所有「过期/锁定」判据都接受显式时间参数（`isLockedAt(time)`）；
3. **构造即合法**：`private constructor` + 两个静态工厂 `fromData(row, now)`（从 DB 行恢复）与 `createEmailUser(input, now)`（新账号）；
4. **桥接方法显式化**：`toRow()` / `fromData()` / `toSnapshot()` 是三个方向的边界翻译 —— 边界写在代码里，而不是靠 `JSON.parse` 随手来。

### 3. 「行形状」为什么是 Schema（SSOT）

账号在存储里的样子由 `UserRowSchema` 唯一定义（zod），类型由 `z.infer` 出：

```ts
export const UserRowSchema = z.object({
  id: z.string(), username: z.string(), email: z.string(),
  phone: z.string().nullable(), passwordHash: z.string(),
  failedAttempts: z.number().int(), lockedUntil: z.number().int().nullable(),
  lastLoginAt: z.number().int().nullable(),
  createdAt: z.number().int(), updatedAt: z.number().int(),
})
export type UserRow = z.infer<typeof UserRowSchema>
```

规则：**全项目不许再手写 interface/type 重述这个形状**。
（`lockCount` 是 Day 07 才加进来的 —— 届时你会体验到「Schema 是唯一真理源」的好处：改一行，所有用法当场类型报错。）

### 4. 对外形状是白名单

`PublicUser`（`{ id, username, email, phone }`）只包含允许出现在响应里的字段 ——
**不是**「实体减掉几个字段」，而是独立定义的一份契约。`passwordHash` / `failedAttempts` 永远不出来。

---

## ✍️ 手打目标

### 1. `src/modules/auth/domain/constants.ts`

```ts
export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_DURATION_MS = 30 * 60 * 1000
```
（Day 07 会把它升级成递进式阶梯；先让业务数字只有一处。）

### 2. `src/modules/auth/domain/schemas/user.ts` + `api/user.ts`

`UserRowSchema`（行形状，含 `passwordHash` 等内部字段）+ `PublicUserSchema`（对外形状）；
`schemas/index.ts` 是 barrel。

### 3. `src/modules/auth/domain/entities/user.entity.ts`

按上面四条纪律实现。几个手打时的关键判断：

- **`failedAttempts` 何时清零**：`recordLogin()` 里清；`recordFailedLogin()` 里累加，达到 5 就写 `lockedUntil`；
- **`isLockedAt(time)` 而不是 `isLocked()`**：判据来自调用方传入的时刻（用例用同一个 `now` 判全部），避免「构造时取一次时间、判断时又取一次」的撕裂；
- **`toRow()` 不要漏字段**：写完第一件事是写「往返测试」（`fromData(toRow()) → toRow()` 深比较相等）。

### 4. `tests/support/fakes.ts`（从今天起有测试替身）

```ts
export class FakeTimeProvider implements TimeProvider {
  #nowMs: number
  constructor(startMs = 1_700_000_000_000) { this.#nowMs = startMs }
  now() { return this.#nowMs }
  advance(ms: number) { this.#nowMs += ms }   // 时间旅行
}
```

### 5. 实体测试（`user.entity.test.ts`）

必测：
1. `createEmailUser` 初始状态 + 时间戳来自注入时钟；
2. `recordLogin` 清零 + `lastLoginAt`；
3. 第 5 次失败 → `lockedUntil = now + LOCK_DURATION_MS`；
4. `isLockedAt` 边界：`lockedUntil - 1` 为 true、`lockedUntil` 为 false；
5. `fromData` / `toRow` 往返不丢字段；
6. `toSnapshot` 的键只有 `['email','id','phone','username']`（**断言键集合**，防止未来不小心加字段泄密）。

---

## ✅ 验收点

```bash
cd solution/day03 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **10 个文件 / 43 个测试**全过 |
| 时间旅行 | 锁定用例里**没有** `sleep`，只有 `time.advance(...)` |
| `grep -rn "Date.now()" src/modules/auth` | 无结果（auth 侧完全用注入时钟） |
| 不可变自查 | 尝试 `user.failedAttempts = 0` 应编译失败 |

---

## 🚨 违规 → 症状

| 违规 | 症状 |
|------|------|
| 实体字段 `public`（没有 `#`） | 用例里出现 `user.lockedUntil = ...`；规则从实体漏进用例，两处规则开始漂移 |
| 实体里 `Date.now()` | 测试要 `await sleep(50)`；CI 偶发红；跨时区/夏令时出错 |
| 手写 `interface UserRow` 与 Schema 并存 | Day 07 加 `lockCount` 时只改了一处，另一处静默不一致，运行时才炸 |
| `toSnapshot()` 返回 `this`（直接吐实体） | 响应里出现 `passwordHash`；测试若只断言个别字段则发现不了 —— 所以要断言键集合 |
| 用 `as` 把 DB 行断言成 `UserRow` | 列名写错/数据库升级后字段缺失都不会报错，直到线上出现 `undefined` |

---

## 🔭 与真实仓库（NKDate）的对应

- 真实仓库实体同样 `#private` + 业务方法 + `toRow/fromData/toSnapshot` 三桥；行为（改密码、记登录）在实体，行形状在领域 Schema；
- 时间一律 `TimeProvider`：真实仓库里 TTL、过期、重试退避全部可注入可测；
- 一个额外细节：真实仓库的 `toRow()` 有时叫 `toPersistence()`（按持久化目标命名）—— 命名不同，纪律相同。
