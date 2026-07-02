const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());

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

// ============ 用户登录（支持记住我） ============
app.post('/login', (req, res) => {
  const { username, password, rememberMe } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`).get();

  if (user) {
    let token = null;

    if (rememberMe) {
      token = Math.random().toString(36).slice(2, 18);
      db.prepare(`INSERT INTO remember_tokens (user_id, token) VALUES (${user.id}, '${token}')`).run();
    }

    res.json({ success: true, message: '登录成功', userId: user.id, token });
  } else {
    res.json({ success: false, message: '用户名或密码错误' });
  }
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
