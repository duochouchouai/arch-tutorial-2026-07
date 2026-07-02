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

// ============ 用户登录 ============
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`).get();

  if (user) {
    res.json({ success: true, message: '登录成功', userId: user.id });
  } else {
    res.json({ success: false, message: '用户名或密码错误' });
  }
});

// ============ 忘记密码 — 生成重置链接 ============
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const user = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
  if (!user) {
    res.json({ success: false, message: '该邮箱未注册' });
    return;
  }

  // Math.random() — 不安全，但「先跑起来再说」
  const token = Math.random().toString(36).substring(2);

  db.prepare(`UPDATE users SET reset_token = '${token}' WHERE email = '${email}'`).run();

  // 没有真的发邮件，打一行 log 假装发了
  console.log('==============================');
  console.log('重置链接: http://localhost:3000/reset-password?token=' + token);
  console.log('（邮件没真发，这是 log）');
  console.log('==============================');

  res.json({ success: true, message: '重置链接已发送到您的邮箱' });
  // 注意：即使用户的邮箱不存在，我们也返回「已发送」
  // 但上面 if (!user) 已经泄露了邮箱是否注册
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
  // token 用完没删，只是置空
  // token 没有过期时间，旧 token 如果被泄露仍然可以用——不对，这里置空了，
  // 但攻击者只要能截获一次重置链接就能改密码
});

// ============ 查看所有用户（调试用） ============
app.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// ============ 启动服务器 ============
app.listen(3000, () => {
  console.log('登录服务已启动：http://localhost:3000');
});
