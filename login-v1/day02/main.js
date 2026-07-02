const express = require('express');
const db = require('./database');

const app = express();
app.use(express.json());

// ============ 用户注册 ============
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  // 简单的邮箱格式检查
  if (email && !email.includes('@')) {
    res.json({ success: false, message: '邮箱格式不正确' });
    return;
  }

  // 查重
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

// ============ 查看所有用户（调试用） ============
app.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// ============ 启动服务器 ============
app.listen(3000, () => {
  console.log('登录服务已启动：http://localhost:3000');
});
