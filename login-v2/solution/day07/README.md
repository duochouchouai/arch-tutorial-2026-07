# Day 07 参考答案

>  参考答案的目的是让你对照自己的实现，验证架构分层是否正确。

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
└── uniapp-login/               ← 前端参考答案（HBuilderX 项目）
    ├── manifest.json
    ├── pages.json
    ├── App.vue
    ├── main.js
    ├── uni.scss
    ├── src/
    │   ├── domain/
    │   │   └── user.ts
    │   ├── application/
    │   │   ├── useLogin.ts
    │   │   ├── useRegister.ts
    │   │   └── useForgotPassword.ts
    │   └── infrastructure/
    │       └── auth-api.ts            ← uni.request 唯一出现的地方
    └── pages/
        ├── index/index.vue
        ├── login/login.vue
        ├── register/register.vue
        └── forgot-password/forgot-password.vue
```

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

参考答案提供完整的前端实现：

| 文件 | 层级 | 说明 |
|------|------|------|
| `domain/user.ts` | domain | 类型与后端 `User` 完全一致 |
| `application/useLogin.ts` | application | 调 `authApi.login()`，处理 token 和错误 |
| `application/useRegister.ts` | application | 调 `authApi.register()` |
| `application/useForgotPassword.ts` | application | 调 `authApi.forgotPassword()` |
| `infrastructure/auth-api.ts` | infrastructure | **全项目唯一出现 `uni.request` 的地方** |
| `pages/login/login.vue` | presentation | 登录表单，调 `useLogin` |
| `pages/register/register.vue` | presentation | 注册表单，调 `useRegister` |
| `pages/forgot-password/forgot-password.vue` | presentation | 忘记密码表单，调 `useForgotPassword` |
| `pages/index/index.vue` | presentation | 登录后首页 |

**检查自己**：
- 页面文件（`.vue`）里有没有 `uni.request`？有就扣分。
- `useXxx` hooks 里有没有 `uni.request`？有就扣分。
- `domain/user.ts` 的类型和后端是否一致？
