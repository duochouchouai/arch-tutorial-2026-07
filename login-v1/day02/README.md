# Day 02 — 「注册加个邮箱吧」

## 场景

> 产品经理：「后面要做忘记密码功能，注册的时候让用户填一下邮箱吧。」
>
> 你：「行，加上。」

你花了 10 分钟，改了三个地方：数据库加字段、注册接口收邮箱、调试接口也带上。功能跑通了。

就是这么简单的一个改动——**但屎山已经悄悄往前拱了一步。**

---

## 代码变化

### database.js
加了 `email TEXT` 字段：

```diff
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
+   email TEXT
  )
```

### main.js
注册接口加了邮箱参数和一个简单的校验：

```diff
+ if (email && !email.includes('@')) {
+   res.json({ success: false, message: '邮箱格式不正确' });
+   return;
+ }
- db.prepare(`INSERT INTO users ... VALUES ('${username}', '${password}')`)
+ db.prepare(`INSERT INTO users ... VALUES ('${username}', '${password}', '${email || ''}')`)
```

---

## 今天埋了什么坑

### 🟡 邮箱校验只检查了 `@`

```javascript
if (email && !email.includes('@'))
```

没有检查域名部分、没有检查 TLD、甚至 `a@b` 这种非法邮箱也能过。以后做「邮箱找回密码」的时候，可能发不到真正的邮箱——但那是以后的事。

### 🟡 新的 SQL 注入入口

email 字段也用了字符串拼接，等于攻击者又多了一个注入点。

```javascript
`'${email || ''}'`  // 传 "'); DROP TABLE users;--" 就炸了
```

### 🟡 `/users` 接口泄露了更多信息

昨天 `/users` 返回用户名和密码——今天多了 email，**泄露面扩大了**。

### 🟡 数据库迁移问题

`CREATE TABLE IF NOT EXISTS` —— 如果已经跑过 Day 01 的代码，表已经存在了，`email TEXT` 列不会加上去。没有迁移脚本，没有 ALTER TABLE。

**你要手动删掉 login.db 再重跑才能拿到新结构。**

---

## 和 Day 01 对比

| 维度 | Day 01 | Day 02 |
|------|--------|--------|
| 功能 | 用户名+密码注册登录 | 注册支持邮箱 |
| 代码行数 | 65 行 | 72 行 |
| 文件数 | 2 | 2 |
| 密码存储 | ❌ 明文 | ❌ 明文（没动） |
| SQL 注入 | ❌ 拼接 | ❌ 拼接（又多了个入口） |
| 输入校验 | ❌ 无 | 🟡 只查了 @ |
| 安全隐患 | 密码泄露 | 密码泄露 + 邮箱泄露面扩大 |

---

## 这才是真实的屎山生长方式

不是有人在故意写烂代码——**只是每次加一个小功能，顺手用最简单的方式写，下次再加一个，再顺手一次。**

每一轮的改动看起来都「还行」。但积累 7 天回头看，就没人敢动了。

---

**继续 Day 03 吗？**
