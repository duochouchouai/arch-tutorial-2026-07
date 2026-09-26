# Day 07 参考答案 — 综合项目（要求驱动）

需求见 `../../GUIDE-day07.md`。本目录是参考实现：**在 Day 06 终态基线上完成 4 个后端任务 + 前端 uniapp**。

```
day07/
├── backend/          后端参考答案（= day06 + 4 个任务）
└── uniapp-login/     前端参考答案（登录/注册/忘记密码/重置 + 会话）
```

## 运行

```bash
# 后端
cd backend && npm install
cp .env.example .env                           # 本机配置写 .env（永不进仓库）；默认零配置可跑
npm run gate                                   # 26 文件通过 + 1 文件跳过（PG 集成）/ 104 测试
npm start                                      # http://localhost:3000

# 可选：PostgreSQL 集成测试 —— 在 .env 里取消 DATABASE_URL 注释并填本机连接串后
npm test                                       # 不设 DATABASE_URL 时整个文件自动跳过

# 前端（uni-app 的 .vue 页面用 HBuilderX 打开；门禁只覆盖 TS 层）
cd uniapp-login && npm install && npm run gate  # 2 文件 / 11 测试
```

## 任务 → 代码映射

| 任务 | 主要落点 | 关键文件 |
|---|---|---|
| **1. 递进式锁定**（5/15/30/60 分钟封顶） | 常量（阶梯纯函数）→ 实体（档位与判据）→ 行形状 + 仓储（`lock_count` 持久化） | `auth/domain/constants.ts`、`auth/domain/entities/user.entity.ts`、`users/domain/schemas/user.ts`、`users/infrastructure/sqlite-user-account-repository.ts` |
| **2. PostgreSQL 仓储**（只改基础设施） | users 增加 PG 实现；组合根按 `DATABASE_URL` 选实现 | `users/infrastructure/postgres-user-account-repository.ts`、`users/compose.ts`、`src/config/index.ts`、`src/main.ts` |
| **3. 忘记密码 / 重置密码**（防枚举 + 用途隔离 + 吊销旧会话） | 两个新用例 + 校验器 + 路由；会话端口加 `removeAllForUser` | `auth/application/{forgot,reset}-password.usecase.ts`、`auth/domain/validators/*.ts`、`auth/presentation/auth.routes.ts`、`auth/domain/ports/session-store.port.ts` |
| **4. notifications 订阅**（附加题） | 新模块 + 事件载荷扩展（带 `username`/`email`） | `notifications/**`、`auth/domain/events/user-registered.event.ts`、`auth/application/user-registered.publisher.ts` |
| **前端 uniapp** | 页面 + `uni.request` 唯一出口 + 前端 Schema | `uniapp-login/src/infrastructure/auth-api.ts`、`src/domain/schemas.ts`、`src/application/use*.ts`、`pages/**` |

## 与 Day 06 的差异（`diff -r` 概览）

- **domain/entities**：`recordFailedLogin()` 引入档位（`lockCount`）、`recordLogin()` 清零档位、新增 `changePassword()`；
- **domain/constants**：`LOCK_DURATION_MS` 常量 → `lockDurationFor(lockCount)` 纯函数（可测）；
- **users/infrastructure**：新增 `postgres-user-account-repository.ts`（`$1..$n`、别名加引号、`#ready` 惰性建表）；
- **auth/application**：`forgot-password` / `reset-password` 用例；注册事件发布收 `PublicUser`（载荷带够数据）；
- **auth/presentation**：两个新端点；
- **modules/notifications**：`createNotificationsModule({ eventBus })` 装配即订阅；
- **测试**：实体档位、两轮升级 e2e、忘记/重置 e2e（防枚举、一次性、用途隔离、旧会话失效）、PG 集成（跳过式）、notifications 单测 + 装配集成。

## 已知简化（真实仓库的差异）

- 表结构用 `CREATE TABLE IF NOT EXISTS`（真实仓库用迁移链）；
- 事件用内存总线（真实仓库用 outbox + worker，保证不丢）；
- PG 切换只覆盖 **users 表**；auth 自己的 `auth_codes` / `auth_sessions` 仍是 SQLite（教程范围控制）；
- 前端不做路由参数传递（`onLoad(query)`）与组件样式抽取，保持页面单一职责。
