import { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync | null = null;

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
              reset_token_expires_at TEXT,
              failed_attempts INTEGER NOT NULL DEFAULT 0,
              locked_until TEXT,
              oauth_provider TEXT,
              oauth_id TEXT
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

        console.log('数据库已初始化')
    }
    return db;
}