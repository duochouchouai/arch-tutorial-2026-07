import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * 获取 PostgreSQL 连接池（单例）
 *
 * 替换 day01~06 的 node:sqlite 内置模块。
 * 使用 pg 驱动连接本地 PostgreSQL。
 * 所有 repository 共用一个连接池实例。
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT) || 5454,
      database: process.env.PG_DATABASE || 'login-v2',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
    });

    console.log('PostgreSQL 连接池已创建');
  }
  return pool;
}

/**
 * 初始化数据库表结构
 */
export async function initDatabase(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      hashed_password TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires_at TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      lock_count INTEGER NOT NULL DEFAULT 0,
      oauth_provider TEXT,
      oauth_id TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS remember_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    )
  `);

  console.log('数据库表已初始化');
}
