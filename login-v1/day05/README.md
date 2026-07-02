# Day 05 — 「防爆破，锁账户」

## 场景

> 安全部门：「我们的登录接口没有任何防爆破措施。攻击者可以无限尝试密码，弱口令账户一天之内就会被撞库。」
>
> 产品经理：「加个限制——连续输错 5 次就锁 30 分钟。」
>
> 你：「行，加上了。」

你 15 分钟写完了这个功能——登录时判断失败次数，超过阈值就锁住。跑了一下，确实锁了，解锁也正常。搞定。

---

## 代码变化

### database.js
users 表新增 `locked_until TEXT` 列。

### main.js

在 login handler 开头加了锁定检测，末尾加了失败计数：

```javascript
// 顶部 — 全局内存计数器
const loginAttempts = {};

// handler 内部 — 分了三段
// 第 1 段：查内存计数器          ← 新加
if (loginAttempts[username] >= 5) { ... }

// 第 2 段：原有登录逻辑          ← 之前就有的
const user = db.prepare(`SELECT ...`).get();

// 第 3 段：登录失败 → 更新计数器  ← 新加（散落在 handler 底部）
loginAttempts[username] = (loginAttempts[username] || 0) + 1;
```

---

## 今天的屎味

### 🔴 两套锁定状态，互不同步

```
内存：loginAttempts[username]    — 进程重启就清零
数据库：users.locked_until       — 持久化
```

如果进程重启，`loginAttempts` 归零但 `locked_until` 还在库里。用户可能被「永久锁定」——库里有锁但内存没计数，或者反过来。

**同一个功能，两套存储，没有一致性保证。**

### 🔴 `setTimeout` 解锁——炸了就炸了

```javascript
setTimeout(() => {
  loginAttempts[username] = 0;
}, 30 * 60 * 1000);
```

如果 `setTimeout` 执行前进程崩溃重启——内存里的计数器归零了，但数据库里的 `locked_until` 还在。用户得等到 30 分钟数据库里的锁到期才能登录。

**30 分钟的 `setTimeout` 不持久化——这在生产环境就是事故。**

### 🔴 业务逻辑和安全逻辑深度耦合

一个 `/login` handler 里现在混着：

1. 锁定检测（内存 + 数据库）
2. 密码验证
3. 失败计数 + 锁定写入
4. `setTimeout` 定时解锁
5. 记住我 token 生成

五个职责揉在一个函数里。以后改密码策略、改锁定策略、改记住我逻辑——**改一行动全身。**

### 🔴 返回「账户已锁定」泄露信息

```javascript
res.json({ success: false, message: '账户已锁定，请30分钟后再试' });
```

攻击者通过这个返回信息知道**这个用户名是真实存在的**——可以用来枚举有效用户。

### 🔴 只锁用户名，没锁 IP

计数器以 `username` 为 key。攻击者可以**换一批用户名继续试**，单个用户名的 5 次限制对爆破来说几乎形同虚设。

---

## 代码行数

```
database.js:  23 行（+locked_until）
main.js:     200 行（+44 行）
总计         ~223 行
```

---

## 五天回顾

| 天数 | main.js 行数 | 数据库对象 | 调试接口 | 安全问题累计 |
|------|-------------|-----------|---------|------------|
| Day 01 | 52 | 1 表 | /users | 3 |
| Day 02 | 72 | 1 表 3 列 | /users | 4 |
| Day 03 | 115 | 1 表 4 列 | /users | 7 |
| Day 04 | 156 | 2 表 | /users + /tokens | 9 |
| Day 05 | 200 | 2 表 5 列 | /users + /tokens | 12 |

main.js 已经 **200 行**，`/login` handler 自己就占了 ~70 行，里面嵌套了锁定检测、密码校验、记住我生成、定时解锁四条逻辑线。**改一行，三条线可能受影响。**

---

## 五天没修过的东西

1. ❌ 密码明文存储（Day 01）— 5 天没动
2. ❌ SQL 注入（Day 01）— 每个新接口继续在用
3. ❌ `/users` 没删（Day 01）— 5 天没动
4. 🟡 `Math.random()` token（Day 03）— Day 04 又用了一次
5. ❌ 没有外键约束（Day 04）— remember_tokens 的 user_id 没人校验

---

继续 **Day 06**？
