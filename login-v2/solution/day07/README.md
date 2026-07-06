# Day 07 参考答案

>  参考答案的目的是让你对照自己的实现，验证架构分层是否正确。

---

## 清洁架构分层图


### 后端（Node.js + PostgreSQL）

```
                          HTTP 请求
                           │
                           ▼
  ┌────────────────────────────────────────────────┐
  │              PRESENTATION                      │
  │  auth-controller.ts   注册 /register           │
  │  auth-schema.ts       登录 /login              │
  │                       忘记 /forgot-password    │
  │  职责：解析 HTTP → 调用 use case → 返回 JSON    │
  └───────────────────────┬────────────────────────┘
                           │ 调用
                           ▼
  ┌────────────────────────────────────────────────┐
  │              APPLICATION                       │
  │  RegisterUserUseCase    编排注册流程            │
  │  LoginUserUseCase       编排登录+递进式锁定      │
  │  ForgotPasswordUseCase  编排忘记密码            │
  │  ...                                           │
  │  职责：编排业务逻辑，不关心 HTTP 和数据库         │
  │  只依赖 UserRepository 接口                     │
  └───────────────────────┬────────────────────────┘
                           │ 依赖（接口）
                           ▼
  ┌────────────────────────────────────────────────┐
  │              DOMAIN                            │
  │  user.ts               User {{ id,username }}  │
  │  user-repository.ts    interface UserRepository│
  │                        LockStatus 等           │
  │  职责：定义实体 + 仓库接口                       │
  │  不依赖任何框架、任何数据库驱动                   │
  └───────────────────────┴────────────────────────┘
                           ▲
                           │ 实现（依赖倒置）
  ┌────────────────────────────────────────────────┐
  │              INFRASTRUCTURE                    │
  │  database.ts             pg Pool 连接          │
  │  user-repository-pg.ts   implements UserRepo   │
  │                          参数化查询 $1 $2 $3    │
  │  职责：实现 domain 接口，连接 PostgreSQL         │
  └────────────────────────────────────────────────┘
```

依赖方向：**presentation → application → domain ← infrastructure**
（infrastructure 实现 domain 接口，形成依赖倒置）


### 前端（uniapp + Vue3）

```
                          用户操作
                           │
                           ▼
  ┌────────────────────────────────────────────────┐
  │              PRESENTATION                      │
  │  pages/login.vue              登录+锁屏倒计时    │
  │  pages/register.vue           注册表单          │
  │  pages/forgot-password.vue    忘记密码          │
  │  pages/reset-password.vue     重置密码          │
  │  pages/oauth.vue              第三方登录        │
  │  pages/index.vue              登录后首页        │
  │  职责：渲染页面 + 样式 + 调 hooks                │
  │  禁止：uni.request、业务判断                     │
  └───────────────────────┬────────────────────────┘
                           │ 调用
                           ▼
  ┌────────────────────────────────────────────────┐
  │              APPLICATION                       │
  │  useLogin.ts           调 authApi.login()      │
  │  useRegister.ts        调 authApi.register()   │
  │  useForgotPassword.ts  管理 token / 错误 / 状态 │
  │  useResetPassword.ts    useAutoLogin.ts        │
  │  useOAuth.ts           useLogout.ts            │
  │  职责：调 authApi，处理返回数据和错误             │
  │  禁止：uni.request、DOM 操作                    │
  └───────────────────────┬────────────────────────┘
                           │ 调用
                           ▼
  ┌────────────────────────────────────────────────┐
  │              INFRASTRUCTURE                    │
  │  auth-api.ts                                   │
  │    POST /auth/register                         │
  │    POST /auth/login                            │
  │    POST /auth/forgot-password                  │
  │  职责：封装 uni.request，全项目唯一出现处        │
  └────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────┐
  │              DOMAIN                            │
  │  user.ts                                       │
  │    interface User {{ id, username, email }}    │
  │  职责：定义 User 类型，与后端完全一致             │
  │  各层都可 import，不依赖任何框架                 │
  └────────────────────────────────────────────────┘
```

依赖方向：**presentation → application → infrastructure**
各层都可引用 **domain**（类型定义）

### 两者对比

| | 后端 | 前端 |
|----|------|------|
| 依赖注入方式 | 构造函数注入 | 模块导入约束 |
| 接口定义位置 | domain（UserRepository） | infrastructure（authApi 对象） |
| 组合根 | index.ts | 无显式组合根，hooks 直接 import |
| domain 职责 | 实体 + 仓库接口 | 仅实体类型 |
| 换实现成本 | 改 infrastructure 2 个文件 | 改 infrastructure 1 个文件 |
| 测试方式 | mock UserRepository 接口 | vi.mock auth-api 模块 |

---

## 目录结构

```
solution/day07/
├── README.md
├── backend/                    ← 后端参考答案
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── domain/
│       │   ├── user.ts
│       │   └── user-repository.ts
│       ├── application/
│       │   ├── login-user.ts          ← 递进式锁定逻辑
│       │   └── ...                     ← 其余用例（不变）
│       ├── infrastructure/
│       │   ├── database.ts            ← PostgreSQL 连接
│       │   └── user-repository-pg.ts  ← pg 实现
│       ├── presentation/
│       │   ├── auth-controller.ts
│       │   └── auth-schema.ts
│       └── shared/
│           └── errors.ts
│
└── uniapp-login/               ← 前端参考答案
    ├── manifest.json
    ├── pages.json
    ├── App.vue
    ├── main.js
    ├── uni.scss
    ├── src/
    │   ├── domain/
    │   │   ├── user.ts
    │   │   └── schemas.ts             ← Zod 校验
    │   ├── application/
    │   │   ├── useLogin.ts            ← 登录 + 锁定倒计时
    │   │   ├── useRegister.ts
    │   │   ├── useForgotPassword.ts
    │   │   ├── useResetPassword.ts
    │   │   ├── useAutoLogin.ts
    │   │   ├── useOAuth.ts
    │   │   └── useLogout.ts
    │   └── infrastructure/
    │       └── auth-api.ts            ← uni.request 唯一出现的地方
    └── pages/
        ├── index/index.vue
        ├── login/login.vue            ← 锁定后显示倒计时锁屏
        ├── register/register.vue
        ├── forgot-password/forgot-password.vue
        ├── reset-password/reset-password.vue
        └── oauth/oauth.vue
```

---

## Zod 校验放哪层？

同一套 Zod schema，**后端放 presentation，前端放 domain**。不是自相矛盾，是前后端职责不同。

### 后端：presentation 层

`auth-schema.ts` 在 presentation，原因：

- 校验的是 HTTP Body → I/O 边界
- domain 层保持**零依赖**（不 import 任何第三方库）
- use case 收到的已经是干净参数

### 前端：domain 层

`src/domain/schemas.ts` 在 domain，原因：

- `密码至少 6 字符` 不管 H5、小程序都该生效 → **领域约束**
- 前端 domain 无零依赖硬要求（User 类型已import）
- hooks 调 authApi 前校验，不通过直接设 error，**不发网络请求**

### 后端 vs 前端对照

| | 后端 | 前端 |
|----|------|------|
| Zod 文件 | `presentation/auth-schema.ts` | `src/domain/schemas.ts` |
| 谁调校验 | controller（presentation） | hook（application） |
| 调 API 时 | 参数已合法 | 参数已合法 |

### 核心原则

**不是"放哪层才对"，而是"为什么放这层"。** 参考答案后端强调 domain 零依赖 → 放 presentation。前端强调多入口共享规则 → 放 domain。两种选择都有充分理由——你在做的时候，关键是知道自己选了什么、为什么选。

> **如果培训或 code review 要求统一，改一层 import 路径即可。架构的意义在于你把代码放在了经过思考的位置。**

---

## 项目 1：递进式锁定 → 对照要点

只改了以下文件，其余文件与 day06 完全一致：

| 文件 | 层级 | 改动内容 |
|------|------|---------|
| `domain/user-repository.ts` | domain | `LockStatus` 加 `lockCount` 字段 |
| `infrastructure/database.ts` | infrastructure | `users` 表加 `lock_count` 列 |
| `infrastructure/user-repository-pg.ts` | infrastructure | `getLockStatus` 返回 `lockCount`，`lockAccount` 里 `lock_count + 1`，`resetLockStatus` 归零 |
| `application/login-user.ts` | application | 锁定时间从固定值改为 `durations[lockCount]` 数组 |

**如果你改的层级或文件与此不同，对比一下差异在哪里。**

---

## 项目 2：数据库迁移 → 对照要点

| 文件 | 改动 |
|------|------|
| `database.ts` | `new DatabaseSync()` → `new Pool()` + `pool.query()` |
| `user-repository-pg.ts` | 所有 `db.prepare().run/get/all()` → `pool.query()`，`?` → `$1, $2`，`lastInsertRowid` → `RETURNING id` |

**检查自己**：
- domain、application、presentation 有没有改动？如果改了，说明架构没理解透。
- 改完之后全量功能测试还能跑通吗？

### 验证手段：curl 测试

> **测试前提示**：递进式锁定时长分别为 5/15/30/60 分钟。为快速验证，可以**临时**将 `login-user.ts` 中的 `durations` 改为 `[1, 2, 3, 4]`（单位秒），测试完改回来。

### PostgreSQL 准备

如果本地已有 PostgreSQL，确保创建 `login-v2` 数据库即可。没有的话用 Docker 一键启动：

```bash
docker run -d \
  --name pg-login \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=login-v2 \
  -p 5432:5432 \
  postgres:16
```

连接信息与 `database.ts` 中的默认值完全一致。测试完后：

```bash
docker stop pg-login && docker rm pg-login
```

### 启动后端

```bash
# 0. 前置准备（PostgreSQL 已就绪）
cd backend && npm install && npm start

# === 基础功能测试 ===

# 1. 注册
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"a@b.com"}'
# 预期：{"success":true,"data":{"id":1,...}}

# 2. 正确登录
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# 预期：{"success":true,"data":{"user":{...}}}

# 3. 忘记密码（不存在的邮箱不泄露信息）
curl -s -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@nowhere.com"}'
# 预期：{"success":true,"message":"重置链接已发送到您的邮箱"}

# 4. OAuth 登录
curl -s -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"wechat","code":"test123"}'
# 预期：{"success":true,"data":{"id":2,...}}

# === 递进式锁定验证（用 bob 独立测试） ===

# 5. 注册测试用户 bob
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"123456"}'

# 6. 第一轮：连续 5 次输错 → 第 5 次应提示"锁定5分钟"
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次错误 ---"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"bob","password":"wrong"}'
done
# 预期最后一行：{"success":false,"message":"登录失败次数过多，账户已锁定5分钟"}

# 7. 锁定期间正确密码被拒
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"123456"}'
# 预期：{"success":false,"message":"账户已锁定，请稍后再试"}

# 8. 等待锁定过期（用秒级时限则等几秒），再次输错 5 次 → lockCount 递进
sleep 2
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次错误 ---"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"bob","password":"wrong"}'
done
# 预期最后一行：{"success":false,"message":"登录失败次数过多，账户已锁定15分钟"}
# ↑ 上一轮是 5 分钟，这一轮是 15 分钟——因为过期后继续输错，lockCount 从 1 递进到 2

# 9. 再次过期后输错 → 第三次锁定 30 分钟
sleep 2
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次错误 ---"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"bob","password":"wrong"}'
done
# 预期最后一行：{"success":false,"message":"登录失败次数过多，账户已锁定30分钟"}

# 10. 第四轮 → 60 分钟，之后永远 60 分钟（封顶）
sleep 2
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次错误 ---"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"bob","password":"wrong"}'
done
# 预期最后一行：{"success":false,"message":"登录失败次数过多，账户已锁定60分钟"}

# 11. 只有在登录成功后，lockCount 才归零
sleep 2
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"123456"}'
# 预期：{"success":true,...}  ← 登录成功，lockCount 归零
# 此后如果再输错 5 次，回到 5 分钟从头开始
```

> **关键验证点**：第一轮锁定是"5 分钟"，解锁后第二轮是"15 分钟"——如果两轮都是 5 分钟，说明 `lockCount` 没有生效，检查 `resetLockStatus` 是否归零了 `lockCount`、`lockAccount` 是否递增了 `lockCount`。

---

## 项目 3：uniapp 前端 → 对照要点

参考答案了提供完整的前端实现：

| 文件 | 层级 | 说明 |
|------|------|------|
| `domain/user.ts` | domain | 类型与后端 `User` 完全一致 |
| `domain/schemas.ts` | domain | Zod 校验，hooks 调 API 前先验格式 |
| `application/useLogin.ts` | application | Zod 校验 → `authApi.login()`，锁定倒计时 |
| `application/useRegister.ts` | application | Zod 校验 → `authApi.register()` |
| `application/useForgotPassword.ts` | application | Zod 校验 → `authApi.forgotPassword()` |
| `application/useResetPassword.ts` | application | `authApi.resetPassword()` |
| `application/useAutoLogin.ts` | application | `authApi.autoLogin()`，检查 remember token |
| `application/useOAuth.ts` | application | `authApi.oauthLogin()` |
| `application/useLogout.ts` | application | `authApi.logout()`，清 token |
| `infrastructure/auth-api.ts` | infrastructure | **全项目唯一出现 `uni.request` 的地方** |
| `pages/login/login.vue` | presentation | 登录表单 + 锁定倒计时锁屏 |
| `pages/register/register.vue` | presentation | 注册表单，调 `useRegister` |
| `pages/forgot-password/forgot-password.vue` | presentation | 忘记密码表单，调 `useForgotPassword` |
| `pages/reset-password/reset-password.vue` | presentation | 重置密码表单，调 `useResetPassword` |
| `pages/oauth/oauth.vue` | presentation | 第三方登录，调 `useOAuth` |
| `pages/index/index.vue` | presentation | 登录后首页（像素风终端祝贺页） |

### 如何运行

1. 用 HBuilderX 打开 `uniapp-login/` 目录
2. 确保后端已在 `http://localhost:3000` 启动
3. HBuilderX 菜单 → 运行 → 运行到浏览器 → Chrome

**检查自己**：
- 页面文件（`.vue`）里有没有 `uni.request`？有就要修改。
- `useXxx` hooks 里有没有 `uni.request`？有就要修改。
- `domain/user.ts` 的类型和后端是否一致？
