# 架构约定（login-v2）

> 这些约定不是「建议」，而是**可执行的规则**：每条都对应一个能变红的测试或一条可执行检查。
> 本文是 `solution/day06` 之后的长期纪律；每天首次出现某条约定的地方在最后一列标注。

---

## 1. 模块与公开面

| 约定 | 说明 | 首次出现 |
|---|---|---|
| 每个模块只有 `compose.ts` + `index.ts` 两个出入口 | `index.ts` 是纯 barrel，只发布：组合根、跨模块契约、跨模块形状 | Day 01 |
| 跨模块 import **只能**命中 `modules/<name>/index` | `import { X } from '../users/index'` ✓；`from '../users/infrastructure/...'` ✗ | Day 06（守卫规则 ①） |
| 模块内部件（domain/application/infrastructure 实现）不对外发布 | 想被外部使用 → 提升为端口 + 应用服务 | Day 06 |
| 依赖方向：`presentation → application → domain ← infrastructure` | infrastructure 实现 domain 端口（依赖倒置） | Day 05 |

模块清单（Day 07 终态）：

```
modules/shared/        共享底座：端口（TimeProvider/IdGenerator/EventBus）+ 实现 + 错误 + 信封
modules/users/         账号：users 表 + 行形状 + 仓储 + 公共端口
modules/auth/          认证：注册/登录/会话/忘记密码 + 发事件
modules/notifications/ 通知：订阅事件（附加题）
```

## 2. Schema 单一真理源（SSOT）

| 约定 | 说明 |
|---|---|
| 一切**形状**用 zod 定义并成对导出 `z.infer` 类型 | 禁止手写 `interface` 重述数据形状 |
| 形状（`schemas/api/`）与业务规则（`validators/`）分离 | `z.string()` 里不写 `.min()`/`.email()` |
| 校验器输出也是 Schema（`schemas/validator/`） | 返回值是值对象，不是裸字符串 |
| 用例依赖清单也是 Schema（`schemas/deps/`） | `z.custom<Port>()` 标注，打开文件即见契约 |
| 跨边界数据（HTTP 入参、DB 行、配置、事件载荷、环境变量）**必须 parse 后再信** | 禁止 `as` 断言外部数据 |

## 3. 值对象与实体

| 约定 | 说明 |
|---|---|
| 值对象：`private constructor` + `Object.freeze` + `create()`（抛 `ValidationError`）+ `fromTrusted()` | 数据源可信时才用 `fromTrusted` |
| 实体：`#private` 状态 + `readonly getter` + **业务方法**改状态 | 外部无法直接赋值 |
| 实体永不调 `Date.now()` | 时间从构造注入的 `TimeProvider` 取；判据方法接受显式时间参数 |
| 实体提供三座桥：`toRow()` / `fromData(row, now)` / `toSnapshot()` | 边界翻译显式化 |
| 对外形状是**白名单**（如 `PublicUser`） | 不是「实体减几个字段」；测试断言键集合 |

## 4. 判据归属与表归属

| 约定 | 说明 |
|---|---|
| **判据归属**：过期/锁定/匹配等判定在领域（实体、领域服务），不在存储实现里 | 存储只负责存/取/删；`SELECT` 里不塞业务判断 |
| **表归属**：一张表的 DDL 与全部写 SQL 只出现在**拥有者模块的 infrastructure** | `INSERT INTO users` / `UPDATE users` / `CREATE TABLE users` 仅 `users/infrastructure/`（守卫规则 ③） |
| 列名 → 字段名映射用 SQL `AS` 别名 | 代码里不手写映射表；列名漂移时 `.parse()` 当场报错 |

## 5. 错误体系

| 约定 | 说明 |
|---|---|
| 错误先是**领域概念**：`AppError { code, statusCode, fieldErrors }` | 状态码是「建议」，采纳者是表现层 |
| 共享错误放 `shared/domain/errors/`；模块专属错误放模块 `domain/errors/` | 如 `AccountLockedError`(423) |
| 预期外错误**不包装** | 交给 `errorHandler` 兜成 500，日志留全量现场、响应只给一句话 |
| 防枚举：可被探测的差异必须抹平 | 「账号不存在」与「密码错误」同响应；「未注册邮箱」与「已注册邮箱」同响应 |
| 字段级错误统一为 `fieldErrors: { field: string[] }` | 前端逐字段渲染 |

## 6. 端口与用例

| 约定 | 说明 |
|---|---|
| 端口方法一律返回 `Promise` | 即使当前实现是同步 API —— 为换异步实现留形状 |
| 用例只做编排：取数据 → 判分支 → 调实体 → 写回 → 发副作用 | 不写 SQL、不碰散列算法、不感知 HTTP |
| 副作用（事件、邮件）失败**不得拖垮主流程** | 发布器内部 try/catch + 日志 |
| 事件路由按 `constructor.name`；订阅方从对方 **index** 拿事件类型 | 事件载荷要装够订阅方需要的数据 |
| 时间、id、随机码全部从端口取 | 禁止 `Date.now()` / `Math.random()`（密码学随机端口） |

## 7. 表现层

| 约定 | 说明 |
|---|---|
| controller 只做四步：取输入 → 校验器 → 用例 → 装信封 | 不写业务判断 |
| 路由文件只有「路径 → controller」映射 | 无逻辑 |
| 响应信封唯一：`{ success: true, data }` / `{ success: false, message, fieldErrors? }` | 前后端镜像同一份形状（前端 `domain/schemas.ts`） |

## 8. 测试与门禁

| 约定 | 说明 |
|---|---|
| 每层各自可测：值对象/实体（纯）、用例（替身端口）、仓储（`:memory:`）、e2e（真装配） | e2e 用 `createApp()` —— **测的装配 = 跑的装配** |
| 替身（fake）放 `tests/support/fakes.ts`，测试只依赖端口 | 不用 `vi.fn` 断言调用次数，而是断言最终状态 |
| 架构约定写进 `tests/architecture.test.ts`（3 条规则 + sanity check） | 规则要能变红，否则等于没有 |
| 门禁四连：`prettier --check` + `tsc --noEmit` + `eslint` + `vitest` | `npm run gate`；`npm run gate:all` 一次跑完 8 个目录（含架构守卫） |
| `tsc` 12 条 strict 全开；`no-explicit-any` / `ban-ts-comment` 为 error | 类型系统是设计工具，不是装饰 |

## 9. 文件与命名

| 约定 | 说明 |
|---|---|
| 每个 `.ts` 带 `@file`（说「为什么」）+ `@author` 文件头 | 教程统一 `@author 教程组` |
| 命名：端口 `XxxPort`、实现 `TcshXxx`/`SqliteXxx`、用例 `XxxUseCase`、校验器 `XxxValidator`、Schema `XxxSchema` | 见各 solution |
| 业务数字（次数、时长、TTL）只在 `domain/constants.ts` 出现一次 | 测试引用同一常量/纯函数 |

## 10. 配置与环境变量

| 约定 | 说明 | 首次出现 |
|---|---|---|
| 配置只从环境变量进入进程，`config/index.ts` 是唯一校验点（zod，非法值启动即炸） | 代码里不存在第二个 `process.env` 读取处 | Day 01 |
| 本机配置写 `.env`，**永不提交**；仓库只提交 `.env.example` 模板 | 每人 `cp .env.example .env` 后按需改；数据库路径/连接串这类东西不进版本库 | Day 01 |
| `.env` 只是本地开发便利：`loadEnvFile()` 在 `require.main` 里加载，已设的环境变量优先 | 单测照旧显式传 `config`；需要真库的集成测试在 `vitest.config.ts` 里一并加载（Day 07）；生产靠平台注入 | Day 01 |
| 新增环境变量时必须同步更新 `.env.example`（带注释说明语义与默认值） | 示例文件是仓库里唯一的「配置清单」，默认值让零配置也能跑 | Day 05（`DB_PATH`） |
