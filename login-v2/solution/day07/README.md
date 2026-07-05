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

> **测试前提示**：递进式锁定时长分别为 5/15/30/60 分钟。为快速验证，可以**临时**将 `login-user.ts` 中的 `durations` 改为 `[1, 2, 3, 4]`（单位秒），测试完改回来。

```bash
# 0. 前置准备（需要本地 PostgreSQL 已启动，数据库 login-v2 已创建）
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

# 8. 等待锁定过期（改成秒级时限后只等几秒），正确密码登录 → 成功并重置 lockCount
sleep 2
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"123456"}'
# 预期：{"success":true,"data":{"user":{...}}}  ← 登录成功，lockCount 归零

# 9. 第二轮：再次连续 5 次输错 → 这次应提示"锁定15分钟"
for i in 1 2 3 4 5; do
  echo "--- 第 $i 次错误 ---"
  curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"bob","password":"wrong"}'
done
# 预期最后一行：{"success":false,"message":"登录失败次数过多，账户已锁定15分钟"}
# ↑ 时间从 5 → 15，证明 lockCount 在递进
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
| `pages/login.vue` | presentation | 登录表单，调 `useLogin` |
| `pages/register.vue` | presentation | 注册表单，调 `useRegister` |
| `pages/forgot-password.vue` | presentation | 忘记密码表单，调 `useForgotPassword` |
| `pages/index.vue` | presentation | 登录后首页 |

**检查自己**：
- 页面文件（`.vue`）里有没有 `uni.request`？有就扣分。
- `useXxx` hooks 里有没有 `uni.request`？有就扣分。
- `domain/user.ts` 的类型和后端是否一致？
