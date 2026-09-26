# GUIDE-day07 — 综合项目（要求驱动）

预计时间：**一整天**（建议：后端 3 个任务 4 小时 + 前端 2 小时 + 自查 1 小时）

> 今天没有「跟着打」的步骤。你拿到四份**需求**，自己在 Day 06 的代码基线上实现。
> 参考答案在 `solution/day07/`：**先做完一个任务再对照一个**。
> 验收标准不是「和答案一样」，而是：**每个任务的门禁全绿 + 架构守卫不新增违规**。

---

## 起点

```bash
cp -r solution/day06/* your-day07/     # 以 Day 06 终态为基线（已含 22 文件 / 85 测试的绿色门禁）
cd your-day07 && npm install && npm run gate    # 先确认基线是绿的
```

Day 06 的可用能力：注册（验证码）/ 登录（5 次锁定 30 分钟）/ 会话 / 退出 / users 模块 / 事件总线 / 架构守卫。

---

## 任务 1 — 递进式锁定（必做）

**需求**

1. 首次触发锁定（连续失败 5 次）锁 **5 分钟**；
2. 每再被锁一次，时长升一档：**15 → 30 → 60 分钟**，60 分钟封顶；
3. 登录**成功**时，失败计数与锁定档位一起清零；
4. 触发锁定时失败计数归零（解锁后重新攒 5 次进入下一档）；
5. `lock_count` 必须持久化（重启后档位不丢）。

**要动的地方**（提示，不是步骤）

- 行形状（users 模块的 `UserRowSchema`）+ DDL + 仓储的 `INSERT/UPDATE`；
- 实体：新增状态 + 档位计算（注意：**判据放实体，时间从 TimeProvider 取**）；
- 常量：把「时长阶梯」写成可测的纯函数（`lockDurationFor(lockCount)`）；
- 测试：实体级（四档 + 封顶）、用例级（两轮升级）、e2e（白盒把 `locked_until` 拨回过去再触发第二轮）。

**验收点**

- `lockDurationFor` 的单元测试覆盖 1/2/3/4/5 档；
- e2e：第二轮被锁时，`locked_until - now` 落在 14~16 分钟；
- 登录成功后 `failed_attempts = 0` 且 `lock_count = 0`。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 档位算在用例里（不在实体） | 用例测试要 mock 大量状态；两处用例（登录/改密）实现不一致 |
| 时长写死在 SQL 或常量表以外的分支 if/else | 加一档要改多处；测试断言抄常量导致「测试与实现一起错」 |
| 触发锁定时不重置 `failed_attempts` | 解锁后一次失败立刻再次锁定，档位瞬间拉满（行为与需求不符） |

---

## 任务 2 — 把 users 表迁到 PostgreSQL（必做）

**需求**

1. 只改基础设施与配置：`domain` / `application` / `presentation` **零改动**；
2. 通过环境变量 `DATABASE_URL` 切换：有值走 Postgres，无值走 SQLite（默认，保证零配置可跑）；
3. 集成测试：提供 `DATABASE_URL` 时才运行（CI/本地默认跳过）；
4. 连接串属于**本机配置**：写在 `.env`（照 `.env.example` 抄），永不提交；应用与 `vitest.config.ts` 都会加载它，所以 `npm start` 和 `npm test` 都读得到；
4. 注意 PG 方言：占位符 `$1..$n`、别名要**加引号**（PG 会把未加引号的别名折叠成小写）。

**验收点**

- `git diff --stat` 里 `domain/` 与 `application/` 无文件改动；
- 同一套仓储断言（insert / find / update 往返）在两种实现下都成立；
- `.env` 里设了 `DATABASE_URL=postgres://…` 时集成测试由「跳过」变「通过」。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 在用例里判断「用哪个数据库」 | 业务层被部署细节污染；测试要跑两条分支 |
| 端口签名是同步的（为 SQLite 将就） | PG 是异步的 → 端口返工，全仓库改签名 |
| 别名不加引号（`AS passwordHash`） | PG 返回全小写 `passwordhash` → Schema.parse 当场炸（这是**好事**：边界校验器救了你） |
| 迁移直接改 SQLite 的 DDL 注释就当「迁移完了」 | 两套 schema 漂移；生产事故 |

---

## 任务 3 — 忘记密码 / 重置密码（必做）

**需求**

1. `POST /auth/forgot-password { email }`：给已注册邮箱发 6 位重置码（5 分钟有效）；
2. **防枚举**：未注册邮箱也返回同样的成功响应（不发码）；
3. 重置码与注册码**按用途隔离**（同一个邮箱的注册码不能用来重置密码）；
4. `POST /auth/reset-password { email, code, password }`：验码 → 消费 → 改密；
5. 新密码走**同一套**强度规则（重置入口不是弱密码后门）；
6. 改密成功后：**该用户全部旧会话立即失效**；
7. 改密顺带解锁（被锁定的用户改完密码应能立即登录）。

**验收点**

- e2e：改密后「旧密码 401 / 旧 token 401 / 新密码 200」；
- e2e：未注册邮箱与已注册邮箱的响应体逐字节相同；
- e2e：同一枚码第二次提交失败；注册用途的码不能重置密码；
- 单测：`removeAllForUser` 只清该用户的会话（别人的会话不受影响）。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 未注册邮箱返回「该邮箱未注册」 | 端点变成账号探测器（与登录防枚举同一条纪律被破坏） |
| 验证码不按 purpose 隔离 | 攻击者用注册接口发码 → 重置别人密码 |
| 验码后不消费（或先改密后消费） | 同一枚码可重放；改密失败后码仍可用（超出预期窗口） |
| 改密后不清会话 | 攻击者拿到旧 token 继续使用 —— 改密等于没改 |
| 重置校验放松（只查长度） | 弱密码后门；审计直接判不合格 |

---

## 任务 4 — notifications 模块订阅注册事件（附加题）

**需求**

1. 新模块 `modules/notifications/`，订阅 `UserRegisteredEvent`，发欢迎邮件；
2. **auth 一行都不改**（若发现要改 auth，说明 Day 06 的事件契约没设计好 —— 先修契约）；
3. 事件载荷要「装够订阅方需要的数据」（订阅方不许回查 users 模块）：载荷从 `{ userId, registeredAt }` 扩为含 `username`/`email`；
4. notifications 用**自己的**邮件端口（窄口原则：不共享 auth 的端口类型）；
5. 订阅装配即生效（`createNotificationsModule({ eventBus })` 调用即订阅）；
6. 处理器失败只记日志，绝不把异常抛回发布方。

**验收点**

- 集成测试：真实 `InMemoryEventBus` + 真实现（spy `console.log`），发布事件 → 欢迎邮件被打印；
- `grep -rn "modules/auth" src/modules/notifications` 只命中 `../auth/index`；
- 事件载荷变更后，注册用例的测试断言新字段（`username` / `email`）。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| notifications 直接 import auth 的内部路径拿事件类 | auth 重构内部结构 → notifications 编译失败；守卫规则 ① 红 |
| 载荷只带 `userId`，订阅方去查 users 模块 | 订阅方依赖两个模块（耦合翻倍）；事件重放时数据已变（历史事件读出现状） |
| 订阅方抛错透传 | 注册接口在「邮件服务挂了」时出现 500 |
| 复用 auth 的 `MailSenderPort` 类型 | 改 auth 的邮件端口会牵动 notifications（跨模块共享类型 = 隐式耦合） |

---

## 前端任务 — uniapp 登录/注册/忘记密码（必做）

**需求**

1. 页面：登录 / 注册 / 忘记密码 / 重置密码 / 首页（会话状态 + 退出）；
2. 注册为**两步**：先发验证码，再提交注册；
3. `uni.request` **只允许出现在 `src/infrastructure/`**（守卫靠 code review + 自查，前端项目可加 eslint 规则）；
4. 响应信封与错误映射：`{ success, data }` / `{ success:false, message, fieldErrors }` → `ApiError(statusCode, fieldErrors)`；
5. 响应数据也要**先 parse 再信**（跨端契约的客户端一侧）；
6. 会话：token 存本地，进首页用 `GET /auth/session` 验证；退出走 `DELETE /auth/session` 并清本地。

**验收点**

```bash
cd solution/day07/uniapp-login && npm install && npm run gate
```
- 2 个测试文件 / 11 个测试全过（Schema 校验 + api 层信封映射，用假 `uni` 替身）；
- `grep -rn "uni.request" pages src/application src/domain` 无结果；
- 失败信封 → `ApiError`：`statusCode` / `fieldErrors` 可断言。

**违规 → 症状**

| 违规 | 症状 |
|---|---|
| 页面里直接 `uni.request` | 换网络层（如 axios / 统一重试）要改 N 个页面；错误处理各不相同 |
| 页面直接 `JSON.parse` 信后端 | 契约变更时静默崩（`undefined` 渲染成空白而不是报错） |
| 前后端各写一份信封解析 | 契约漂移的第一现场；正确做法是共享一份 Schema（本教程前后端各持一份同形 Schema + 测试） |
| token 只存本地不验证 | 服务端已吊销的会话在本地仍显示「已登录」 |

---

## 交付清单（自查）

| 项 | 命令 | 期望 |
|---|---|---|
| 后端门禁 | `cd day07/backend && npm run gate` | 26 文件通过 + 1 跳过（PG 集成）/ 104 测试通过 |
| 前端门禁 | `cd day07/uniapp-login && npm run gate` | 2 文件 / 11 测试通过 |
| 架构守卫 | 后端 `npm test` 里的 `architecture.test.ts` | 3 条规则全绿，无新增豁免 |
| 换库验证 | `.env` 里设 `DATABASE_URL=postgres://…` 后 `npm test`（可选） | 集成测试从「跳过」变「通过」 |
| 冒烟 | `npm start` + 走一遍 注册→登录→忘记密码→重置→新密码登录 | 全流程成功 |

---

## 🔭 与真实仓库（NKDate）的对应

- 递进式锁定：真实仓库用「风控档位」表驱动（更复杂），但落点一致 —— **实体持有规则、端口持有存储**；
- PG 双实现：真实仓库以 PG 为唯一实现，但「换库只改基础设施」这条纪律每天都在被验证（换连接池、加只读副本）；
- notifications：真实仓库叫「消息中心」，订阅多类事件（注册/下单/改密），窄口端口按事件类型拆分；
- 前端：真实项目用 uni-app + 同样的三层（domain/application/infrastructure），`uni.request` 收在唯一文件里。
