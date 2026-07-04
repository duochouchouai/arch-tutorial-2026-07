# Day 04 延伸思考

## 1. 如果要把锁定阈值从 5 次改成 3 次，改哪个文件？

只改 **`login-user.ts`** 第 41 行一个数字：

```typescript
if (attempts >= 5)   →   if (attempts >= 3)
```

## 2. 如果要把锁定时间从 30 分钟改成 1 小时，改哪个文件？

只改 **`login-user.ts`** 第 42 行一个数字：

```typescript
Date.now() + 30 * 60 * 1000   →   Date.now() + 60 * 60 * 1000
```

> **核心价值：业务策略集中在 use case 层，改一个数字全局生效。**

---

## 3. 如果要对不同用户设置不同的锁定阈值（普通用户 5 次、VIP 用户 10 次），需要改什么？

改动涉及 3 层：

**`domain/user.ts`** — User 实体加角色
```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'vip';
}
```

**`infrastructure/`** — 建表加 `role` 列，仓库查询返回 role。

**`application/login-user.ts`** — 阈值按角色决策
```typescript
const threshold = user.role === 'vip' ? 10 : 5;
if (attempts >= threshold) {
  // 锁定
}
```

> **阈值定义在 use case 而不是 domain**：User 实体只需知道"我是 VIP"，不需要知道"VIP 可以多错几次"。这是业务策略，不是实体属性。

---

## 4. v1 的 setTimeout 解锁如果进程重启会怎样？v2 的数据库方案呢？

| 场景 | v1（setTimeout + 内存） | v2（全数据库） |
|------|------------------------|----------------|
| 锁定期间重启服务 | 内存计数器丢失，数据库锁还在 → **状态不一致** | 数据库锁还在，重启后继续生效 → **一致** |
| 锁过期后重启 | 无影响（内存已清） | 无影响（查询时判断过期） |
| 水平扩展多实例 | 每台实例计数器独立 → **用户锁不同步** | 共享数据库 → 状态统一 |

> **单一数据源是分布式系统里最难的事，v2 从第一天就做对了。**

---

## 5. 如果要改成递进式锁定——解锁后仍然输错，锁定时间按规律递增（如 5→15→30→60 分钟）——怎么改？

需要把锁定策略从「固定参数」升级为「状态机」。改动波及 4 层（依赖倒置，domain 接口先行）：

### Step 1 — `domain/user-repository.ts`（接口先行）
```typescript
export interface LockStatus {
    failedAttempts: number;
    lockedUntil: string | null;
    lockCount: number;  // ← 新增
}
```
use case 只知道 `LockStatus` 接口，不关心数据库列名。这一步不做，后面的代码没类型支撑。

### Step 2 — `database.ts`（加列）
```sql
lock_count INTEGER NOT NULL DEFAULT 0
```

### Step 3 — `infrastructure/user-repository-sqlite.ts`（实现接口）
- `getLockStatus` 查询结果映射 `lock_count` → `lockCount`
- `lockAccount`：`UPDATE users SET locked_until = ?, lock_count = lock_count + 1`
- `resetLockStatus`：`UPDATE users SET failed_attempts = 0, locked_until = NULL, lock_count = 0`

### Step 4 — `application/login-user.ts`（使用接口）
```typescript
const durations = [5, 15, 30, 60];
const level = Math.min(lockStatus.lockCount, durations.length - 1);
const lockedUntil = Date.now() + durations[level] * 60 * 1000;
```

### 关键设计点

- **锁的级别存数据库，不存内存** — 否则服务重启就丢，重蹈 v1 的 setTimeout 覆辙
- **登录成功后 resetLockStatus 把 lock_count 一起清零** — 恢复正常后递进级别从头开始
- **durations 数组留在 use case 里** — 递进策略是业务规则，不是基础设施

---

## 6. lockAccount 只设 locked_until，不设 failed_attempts。如果改为在 lockAccount 里同时重置 failed_attempts = 0，有什么好处？

如果在 `lockAccount` 里一起重置 `failed_attempts = 0`，可以保证**锁定时计数器的语义一致性**——"已经锁了，就不需要再记住输错了几次"。而且如果以后有其他入口调用 `lockAccount`（比如管理员手动锁），计数器也会自动归零。

> **接口设计要自洽：一个操作应该把相关状态一起处理，不让调用方操心。**

---

## 7. 登录成功时 resetLockStatus 把 failed_attempts 和 locked_until 一起重置。如果用户从未输错过密码，这行 SQL 也会执行。是浪费还是合理？

每次登录成功都执行一次 `UPDATE ... SET failed_attempts = 0, locked_until = NULL`。对于从未输错的用户，这确实是"无意义的更新"。但：

- **成本极低** — 一个 UPDATE 语句，SQLite 毫秒级
- **逻辑简单** — 不需要加 `if (lockStatus.failedAttempts > 0)` 判断
- **更安全** — 即使有脏数据（比如 failed_attempts 莫名变成 -1），也能自动修正

> **有时候，多执行一条无害的 SQL 比多加一层 if 判断更可靠。不要过早优化。**

---

## 总结

Day 04 的核心学习点：

1. **单一数据源** — 锁定状态全在数据库，没有内存状态
2. **过期判断在查询时** — 不依赖定时任务清理
3. **接口自洽** — 一个方法应处理完相关状态
4. **别过早优化** — 多跑一条 SQL 比多加分支判断更清晰
5. **业务策略集中** — 改锁定时长、次数、策略只动 use case
