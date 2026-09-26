# 屎山代码演进教程 🏔️💩 → 🏗️✨

一个用于内部培训的教程项目，通过**对比**展示「vibe coding 堆出来的屎山」和「多模块清洁架构」的差异。

同一个业务（登录系统）写两遍：

- **login-v1** —— JavaScript 屎山：从 52 行的注册/登录一路演进到 OAuth 复制粘贴、AppSecret 硬编码；
- **login-v2** —— TypeScript 清洁架构：**6 天手打 + 1 天综合项目**，每天一个主题，把纪律写成可执行的检查。

## 目录结构

```
├── login-v1/                     ← 屎山演进（vibe coding，供「体验反例」）
│   └── day01..06/                每个 day 独立可跑（node day*.js）
│
├── login-v2/                     ← 清洁架构手打教程
│   ├── GUIDE-day01..07.md        教程正文：概念 → 手打目标 → 验收点 → 违规→症状
│   ├── solution/day01..06/       每天参考答案（独立项目，npm install && npm run gate）
│   ├── solution/day07/
│   │   ├── backend/              综合项目参考答案（后端）
│   │   └── uniapp-login/         综合项目参考答案（uni-app 前端）
│   ├── docs/conventions.md       架构约定（每条对应可执行检查）
│   └── docs/dependency-graph.md  依赖图 / import 规则矩阵 / 数据流
│
└── （可自行把 `gate:all` 接进 CI：8 个 solution 目录逐个跑门禁）
```

## 怎么用

### 1. 体验屎山（login-v1）

```bash
cd login-v1/day06 && npm install && npm start
# POST /login 连续 5 次错误密码，看「锁定」是怎么用 setTimeout + 双状态糊出来的
```

### 2. 手打清洁架构（login-v2）

```bash
cd login-v2
npm run install:all      # 给所有 solution 目录装依赖（每个目录是独立项目）
cat GUIDE-day01.md       # 从第一天开始，跟着 GUIDE 打代码
```

卡住了再对照 `solution/dayNN/` 的参考答案 —— **先自己写**，否则学不到架构守卫抓你的那一下。

### 3. 只跑某一天 / 全部

```bash
cd login-v2/solution/day06
npm install && npm run gate     # prettier + tsc + eslint + vitest（22 文件 / 85 测试）

cd login-v2
npm run gate:all                # 所有 solution 的门禁，一次跑完 8 个目录
```

## 7 天演进一览

| 天数 | v1 屎山 | v2 清洁架构 | v2 测试规模 |
|------|---------|-------------|------|
| Day 01 | 明文密码、SQL 拼接、零校验 | 目录骨架 + 组合根 + shared 端口/实现 + 12 条 strict | 4 / 8 |
| Day 02 | 邮箱 if/else 校验 | 值对象（构造即校验）+ AppError 体系 + 响应信封 | 9 / 37 |
| Day 03 | 忘记密码（`Math.random()`、无过期） | 领域实体（`#private` + 业务方法 + 注入时钟） | 10 / 43 |
| Day 04 | 记住我（token 永不过期） | Schema SSOT + 形状/规则分离 + 值对象化校验输出 | 13 / 54 |
| Day 05 | 账户锁定（`setTimeout` + 双状态） | 端口 + 依赖倒置 + 7 端口 / 4 用例 / SQLite 接线 | 20 / 80 |
| Day 06 | 微信 + QQ（复制粘贴、AppSecret 硬编码） | 抽出 users 模块 + 公共端口 + 架构守卫测试 | 22 / 85 |
| Day 07 | — | 递进式锁定 / PostgreSQL 仓储 / 忘记密码重置 / notifications 订阅 + uniapp 前端 | 后端 104+ / 前端 11 |

「v1 的每个雷 → v2 的哪条纪律」的对照写在每天的 GUIDE 里（含「违规 → 症状」表）。

## 技术栈

| | v1 | v2 |
|--|----|----|
| 语言 | JavaScript | TypeScript（12 条 strict 全开） |
| 数据库 | better-sqlite3 | `node:sqlite`（Node ≥ 22 内置）；Day 07 可切 PostgreSQL |
| 框架 | Express | Express |
| 密码 | 明文 | bcryptjs（轮数可配） |
| 校验 | 手写 if/else | Zod（Schema 是唯一形状真理源） |
| 测试 | 无 | vitest（≤ 104+ 个）+ supertest e2e + 架构守卫 |
| 前端 | 无 | uni-app（Day 07：注册/登录/忘记密码/重置，`uni.request` 只在 infrastructure） |
| 门禁 | 手动 | `npm run gate:all`：8 个 solution 目录各自 `npm run gate`（含架构守卫测试） |

## 架构原则（v2）

- **依赖倒置**：`domain` 定义端口，`infrastructure` 实现，用例只认端口；
- **单向依赖**：`presentation → application → domain ← infrastructure`；
- **模块只走门面**：跨模块 import 只许命中对方 `index.ts`（架构守卫强制）；
- **SSOT**：形状只有一份（zod + `z.infer`），规则住在 `validators/`；
- **判据归属 / 表归属**：判断在领域层，表的读写只属于拥有者模块；
- **约定可执行**：每条纪律都有测试或检查盯着 —— 写在文档里的规则等于没有规则。
