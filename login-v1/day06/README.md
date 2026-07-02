# Day 06 — 「加个微信和QQ登录」

## 场景

> 产品经理：「现在谁还注册账号啊，用户都用微信扫一扫登录。我们加上微信登录和 QQ 登录吧。」
>
> 你：「行，我先接微信，再搞 QQ。」

你参考了微信开放平台的文档，花了一上午接好了微信登录。然后发现 QQ 登录的流程几乎一样——直接把微信的代码复制过来，把 `wechat` 改成 `qq`，换一下 appId，搞定。

两个功能都跑通了，提交了代码。

---

## 代码变化

### database.js
users 表新增两列：

```
oauth_provider TEXT    ← 'wechat' 或 'qq'
oauth_id TEXT          ← 第三方平台的 openid
```

### main.js
- 顶部新增 `OAUTH_APPS` 配置对象——AppId 和 AppSecret **硬编码在代码里**
- 新增两个路由——**微信和 QQ 95% 相同**

---

## 今天的屎味

### 🔴 复制粘贴式开发

微信登录 50 行，QQ 登录 50 行——**95% 相同的代码**。

```javascript
// /oauth/wechat — 50 行
app.post('/oauth/wechat', (req, res) => {
  const { code } = req.body;
  const openid = 'wx_openid_' + (code || 'unknown');
  let user = db.prepare(`SELECT * FROM users WHERE oauth_provider = 'wechat' AND oauth_id = '${openid}'`).get();
  if (!user) {
    db.prepare(`INSERT INTO users ...`).run();
    user = db.prepare(`SELECT * FROM users WHERE ...`).get();
  }
  res.json({ ... });
});

// /oauth/qq — 50 行，把 wechat 改成 qq
app.post('/oauth/qq', (req, res) => {
  const { code } = req.body;
  const openid = 'qq_openid_' + (code || 'unknown');
  // ... 下面完全一样，就是 'wechat' → 'qq'
});
```

以后要加「微博登录」？再复制一份。加「支付宝登录」？再复制一份。
**文件越来越大，但代码信息量一点没增加。**

### 🔴 AppSecret 硬编码在代码里

```javascript
const OAUTH_APPS = {
  wechat: {
    appId: 'wx_a1b2c3d4e5f6',
    appSecret: 'wechat_secret_abc123def456',  // ❌ 明文写在代码里
  },
  qq: {
    appId: 'qq_123456789',
    appSecret: 'qq_secret_xyz789',            // ❌ 明文写在代码里
  },
};
```

如果代码被上传到 GitHub（或者被人拿到服务器权限），**微信和 QQ 的 AppSecret 直接泄露**。攻击者可以用你的 AppSecret 伪造身份、窃取用户数据。

应该放在环境变量或配置中心——但「先跑起来再说」，谁有空搞那个。

### 🔴 `code` 参数直接拼 SQL

```javascript
`... oauth_id = '${openid}'`
```

`openid` 是从 `code` 得来的，而 `code` 是用户传进来的。SQL 注入的又一个入口。

但这还不算——连 `oauth_provider` 都是直接拼 SQL 的。攻击者如果不通过 `/oauth/wechat` 而是直接调接口传 `oauth_provider = ''; DROP TABLE users`——当然这里不是直接拼 provider，但模式是一样的危险。

### 🔴 用户名自动生成——全乱了

微信用户自动生成用户名：`wechat_wx_openid_xxxxx`

QQ 用户自动生成用户名：`qq_openid_xxxxx`

**如果同一个用户同时绑了微信和 QQ，会在数据库里产生两条记录**——管理员不知道这是同一个人。

### 🔴 自动注册没有校验

微信 / QQ 登录时，如果没找到用户就自动注册。但自动注册的**密码是空字符串**——这些用户如果以后想「设置密码」走普通登录，系统没有对应逻辑。

### 🔴 `/users` 接口泄露 OAuth 信息

现在 `/users` 返回的数据里多了 `oauth_provider` 和 `oauth_id`——又多泄露了两个字段。

---

## 代码行数

```
database.js:  24 行（+2 列）
main.js:     285 行（+85 行）
总计         ~309 行
```

---

## 六天回顾

| 天数 | 功能 | main.js 行数 | 路由数 | 突出问题 |
|------|------|-------------|-------|---------|
| Day 01 | 注册 + 登录 | 52 | 3 | 明文密码、SQL 注入 |
| Day 02 | +邮箱字段 | 72 | 3 | 邮箱校验只查@ |
| Day 03 | +忘记密码 | 115 | 5 | Math.random()、无过期 |
| Day 04 | +记住我 | 156 | 7 | 两个调试接口泄露数据 |
| Day 05 | +账户锁定 | 200 | 7 | 双状态不同步、setTimeout |
| Day 06 | +微信+QQ登录 | 285 | 9 | 复制粘贴、AppSecret 硬编码 |

**现在 main.js 9 个路由，285 行。6 天前它只有 52 行。**

---

## 遗留问题清单

1. ❌ 密码明文存储（Day 01）— 6 天没碰
2. ❌ SQL 注入（Day 01）— 每个新接口都在扩大
3. ❌ `/users` 调试接口（Day 01）— 泄露了所有用户的全部字段
4. ❌ `/tokens` 调试接口（Day 04）— 泄露记住我令牌
5. ❌ `Math.random()` 生成 token（Day 03, 04）
6. ❌ 两套锁定状态不同步（Day 05）
7. ❌ AppSecret 硬编码（Day 06）

**7 个问题，没有一个是「今天的需求」，所以一个都没修。**

---

继续 **Day 07（最后一天）**？最后一个功能可以让屎山达到顶峰：**双因素认证（2FA）** 或 **会话管理（多设备登录管理）**。
