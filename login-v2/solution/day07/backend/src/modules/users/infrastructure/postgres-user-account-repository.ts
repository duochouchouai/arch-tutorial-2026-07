/**
 * @file 账号仓储 — PostgreSQL 实现（users 表拥有者）
 * @author 教程组
 *
 * 与 SQLite 实现同一张端口契约（UserAccountRepositoryPort），差异只有两处：
 * 1. 方言：占位符是 $1..$n、DDL 用 SERIAL/BOOLEAN 这类 PG 语法；
 * 2. 连接：由 pg.Pool 管理（pipelines / 重连不用自己写）。
 *
 * 这就是「依赖倒置」的兑现时刻 —— 换数据库只加了一个基础设施文件 +
 * 组合根里一个三元表达式：**domain / application / presentation 零改动**。
 */
import { Pool } from 'pg'
import type { UserAccountRepositoryPort } from '../domain/ports/index'
import { UserRowSchema, type UserRow } from '../domain/schemas/index'

/** 列 → 行字段的唯一映射表（AS 别名即映射，与 SQLite 实现同一份纪律） */
const USER_COLUMNS = `
  id,
  username,
  email,
  phone,
  password_hash AS "passwordHash",
  failed_attempts AS "failedAttempts",
  lock_count AS "lockCount",
  locked_until AS "lockedUntil",
  last_login_at AS "lastLoginAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export class PostgresUserAccountRepository implements UserAccountRepositoryPort {
  readonly #pool: Pool
  /** 建表是一次性的异步准备：每个读写方法先 await 它，避免「第一个请求撞上没建好的表」 */
  readonly #ready: Promise<void>

  constructor(connectionString: string) {
    this.#pool = new Pool({ connectionString })
    this.#ready = this.#migrate()
  }

  /** 等待建表完成（幂等）——供测试/迁移脚本显式调用，业务代码不必管 */
  async migrate(): Promise<void> {
    await this.#ready
  }

  /** 建表即「认领」；真实仓库用迁移链管理，教程用 IF NOT EXISTS 起步 */
  async #migrate(): Promise<void> {
    await this.#pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        lock_count INTEGER NOT NULL DEFAULT 0,
        locked_until BIGINT,
        last_login_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `)
  }

  /** 关闭连接池（进程退出 / 测试收尾） */
  async close(): Promise<void> {
    await this.#pool.end()
  }

  async findByUsername(username: string): Promise<UserRow | null> {
    await this.#ready
    const result = await this.#pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE username = $1`, [username])
    const row: unknown = result.rows[0]
    return row === undefined ? null : UserRowSchema.parse(row)
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    await this.#ready
    const result = await this.#pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [email])
    const row: unknown = result.rows[0]
    return row === undefined ? null : UserRowSchema.parse(row)
  }

  async insert(row: UserRow): Promise<void> {
    await this.#ready
    await this.#pool.query(
      `INSERT INTO users
         (id, username, email, phone, password_hash, failed_attempts, lock_count, locked_until, last_login_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        row.id,
        row.username,
        row.email,
        row.phone,
        row.passwordHash,
        row.failedAttempts,
        row.lockCount,
        row.lockedUntil,
        row.lastLoginAt,
        row.createdAt,
        row.updatedAt,
      ],
    )
  }

  async update(row: UserRow): Promise<void> {
    await this.#ready
    await this.#pool.query(
      `UPDATE users SET
         username = $1, email = $2, phone = $3, password_hash = $4,
         failed_attempts = $5, lock_count = $6, locked_until = $7, last_login_at = $8, updated_at = $9
       WHERE id = $10`,
      [
        row.username,
        row.email,
        row.phone,
        row.passwordHash,
        row.failedAttempts,
        row.lockCount,
        row.lockedUntil,
        row.lastLoginAt,
        row.updatedAt,
        row.id,
      ],
    )
  }
}
