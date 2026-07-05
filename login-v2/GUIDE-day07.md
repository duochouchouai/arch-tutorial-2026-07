# GUIDE-day07 — 期末大作业

> 恭喜你完成了 day01~day06 的手打学习。今天不再有 Step 1/2/3——只有需求描述。你可以结合AI，自己判断"改哪一层、改几个文件"。

---

## 🎯 操作规范

1. 从 `develop` 创建你自己的分支（命名为 `feat/yourname`）
2. 完成后 PR 到远程 `develop`
3. 阐明 PR 的 **comparing changes** 

---

## 📋 作业内容

| 项目 | 内容 | 
|------|------|
| 项目 1 | 后端需求变更：递进式锁定 |
| 项目 2 | 后端数据库迁移：SQLite → PostgreSQL |
| 项目 3 | uniapp 前端：对接后端接口，清洁架构分层，UI 不计分 | 

---

## 🎯 项目 1：递进式锁定

> 产品经理：「目前的锁定策略太简单了——输错 5 次锁 30 分钟，每次都是 30 分钟。改成递进式：第一次锁 5 分钟，第二次锁 15 分钟，第三次锁 30 分钟，第四次及以上锁 60 分钟。登录成功后归零重新计算。」

请以 day06 代码为起点完成。

**完成标准**：

| 标准 | 要求 |
|------|---------|
| 依赖倒置 | 从 domain 接口开始，再改 infrastructure，最后改 application |
| 层级正确 | 只改了该改的层，没有在不该动的层里加代码 |
| 改动量小 | 每个文件改动精炼，没有大段复制粘贴 |


---

## 🗄️ 项目 2：数据库迁移 SQLite → PostgreSQL

**背景**：day01~06 使用的是 Node.js 内置 `node:sqlite`，我们实际的项目技术栈用的是 **PostgreSQL（pgsql）**。现在需要接入 pg。

**你需要做的**：

1. 安装 `pg` 包（PostgreSQL Node.js 驱动）：`npm install pg @types/pg`
2. 改写 `database.ts`：用 `pg` 的 `Pool` 替代 `node:sqlite` 的 `DatabaseSync`
3. 改写 `user-repository-sqlite.ts`：SQL 语法从 SQLite 切换到 PostgreSQL（参数占位符 `?` → `$1`，文件改名 `user-repository-pg.ts`）

**完成标准**：

| 标准 | 要求 |
|------|---------|
| 依赖倒置 | **domain、application、presentation 层一行都不能改** |
| 改动隔离 | 只改 infrastructure 层的 2 个文件 |
| SQL 安全 | 继续使用参数化查询（`$1`, `$2`），不是字符串拼接 |



---

## 📱 项目 3：uniapp 前端

用 uniapp 搭建前端，对接你的后端。**用 TypeScript，并按照清洁架构分层。**


### 页面最低要求

至少完成 3 个页面：

- 注册页面（`register.vue`）
- 登录页面（`login.vue`）
- 忘记密码页面（`forgot-password.vue`）

自动登录、OAuth 登录、退出登录、重置密码等功能**只需在 infrastructure 和 application 层封装好接口**。


---

## 📦 提交

### git 流程

```bash
git checkout develop
git checkout -b feat/yourname
git add .
git commit -m "在这里填入你的工作"
git push origin feat/yourname
# 在 GitHub 上创建 PR 到 develop
```

### 提交前请检查

- [ ] 分支从 `develop` 创建，并 PR 到 `develop`，**不要搞错分支**
- [ ] 已写明 comparing changes 
- [ ] 后端测试通过
- [ ] 前端注册、登录、忘记密码三个页面能跑通


### 仓库结构

```
仓库根目录/
├── login-v2/          
│   └── day07/         ← 你的后端代码（从 day06 复制起步）
└── uni-login/         ← uniapp 前端
```

---

## 💡 提示

- 前端不用一次写完所有 hook——先做 login 和 register，逻辑一样就能类推
- 递进式锁定改动顺序：domain → infrastructure → application，不要跳过 domain
- 每个 commit 之后用 `git diff --stat` 数一下改了几个文件——这正是 comparing changes 要写的内容

---

## 🔍 参考答案

> **没有思路了可以查看 solution/day07/ 的参考答案**

```
login-v2/solution/day07/
├── backend/          ← 后端
└── uni-login/        ← 前端
```
