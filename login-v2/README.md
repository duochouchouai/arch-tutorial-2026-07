# login-v2 — 清洁架构手打教程

v1 是「vibe coding 堆出来的屎山」，v2 是同一个业务（登录系统）用**多模块清洁架构**重写一遍，
每天一个主题，**6 天手打 + 1 天综合项目**。

```
login-v2/
├── GUIDE-day01..07.md     手打教程（概念 → 手打目标 → 验收点 → 违规→症状）
├── solution/day01..06/    每天的参考答案（独立可跑：npm install && npm run gate）
├── solution/day07/
│   ├── backend/           Day 07 参考答案（后端）
│   └── uniapp-login/      Day 07 参考答案（uni-app 前端）
└── docs/
    ├── conventions.md     架构约定（每条都对应可执行的检查）
    └── dependency-graph.md 依赖图 / import 规则矩阵 / 数据流
```

## 环境要求

- **Node.js ≥ 22**（用了内置的 `node:sqlite`；Node 22 会打印一条 experimental 警告，正常）
- npm ≥ 10
- 可选：PostgreSQL（只有 `solution/day07/backend` 的集成测试需要，提供 `DATABASE_URL` 才运行）

## 快速开始（跑参考答案）

每个 solution 目录都是**独立项目**（自己的 `package.json` / `package-lock.json`）：

```bash
cd solution/day06
npm install
cp .env.example .env   # 本机配置写 .env（永不进仓库）；默认值即可先跑起来
npm run gate           # prettier --check + tsc --noEmit + eslint + vitest
npm start              # http://localhost:3000 （/health 探针 + /auth 路由）
```

> 配置习惯：新环境一律 `cp .env.example .env`；**数据库路径 / 连接串这类本机配置只写 `.env`，永不提交**。
> `.env.example` 才是仓库里的「配置清单」——新增环境变量时同步更新它。

一次跑完所有天的门禁：

```bash
cd login-v2
npm run gate:all     # 逐个 solution 目录 npm ci && npm run gate（需要先 npm run install:all）
npm run install:all
```

## 学习路径

| Day | 主题 | 你会建立的东西 | 测试规模 |
|----|------|----------------|----------|
| 01 | 目录骨架与组合根 | 模块形状 + shared 端口/实现 + `main.ts` + `/health` + 12 条 strict | 4 文件 / 8 |
| 02 | 值对象与错误体系 | `Email/Phone/Password/Code` + `AppError` 家族 + 响应信封 | 9 / 37 |
| 03 | 领域实体 | `UserEntity`（`#private` + 业务方法 + 三桥）+ `FakeTimeProvider` | 10 / 43 |
| 04 | Schema SSOT 与定校分离 | 形状 Schema + 校验器 + 值对象化输出 | 13 / 54 |
| 05 | 端口 / 依赖倒置 / 用例 | 7 个端口 + 4 个用例 + SQLite 实现 + 控制器装配 | 20 / 80 |
| 06 | 多模块协作与架构守卫 | 抽出 `users` 模块（公共端口 + 薄服务）+ 守卫测试 3 条 | 22 / 85 |
| 07 | 综合项目（要求驱动） | 递进锁定 / PG 仓储 / 忘记密码重置 / notifications + uniapp | 后端 104+ / 前端 11 |

手打方式：**先自己写，再对照参考答案**。每天的 GUIDE 都有「验收点」（期望的测试数量、grep 自查）
和「违规 → 症状」表（写错了会出什么问题、怎么被测试抓到）。

## 每天都在守的纪律（摘要）

- 模块之间只许走对方 `index.ts`；`domain/` 不碰 npm 与基础设施；
- 形状只有一份（zod Schema + `z.infer`），规则住在 `validators/`；
- 判据归领域（实体/领域服务），存储只存取；一张表只有一个模块能写；
- 时间、id、随机码全部从端口注入；错误先是领域概念，表现层才翻译成 HTTP；
- 约定必须可执行：`tests/architecture.test.ts` + `npm run gate`。

细节见 `docs/conventions.md`，依赖规则见 `docs/dependency-graph.md`。

## API 一览（Day 06 基线）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 探针 |
| POST | `/auth/send-code` | 发注册验证码（控制台打印） |
| POST | `/auth/register` | 注册（需验证码） |
| POST | `/auth/login` | 登录（5 次失败锁定，Day 07 起递进：5/15/30/60 分钟） |
| GET | `/auth/session` | 当前会话（`Authorization: Bearer <token>`） |
| DELETE | `/auth/session` | 退出（吊销 token） |
| POST | `/auth/forgot-password` | 发重置码（Day 07；防枚举） |
| POST | `/auth/reset-password` | 重置密码（Day 07；旧会话全失效） |

响应信封：`{ success: true, data }` / `{ success: false, message, fieldErrors? }`。
