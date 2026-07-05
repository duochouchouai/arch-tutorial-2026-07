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
└── uni-login/                  ← 前端参考答案
    ├── package.json
    └── src/
        ├── domain/
        │   └── user.ts
        ├── application/
        │   ├── useLogin.ts
        │   ├── useRegister.ts
        │   └── useForgotPassword.ts
        ├── infrastructure/
        │   └── auth-api.ts            ← uni.request 唯一出现的地方
        └── pages/
            ├── login.vue
            ├── register.vue
            ├── forgot-password.vue
            └── index.vue
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

启动后端后，用以下命令逐项验证：

```bash
# 0. 前置准备（需要本地 PostgreSQL 已启动，数据库 login-v2 已创建）
cd backend && npm install && npm start

# 1. 注册用户
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"a@b.com"}'
# 预期：{"success":true,"data":{"id":1,"username":"alice","email":"a@b.com"}}

# 2. 正确密码登录 — 应成功
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# 预期：{"success":true,"data":{"user":{...},"token":null}}

# 3. 连续 5 次错误密码 → 触发递进式锁定
for i in 1 2 3 4 5; do
  echo "第 $i 次错误:"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"alice","password":"wrong"}'
done
# 预期：第 5 次返回 "账户已锁定5分钟"（第一次锁定是 5 分钟）

# 4. 正确密码登录（锁定中）— 应被拒绝
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456"}'
# 预期：{"success":false,"message":"账户已锁定，请稍后再试"}

# 5. 忘记密码（不存在的邮箱不应泄露信息）
curl -s -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@nowhere.com"}'
# 预期：{"success":true,"message":"重置链接已发送到您的邮箱"}

# 6. OAuth 登录（微信）
curl -s -X POST http://localhost:3000/auth/oauth \
  -H 'Content-Type: application/json' \
  -d '{"provider":"wechat","code":"test123"}'
# 预期：{"success":true,"data":{"id":2,"username":"wechat_...","email":""}}
```

> **递进式锁定验证**：锁定后等 5 分钟过期（或改代码缩短时长），再次输错 5 次密码，应提示"账户已锁定15分钟"——时间按 lockCount 递进。

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
| `pages/login.vue` | presentation | 登录表单，调 `useLogin` |
| `pages/register.vue` | presentation | 注册表单，调 `useRegister` |
| `pages/forgot-password.vue` | presentation | 忘记密码表单，调 `useForgotPassword` |
| `pages/index.vue` | presentation | 登录后首页 |

**检查自己**：
- 页面文件（`.vue`）里有没有 `uni.request`？有就扣分。
- `useXxx` hooks 里有没有 `uni.request`？有就扣分。
- `domain/user.ts` 的类型和后端是否一致？
