# Day 07 参考答案

> **请在完成作业后查看。** 参考答案的目的是让你对照自己的实现，验证架构分层是否正确。

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
└── uni-login/                  ← 前端参考答案（完整实现）
    ├── package.json
    └── src/
        ├── domain/
        │   └── user.ts                ← 与后端完全一致
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
            └── index.vue              ← 登录后首页
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

---

## 项目 3：uniapp 前端 → 对照要点

参考答案提供完整的前端实现，包含以下文件：

| 文件 | 层级 | 关键点 |
|------|------|--------|
| `domain/user.ts` | domain | 类型与后端 `User` 完全一致 |
| `application/useLogin.ts` | application | 调 `authApi.login()`，处理 token 存储和错误 |
| `application/useRegister.ts` | application | 调 `authApi.register()` |
| `application/useForgotPassword.ts` | application | 调 `authApi.forgotPassword()` |
| `infrastructure/auth-api.ts` | infrastructure | 封装所有 `uni.request` 调用，**全项目唯一出现 `uni.request` 的地方** |
| `pages/login.vue` | presentation | 登录表单，调 `useLogin` hook |
| `pages/register.vue` | presentation | 注册表单，调 `useRegister` hook |
| `pages/forgot-password.vue` | presentation | 忘记密码表单，调 `useForgotPassword` hook |
| `pages/index.vue` | presentation | 登录后首页 |

**检查自己**：
- 页面文件（`.vue`）里有没有 `uni.request`？有就扣分。
- `useXxx` hooks 里有没有 `uni.request`？有就扣分。
- `domain/user.ts` 的类型和后端是否一致？
