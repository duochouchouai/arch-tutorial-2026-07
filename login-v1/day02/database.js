const Database = require('better-sqlite3');
const db = new Database('login.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT
  )
`);

console.log('数据库已初始化');

module.exports = db;
