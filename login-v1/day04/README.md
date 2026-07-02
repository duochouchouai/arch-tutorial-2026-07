# Day 04 — 「加个记住我」

## 场景

> 产品经理：「每次登录都要重新输密码，用户嫌麻烦。加个『记住我』勾选框，勾上以后不用重复登录。」
>
> 你：「简单，登录的时候生成一个 token 存起来，下次自动登录。」

你改了登录接口，加了一张表，加了一个自动登录接口。测试了一下，勾选记住我 → 关掉页面 → 再打开 → 自动登录成功。完美。

---

## 代码变化

### database.js
新增 `remember_tokens` 表：

```javascript
CREATE TABLE IF NOT EXISTS remember_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT
)
```

### main.js
- `/login` 接口多了一个 `rememberMe` 参数，勾选时生成 token 返回前端
- 新增 `/auto-login` 接口：前端拿着 token 来换登录态
- 新增 `/tokens` 调试接口：查看所有记住我令牌

---

## 今天的屎味

### 🔴 token 生成方式和 Day 03 不一致

Day 03 重置令牌用的 `.substring(2)`，Day 04 记得我用的 `.slice(2, 18)`。同一个项目里，**两种生成 token 的风格**——因为两个功能不是同一时间写的，写的人没回头看之前的代码。

```javascript
// day03
const token = Math.random().toString(36).substring(2);

// day04
const token = Math.random().toString(36).slice(2, 18);
```

### 🔴 `/tokens` 调试接口——又一个泄露点

`/users` 泄露用户名密码邮箱还不够，现在又多了一个 `/tokens`，直接暴露了所有用户的「记住我令牌」。攻击者拿到这些 token，可以**直接登录任意用户的账号**。

而且这个接口是谁加的就没人记得——三个调试接口散布在三个不同日期的代码里。

### 🔴 记住我令牌永久有效

token 存到数据库之后，**永远不过期**。用户一年前勾选的「记住我」，今天如果 token 被泄露，仍然可以自动登录。

没有清理机制、没有过期时间、没有撤销逻辑。

### 🔴 又一个调试接口

```javascript
// main.js 底部
app.get('/tokens', (req, res) => { ... });
```

和 `/users` 一样，**没人记得删**。day01 的遗留问题非但没解决，还多了一个同类问题。

### 🔴 `/auto-login` 没有限制

`/auto-login` 可以被暴力枚举——攻击者写个脚本遍历 token 字符串，只要命中一个就能登录。`Math.random()` 只有 ~10^15 种可能，虽然不能秒破，但**没有任何防枚举措施**。

---

## 代码行数

```
database.js:  22 行（+新表）
main.js:     156 行（+41 行）
总计         ~178 行
```

---

## 四天回顾

| 天数 | 新增功能 | main.js 行数 | 数据库表/列 |
|------|---------|-------------|------------|
| Day 01 | 注册 + 登录 | 52 | users |
| Day 02 | 注册加邮箱 | 72 | +email |
| Day 03 | 忘记密码 | 115 | +reset_token |
| Day 04 | 记住我 | 156 | +remember_tokens 表 |

main.js 行数变化：52 → 72 → 115 → 156。**每个新功能加 30-50 行，只增不减。**

---

## 所以现在代码里有什么问题了？

1. ❌ 密码明文存储（Day 01）
2. ❌ SQL 注入（Day 01，至今 Day 04 每个新接口都继续在用）
3. ❌ `/users` 调试接口泄露全部数据（Day 01，没删）
4. 🟡 邮箱校验只查 `@`（Day 02）
5. ❌ 重置令牌 `Math.random()`、无过期（Day 03）
6. 🟡 忘记密码泄露邮箱是否注册（Day 03）
7. ❌ 记住我令牌 `Math.random()`、无过期（Day 04）
8. ❌ `/tokens` 又一个泄露接口（Day 04）
9. 🟡 token 生成方式不一致（Day 03 vs Day 04）

**9 个问题，4 天。**

继续 **Day 05**？
