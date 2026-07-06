## 期末大作业评估参考

### 项目 1：递进式锁定

| 检查项 | 通过标准 | 未通过表现 |
|--------|---------|-----------|
| domain 接口先行 | `LockStatus` 新增了 `lockCount` 字段 | 直接在 use case 里计算，跳过了 domain |
| 改动层数 | 改了 domain + infrastructure + application，共 3-4 个文件 | 改了 presentation、shared，或只改了 1 个文件 |
| 锁过期不重置 lockCount | 过期后继续输错，lockCount 递进；只有登录成功才归零 | 过期后自动清零，每次都是同一个锁定时长 |
| durations 在哪里 | 在 application/login-user.ts 里 | 写在 infrastructure 或 database schema 里 |

### 项目 2：数据库迁移

| 检查项 | 通过标准 | 未通过表现 |
|--------|---------|-----------|
| 只改 infrastructure | domain、application、presentation 一行未动 | application 里出现了 `pg.query` 或 SQL 语句 |
| 参数化查询 | `$1, $2, $3` 占位符 | 字符串拼接 SQL |
| RETURNING id | INSERT 后用 `RETURNING id` 获取新 ID | 用 `lastInsertRowid`（SQLite 语法） |
| 可运行 | `npm install && npm start` 能连上 PostgreSQL | 启动报错或数据操作失败 |

### 项目 3：uniapp 前端

| 检查项 | 通过标准 | 未通过表现 |
|--------|---------|-----------|
| pages 不调 authApi | 所有 `.vue` 文件只 import hooks，无 `import authApi` | 页面直接 import authApi 或调 uni.request |
| hooks 不调 uni.request | application 层无 `uni.request` | hook 里出现 uni.request |
| auth-api 唯一入口 | 全项目 `uni.request` 只出现在 infrastructure/auth-api.ts | 多个文件有 uni.request |
| domain 类型一致 | `src/domain/user.ts` 字段与后端 `domain/user.ts` 一致 | 缺少字段、类型不匹配 |
| TypeScript | 所有 `.ts` 和 `<script setup lang="ts">` | 存在 `.js` 文件 |
| 至少 3 个页面 | login、register、forgot-password 可访问 | 少于 3 个或路由未注册 |
| pages.json 启动页 | 第一个页面是 login | 第一个页面是 index（绕过登录） |

### git 规范

| 检查项 | 通过标准 | 未通过表现 |
|--------|---------|-----------|
| 分支来源 | 从 develop 创建 | 从 main 或其他分支创建 |
| PR 目标 | 往 develop 提 PR | 往 main 或其他分支提 |
| comparing changes | 写明了改了多少文件、哪些层、为什么 | 空白或无意义的 "fix" |

---

### PR Comment 模板

```
## 评估结果

### 项目 1：递进式锁定 [通过 / 需修改]

- domain 接口：{是否先行}
- 改动层级：{改了几层，是否多余}
- 锁定逻辑：{过期后 lockCount 是否正确}
- durations 位置：{是否在 application 层}

### 项目 2：数据库迁移 [通过 / 需修改]

- 改动范围：{是否只改了 infrastructure}
- SQL 安全：{是否有参数化查询}
- pg 语法：{RETURNING 是否正确}

### 项目 3：uniapp 前端 [通过 / 需修改]

- 架构合规：{pages 是否越级调 authApi}
- uni.request 位置：{是否只出现在 auth-api.ts}
- 页面数量：{是否 ≥ 3 个}
- 启动页：{pages.json 第一项是否是 login}
- 类型一致：{domain/user.ts 是否与后端一致}

### git 规范 [通过 / 需修改]

- 分支：{从 develop 创建，PR 到 develop}
- comparing changes：{是否写清楚了改动分析}

### 总结

{通过项数} / 7 项通过。

{一句话评价，指出最大的亮点和最需要改进的地方}
```
