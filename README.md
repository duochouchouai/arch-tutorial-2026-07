# 屎山代码演进教程 🏔️💩 → 🏗️✨

一个用于内部培训的教程项目，通过**对比**展示「vibe coding 堆出来的屎山」和「清洁架构的正确做法」之间的差异。

## 目录结构

```
├── login-v1/          ← JavaScript：屎山演进（vibe coding）
│   ├── day01/         注册 + 登录（52 行，已埋雷）
│   ├── day02/         + 邮箱字段
│   ├── day03/         + 忘记密码（Math.random()、无过期）
│   ├── day04/         + 记住我（token 永不过期）
│   ├── day05/         + 账户锁定（setTimeout、双状态不同步）
│   └── day06/         + 微信 + QQ 登录（复制粘贴、AppSecret 硬编码）
│
├── login-v2/          ← TypeScript：清洁架构（正确实现）
│   ├── GUIDE-day*.md   ← 手打教程文档（组员跟着打代码）
│   └── solution/       ← 完整参考答案（可独立运行）
│       ├── day01/      注册 + 登录（bcrypt、参数化查询）
│       ├── day02/      + 忘记密码（crypto.randomBytes、过期）
│       ├── day03/      + 记住我（30 天过期、自动清理）
│       ├── day04/      + 账户锁定（全数据库、无 setTimeout）
│       ├── day05/      + 第三方登录（参数化 provider）
│       └── day06/      + 退出登录 + 13 个单元测试
│
└── README.md
```

## 怎么用

### 体验屎山（login-v1）

```bash
cd login-v1/day06
npm install
npm start
# POST /login 试 5 次错误密码，看看账户锁定
```

每个 day 文件夹都是独立的，`node day*.js` 就能跑。

### 手打清洁架构（login-v2）

```bash
cd login-v2
npm install
```

然后跟着 `GUIDE-day01.md` 开始打代码。卡住了可以看 `solution/day01/` 的参考答案。

也可以直接跑参考答案：

```bash
cd login-v2/solution/day06
npm install
npm test    # 13 个单元测试
npm start   # 启动服务
```

## 7 天对比一览

| 天数 | v1 屎山（login-v1） | v2 清洁架构（login-v2） |
|------|-------------------|----------------------|
| Day 01 | 明文密码、SQL 拼接、零校验 | bcrypt、参数化查询、4 层架构 |
| Day 02 | +邮箱（if/else 校验） | 内置在 Day 01（Zod schema） |
| Day 03 | 忘记密码（Math.random()） | crypto.randomBytes + 过期 + 防枚举 |
| Day 04 | 记住我（永不过期） | 30 天过期、自动清理 |
| Day 05 | 账户锁定（setTimeout + 双状态） | 全数据库 + SQL 过期判断 |
| Day 06 | 微信+QQ（复制粘贴、AppSecret 硬编码） | 参数化 provider + 13 个测试 |
| Day 07 | — | — |

## 技术栈

| | v1 | v2 |
|--|----|----|
| 语言 | JavaScript | TypeScript |
| 数据库 | better-sqlite3 | node:sqlite（Node.js 22+ 内置） |
| 框架 | Express | Express |
| 密码 | 明文 | bcryptjs |
| 校验 | 手写 if/else | Zod |
| 测试 | 无 | vitest |

## 设计原则

- **依赖倒置**：domain 定义接口，infrastructure 实现
- **单向依赖**：presentation → application → domain ← infrastructure
- **关注点分离**：每层只做自己的事
- **依赖注入**：不在类内部 new 依赖
