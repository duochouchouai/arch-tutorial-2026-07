const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());

// 登录失败计数器
const loginAttempts = {};

// ============ 第三方登录配置（硬编码在代码里）============
const OAUTH_APPS = {
  wechat: {
    appId: 'wx_a1b2c3d4e5f6',
    appSecret: 'wechat_secret_abc123def456',
  },
  qq: {
    appId: 'qq_123456789',
    appSecret: 'qq_secret_xyz789',
  },
};

// ============ 用户注册 ============
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (email && !email.includes('@')) {
    res.json({ success: false, message: '邮箱格式不正确' });
    return;
  }

  const existing = db.prepare(`SELECT id FROM users WHERE username = '${username}'`).get();
  if (existing) {
    res.json({ success: false, message: '用户名已存在' });
    return;
  }

  db.prepare(`INSERT INTO users (username, password, email) VALUES ('${username}', '${password}', '${email || ''}')`).run();

  res.json({ success: true, message: '注册成功' });
});

// ============ 用户登录 ============
app.post('/login', (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (loginAttempts[username] && loginAttempts[username] >= 5) {
    res.json({ success: false, message: '账户已锁定，请30分钟后再试' });
    return;
  }

  const lockedUser = db.prepare(`SELECT locked_until FROM users WHERE username = '${username}'`).get();
  if (lockedUser && lockedUser.locked_until) {
    const lockTime = new Date(lockedUser.locked_until);
    if (new Date() < lockTime) {
      res.json({ success: false, message: '账户已锁定，请稍后再试' });
      return;
    }
  }

  const user = db.prepare(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`).get();

  if (user) {
    loginAttempts[username] = 0;
    db.prepare(`UPDATE users SET locked_until = NULL WHERE id = ${user.id}`).run();

    let token = null;
    if (rememberMe) {
      token = Math.random().toString(36).slice(2, 18);
      db.prepare(`INSERT INTO remember_tokens (user_id, token) VALUES (${user.id}, '${token}')`).run();
    }

    res.json({ success: true, message: '登录成功', userId: user.id, token });
  } else {
    loginAttempts[username] = (loginAttempts[username] || 0) + 1;
    const failCount = loginAttempts[username];

    if (failCount >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      db.prepare(`UPDATE users SET locked_until = '${lockUntil}' WHERE username = '${username}'`).run();

      setTimeout(() => {
        loginAttempts[username] = 0;
        console.log(`[解锁] ${username} 的登录限制已解除（内存）`);
      }, 30 * 60 * 1000);

      res.json({ success: false, message: '登录失败次数过多，账户已锁定30分钟' });
      return;
    }

    res.json({ success: false, message: '用户名或密码错误' });
  }
});

// ============ 微信登录 ============
// 用 code 换 openid 并登录/注册
app.post('/oauth/wechat', (req, res) => {
  const { code } = req.body;

  // 硬编码的微信凭证
  const appId = OAUTH_APPS.wechat.appId;
  const appSecret = OAUTH_APPS.wechat.appSecret;

  console.log(`[微信] 使用 appId=${appId} code=${code} 换取 openid`);

  // 假数据，模拟 openid
  const openid = 'wx_openid_' + (code || 'unknown');

  let user = db.prepare(`SELECT * FROM users WHERE oauth_provider = 'wechat' AND oauth_id = '${openid}'`).get();

  if (!user) {
    // 自动注册微信用户
    db.prepare(`INSERT INTO users (username, password, email, oauth_provider, oauth_id) VALUES ('wechat_${openid}', '', '', 'wechat', '${openid}')`).run();
    user = db.prepare(`SELECT * FROM users WHERE oauth_provider = 'wechat' AND oauth_id = '${openid}'`).get();
  }

  res.json({ success: true, message: '微信登录成功', userId: user.id, username: user.username });
});

// ============ QQ 登录 ============
// 几乎和微信登录一模一样——复制粘贴改个名字
app.post('/oauth/qq', (req, res) => {
  const { code } = req.body;

  // 硬编码的 QQ 凭证
  const appId = OAUTH_APPS.qq.appId;
  const appSecret = OAUTH_APPS.qq.appSecret;

  console.log(`[QQ] 使用 appId=${appId} code=${code} 换取 openid`);

  const openid = 'qq_openid_' + (code || 'unknown');

  let user = db.prepare(`SELECT * FROM users WHERE oauth_provider = 'qq' AND oauth_id = '${openid}'`).get();

  if (!user) {
    db.prepare(`INSERT INTO users (username, password, email, oauth_provider, oauth_id) VALUES ('qq_${openid}', '', '', 'qq', '${openid}')`).run();
    user = db.prepare(`SELECT * FROM users WHERE oauth_provider = 'qq' AND oauth_id = '${openid}'`).get();
  }

  res.json({ success: true, message: 'QQ登录成功', userId: user.id, username: user.username });
});

// ============ 自动登录（通过记住我令牌） ============
app.post('/auto-login', (req, res) => {
  const { token } = req.body;

  const row = db.prepare(`
    SELECT u.id, u.username FROM users u
    JOIN remember_tokens rt ON rt.user_id = u.id
    WHERE rt.token = '${token}'
  `).get();

  if (row) {
    res.json({ success: true, message: '自动登录成功', userId: row.id, username: row.username });
  } else {
    res.json({ success: false, message: '令牌无效，请重新登录' });
  }
});

// ============ 忘记密码 ============
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
  if (!user) {
    res.json({ success: false, message: '该邮箱未注册' });
    return;
  }

  const token = Math.random().toString(36).substring(2);
  db.prepare(`UPDATE users SET reset_token = '${token}' WHERE email = '${email}'`).run();

  console.log('==============================');
  console.log('重置链接: http://localhost:3000/reset-password?token=' + token);
  console.log('==============================');

  res.json({ success: true, message: '重置链接已发送到您的邮箱' });
});

// ============ 重置密码 ============
app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE reset_token = '${token}'`).get();
  if (!user) {
    res.json({ success: false, message: '重置链接无效' });
    return;
  }

  db.prepare(`UPDATE users SET password = '${newPassword}', reset_token = '' WHERE id = ${user.id}`).run();

  res.json({ success: true, message: '密码重置成功' });
});

// ============ 查看所有用户（调试用） ============
app.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// ============ 查看所有记住我令牌（调试用） ============
app.get('/tokens', (req, res) => {
  const tokens = db.prepare(`
    SELECT rt.id, rt.user_id, rt.token, u.username
    FROM remember_tokens rt
    JOIN users u ON u.id = rt.user_id
  `).all();
  res.json(tokens);
});

// ============ 启动服务器 ============
app.listen(3000, () => {
  console.log('登录服务已启动：http://localhost:3000');
});
