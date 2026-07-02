# GUIDE-day04 — 账户锁定防爆破

预计时间：**35 分钟**

---

## 📖 今天做什么

在 day03 的基础上给登录接口增加防爆破机制：连续输错密码 5 次，账户锁定 30 分钟。

对比 v1 day05 的做法——v1 用了一个全局内存对象 `loginAttempts` + `setTimeout` + 数据库 `locked_until` 三条线各自为政。今天 v2 所有状态统一存在数据库，没有内存状态，没有 `setTimeout`。

---

## 🗑️ v1 回顾：Day 05 的问题

| 问题 | v1 写法 | 后果 |
|------|---------|------|
| ❌ 两套状态不同步 | `loginAttempts[username]`（内存）+ `users.locked_until`（数据库） | 进程重启后内存清零但数据库仍锁定 |
| ❌ `setTimeout` 解锁 | `setTimeout(() => loginAttempts[username] = 0, 30 * 60 * 1000)` | 进程挂了 `setTimeout` 就没了 |
| ❌ 锁定逻辑耦合在 handler 里 | login handler 里插了 3 段锁定代码 | 改密码逻辑时容易误伤锁定逻辑 |
| ❌ 只锁用户名不锁 IP | 攻击者换一批用户名继续试 | 防爆破形同虚设 |

今天 v2：
- **全部放数据库**：`failed_attempts` + `locked_until`，进程重启不影响
- **没有 `setTimeout`**：过期判断在 SQL 层（`WHERE locked_until > now`）
- **锁定逻辑在 use case**：和路由、校验、数据库实现完全解耦

---

## 🎯 架构变化

```
day03 → day04 改动分布：

src/
├── domain/
│   └── user-repository.ts               ← ＋LockStatus 类型 + 4 个方法
├── application/
│   └── login-user.ts                    ← 改：加锁定检查 + 失败计数逻辑
├── infrastructure/
│   ├── database.ts                      ← users 表 ＋2 列
│   └── user-repository-sqlite.ts        ← ＋4 个方法
├── presentation/                        ← 无变化
└── index.ts                             ← 无变化
```

**只改了 4 个文件，presentation 和 index 完全不动。** 这就是「内层变化对外层透明」——改的是业务逻辑和数据存储，API 接口不换。

---

## ✍️ 今天要改的文件

### Step 1 — domain/user-repository.ts（加 LockStatus 类型 + 4 个方法）

在 `UserRepository` 之前，先加一个 `LockStatus` 类型：

```typescript
export interface LockStatus {
  failedAttempts: number;
  lockedUntil: string | null;
}
```

然后在 `UserRepository` 接口最后加入 4 个方法：

```typescript
export interface UserRepository {
  // ...前面所有已有的方法不变...

  // 登录限制（防爆破）
  getLockStatus(userId: number): Promise<LockStatus>;
  incrementFailedAttempts(userId: number): Promise<number>;
  resetLockStatus(userId: number): Promise<void>;
  lockAccount(userId: number, lockedUntil: string): Promise<void>;
}
```

**📝 为什么 4 个方法而不是 2 个？**

| 操作 | SQL | 职责 |
|------|-----|------|
| `getLockStatus` | `SELECT failed_attempts, locked_until` | 读取当前状态 |
| `incrementFailedAttempts` | `UPDATE SET failed_attempts + 1` | 失败时计数 |
| `resetLockStatus` | `UPDATE SET ... = 0, NULL` | 成功时归零 |
| `lockAccount` | `UPDATE SET locked_until = ?` | 达到阈值时锁定 |

每个方法对应**一种业务行为**，而不是对应 SQL 语句。这叫「面向业务设计接口」，而不是「面向数据库设计接口」。

---

### Step 2 — infrastructure/database.ts（users 表加 2 列）

```sql
CREATE TABLE IF NOT EXISTS users (
  ...其他列不变...
  failed_attempts INTEGER NOT NULL DEFAULT 0,   ← 新增
  locked_until TEXT                               ← 新增
)
```

`failed_attempts` 是数字、`locked_until` 是 ISO 时间字符串。两个字段配合使用，不需要额外的表。

---

### Step 3 — infrastructure/user-repository-sqlite.ts（实现 4 个方法）

在 `deleteRememberToken` 之前插入：

```typescript
async getLockStatus(userId: number): Promise<LockStatus> {
  const db = getDatabase();
  const row = db.prepare(
    'SELECT failed_attempts, locked_until FROM users WHERE id = ?',
  ).get(userId) as { failed_attempts: number; locked_until: string | null } | undefined;
  return row
    ? { failedAttempts: row.failed_attempts, lockedUntil: row.locked_until }
    : { failedAttempts: 0, lockedUntil: null };
}

async incrementFailedAttempts(userId: number): Promise<number> {
  const db = getDatabase();
  db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?').run(userId);
  const row = db.prepare('SELECT failed_attempts FROM users WHERE id = ?').get(userId) as { failed_attempts: number };
  return row.failed_attempts;
}

async resetLockStatus(userId: number): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(userId);
}

async lockAccount(userId: number, lockedUntil: string): Promise<void> {
  const db = getDatabase();
  db.prepare('UPDATE users SET locked_until = ? WHERE id = ?').run(lockedUntil, userId);
}
```

以及别忘了在 import 里加上 `LockStatus`：

```typescript
import { CreateUserInput, LockStatus, UserRepository, UserWithPassword } from '../domain/user-repository';
```

**📝 `incrementFailedAttempts` 为什么是两步（UPDATE + SELECT）而不是一步回传？**

因为 `node:sqlite` 的 `run()` 不返回更新后的值。两步操作虽然多了个查询，但保证了读到的值是最新的。更好的做法是用 `RETURNING` 子句——但 SQLite 版本支持不一，为了可移植性，两步操作更稳妥。

---

### Step 4 — application/login-user.ts（加锁定逻辑）

`execute` 方法需要改，核心变化是登录流程从 4 步变成 6 步：

```
改动前：        改动后：
1. 查找用户     1. 查找用户
               2. 检查锁定状态 ← 新增
               3. 自动清除过期锁定 ← 新增
2. 验证密码     4. 验证密码
   → 失败: 抛   → 失败: 计数 + 达阈值锁定 ← 改
3. 返回用户     5. 重置锁定状态 ← 新增
4. 记住我       6. 返回用户 + 记住我
```

具体改动，找到 `execute` 方法，在**查找用户之后、验证密码之前**插入：

```typescript
// 2. 检查账户是否锁定
const lockStatus = await this.userRepository.getLockStatus(user.id);
if (lockStatus.lockedUntil && new Date(lockStatus.lockedUntil) > new Date()) {
  throw new UnauthorizedError('账户已锁定，请30分钟后再试');
}
if (lockStatus.lockedUntil) {
  // 锁定已过期，自动清除
  await this.userRepository.resetLockStatus(user.id);
}
```

然后将原来的「密码验证失败」部分改为：

```typescript
// 3. 验证密码
const isValid = await bcrypt.compare(input.password, user.hashedPassword);
if (!isValid) {
  const attempts = await this.userRepository.incrementFailedAttempts(user.id);
  if (attempts >= 5) {
    const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await this.userRepository.lockAccount(user.id, lockedUntil);
    throw new UnauthorizedError('登录失败次数过多，账户已锁定30分钟');
  }
  throw new UnauthorizedError('用户名或密码错误');
}

// 4. 登录成功，重置锁定状态
await this.userRepository.resetLockStatus(user.id);
```

**📝 关键设计：**

**为什么不在第 5 次失败时立即清除 `failed_attempts`？**

不需要。`lockAccount` 只是设置了 `locked_until`，`failed_attempts` 仍然保留（`UPDATE ... SET locked_until = ? WHERE id = ?`，没有改 `failed_attempts`）。这样做的好处是——如果管理员想查「这个用户被锁了几次」，数据还在。

**`resetLockStatus` 做了什么？**

`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`

一旦用户登录成功，失败计数和锁定状态全部清空。这个用户下次再输错，从 0 开始计数。

---

### 没有 Step 5 和 Step 6

你没看错——**presentation/auth-controller.ts 和 src/index.ts 不需要改。**

因为：
- Controller：`POST /login` 接口没变，参数没变，只是新增了一种 `UnauthorizedError` 的响应。异常已经在 `handleError` 里统一处理了。
- Index：`LoginUserUseCase` 的构造函数签名没变，不需要重新注册。

**这就是内层改动对外层透明。** 你在 application 层改了业务逻辑，presentation 层的 API 完全不需要变。

---

## ✅ 验证

```bash
rm login-v2.db
npm start

# 1. 注册
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"alice@example.com"}'
# → {"success":true,"data":{"id":1,...}}

# 2. 连续 5 次输错密码
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"alice","password":"wrong"}' && echo ""
done
# 第 1-4 次：{"success":false,"message":"用户名或密码错误"}
# 第 5 次：  {"success":false,"message":"登录失败次数过多，账户已锁定30分钟"}

# 3. 锁定后即使密码正确也不行
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# → {"success":false,"message":"账户已锁定，请30分钟后再试"}

# 4. 其他用户不受影响
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"123456","email":"bob@example.com"}'
# → 正常注册

# 5. 之前功能仍然可用
curl -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com"}'
# → 正常发送重置链接
```

---

## 💡 今天学到了什么

### 对比 v1 day05 的同一功能

| 对比项 | v1（屎山） | v2（清洁架构） |
|--------|-----------|--------------|
| 状态存储 | 内存 `loginAttempts` + 数据库 `locked_until` | 全部在数据库 |
| 解锁机制 | `setTimeout`（不可靠） | SQL 过期比较（可靠） |
| 失败计数 | 散落在 handler 末尾 | 在 use case 中集中编排 |
| 锁定逻辑位置 | 和业务代码耦合 | 独立在 use case 里 |
| 代码改动涉及 | main.js 一处 | domain + application + infrastructure 三层各司其职 |

### 可预测的改动模式

回顾 day02 → day04 的每一次改动，模式都是一样的：

```
新功能需求
  → domain（加接口方法签名）
  → infrastructure（实现接口）
  → application（加 use case 或改现有用例）
  → presentation（加路由或改 schema）— 不一定每次都改
  → index（注册新用例）— 不一定每次都改
```

**清洁架构的真正好处不是「改得快」，而是「知道改哪里」。**

每次新需求来了，你清楚地知道：
- 如果改了业务规则 → 改 application
- 如果改了存储方式 → 改 infrastructure
- 如果改了 API 格式 → 改 presentation

不需要在整个代码库里翻来翻去找「这段逻辑到底在哪里」。

### 延伸思考

- 如果要把锁定阈值从 5 次改成 3 次，改哪个文件？
- 如果要把锁定时间从 30 分钟改成 1 小时，改哪个文件？
- 如果要对不同用户设置不同的锁定阈值（普通用户 5 次、VIP 用户 10 次），需要改什么？
- v1 的 `setTimeout` 解锁如果进程重启会怎样？v2 的数据库方案呢？

---

## 📁 参考 solution

`solution/day04/` 包含完整的 day01 → day04 代码。
