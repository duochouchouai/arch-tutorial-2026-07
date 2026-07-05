# GUIDE-day07 — 期末大作业

> 恭喜你完成了 day01~day06 的手打学习。今天不再有 Step 1/2/3——只有需求描述。你需要自己判断"改哪一层、改几个文件"。

---

## 🎯 要求

1. 从 `develop` 创建你自己的分支（命名为 `feat/yourname`）
2. 完成后 PR 到远程 `develop`
3. 阐明 PR 的 **comparing changes** 

---

## 📋 作业内容

| 项目 | 内容 | 
|------|------|
| 后端需求变更 | 1 个业务需求：递进式锁定 |
| uniapp 前端 | 对接后端接口，清洁架构分层，不考虑 UI 设计 | 

---

## 🎯 项目 1：递进式锁定（50 分）

> 产品经理：「目前的锁定策略太简单了——输错 5 次锁 30 分钟，每次都是 30 分钟。改成递进式：第一次锁 5 分钟，第二次锁 15 分钟，第三次锁 30 分钟，第四次及以上锁 60 分钟。登录成功后归零重新计算。」

以 day06 代码为起点完成。**你需要在 git commit 时记录思考和改动**。

**评分标准**：

| 标准 | 满分要求 |
|------|---------|
| 依赖倒置 | 从 domain 接口开始，再改 infrastructure，最后改 application |
| 层级正确 | 只改了该改的层，没有在不该动的层里加代码 |
| 改动量小 | 每个文件改动精炼，没有大段复制粘贴 |
| git commit | 至少 2 次有意义的 commit，message 描述清晰 |

---

## 📱 项目 2：uniapp 前端（50 分）

用 uniapp 搭建前端，对接你的后端。**必须用 TypeScript，必须按清洁架构分层。**

### 目录结构（必须遵守）

```
uni-login/
├── src/
│   ├── domain/              ← User 类型定义（和后端 domain/user.ts 完全一致）
│   │   └── user.ts
│   │
│   ├── application/         ← useXxx() hooks（调 authApi，不调 uni.request）
│   │   ├── useRegister.ts
│   │   ├── useLogin.ts
│   │   ├── useForgotPassword.ts
│   │   └── useAutoLogin.ts
│   │
│   ├── infrastructure/      ← uni.request 唯一出现的地方！
│   │   └── auth-api.ts      ← 封装所有 /auth/* 接口调用
│   │
│   └── pages/               ← presentation（只调 hooks，不调 uni.request）
│       ├── login.vue
│       ├── register.vue
│       └── forgot-password.vue
│
└── package.json
```

### uniapp 注意事项

uniapp 写的是 `.ts` 和 `.vue` 文件，**运行时需要先编译成 `.js`** 才能在模拟器或真机上跑。你要确保：

1. 项目里正确配置了 `manifest.json` 和 `pages.json`
2. `npm run dev:mp-weixin`（或对应平台命令）能成功编译
3. 编译之后的产物是 `.js`，但提交到仓库的**必须是 `.ts` 源码**——不要提交编译产物

### 架构硬约束

1. **`uni.request` 只能出现在 `infrastructure/auth-api.ts`** — 其他地方出现直接扣 15 分
2. **页面只能调 hooks，不能调 auth-api** — 调了直接扣 15 分
3. **domain/user.ts 的类型必须和后端完全一致** — 不一致扣 10 分
4. **TypeScript 必用** — `.js` 文件扣 10 分（编译产物除外）

### 页面最低要求

至少完成 3 个页面：

- 注册页面（`register.vue`）
- 登录页面（`login.vue`）
- 忘记密码页面（`forgot-password.vue`）

自动登录、OAuth 登录、退出登录、重置密码等功能**只需在 infrastructure 和 application 层封装好接口**，页面不做不扣分。

### UI 不计分

- 裸 `<input>` + `<button>` 完全接受
- 不做 CSS、不做布局、不做美化
- 只看**架构分层是否正确**

---

## 📦 提交要求

### git 流程

```bash
git checkout develop
git checkout -b feat/day07-你的姓名
# ... 完成需求 1 和需求 2，至少 3 次有意义的 commit ...
git push -u origin feat/day07-你的姓名
# 在 GitHub 上创建 PR 到 develop
```

### 提交前检查

- [ ] 分支从 `develop` 创建，已 PR 到 `develop`
- [ ] comparing changes 写清楚了：改了哪些文件、哪些层、为什么
- [ ] 后端递进式锁定手动测试通过
- [ ] 前端注册、登录、忘记密码三个页面能跑通
- [ ] uni.request 只出现在 auth-api.ts

### 仓库结构

```
仓库根目录/
├── login-v2/          ← 后端（含递进式锁定）
│   └── day07/         ← 你的代码（从 day06 复制起步）
└── uni-login/         ← uniapp 前端
```

---

## 🔍 参考答案

> **请在完成作业后查看。**

```
login-v2/solution/day07/
├── backend/          ← 递进式锁定后的后端答案
└── uni-login/        ← 前端关键文件（domain + hooks + auth-api 封装）
```

参考答案不包含完整 `.vue` 页面——只给分层关键代码。

---

## 💡 提示

- 前端不用一次写完所有 hook——先做 login 和 register，逻辑一样就能类推
- 递进式锁定改动顺序：domain → infrastructure → application，不要跳过 domain
- 每个 commit 之后用 `git diff --stat` 数一下改了几个文件——这正是 comparing changes 要写的内容
