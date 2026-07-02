import { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync | null = null;

/**
 * 获取数据库连接（单例）
 *
 * 使用 Node.js 22+ 内置的 node:sqlite 模块，零外部依赖。
 * 所有 repository 共用一个连接实例。
 */
export function getDatabase(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync('login-v2.db');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        hashed_password TEXT NOT NULL,
        reset_token TEXT,
        reset_token_expires_at TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS remember_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL
      )
    `);

    console.log('数据库已初始化');
  }
  return db;
}
