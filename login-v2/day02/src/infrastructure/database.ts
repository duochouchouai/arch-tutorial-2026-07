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
            reset_token_expires_at TEXT
            )
        `);

        console.log('数据库已初始化')
    }
    return db;
}