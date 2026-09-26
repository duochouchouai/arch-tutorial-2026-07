/**
 * @file 账号仓储 — SQLite 实现（users 表拥有者）
 * @author 教程组
 *
 * 表归属：users 表的 DDL、以及全项目唯一允许出现 `INSERT INTO users` / `UPDATE users`
 * 的地方，就是本文件。架构守卫测试第 3 条会全量扫描源码盯住这条纪律。
 *
 * 两个边界纪律：
 * 1. DB 读取是跨边界 —— 行数据一律经 UserRowSchema.parse() 再进领域，不做 `as` 断言；
 * 2. snake_case → camelCase 由 SQL 的 AS 别名完成，代码里不出现手写映射表
 *    （列名改了、别名没改，parse 会当场炸，而不是静默错位）。
 */
import type { DatabaseSync } from 'node:sqlite'
import type { UserAccountRepositoryPort } from '../domain/ports/index'
import { UserRowSchema, type UserRow } from '../domain/schemas/index'

/** 列 → 行字段的唯一映射表（AS 别名即映射） */
const USER_COLUMNS = `
  id,
  username,
  email,
  phone,
  password_hash AS passwordHash,
  failed_attempts AS failedAttempts,
  lock_count AS lockCount,
  locked_until AS lockedUntil,
  last_login_at AS lastLoginAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`

export class SqliteUserAccountRepository implements UserAccountRepositoryPort {
  readonly #db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.#db = db
    // 建表即「认领」：DDL 与拥有者模块同文件，表归属在代码里可见。
    // 简化说明：真实仓库用迁移链（migrations）管理表结构，教程用 IF NOT EXISTS 起步。
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        lock_count INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER,
        last_login_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  async findByUsername(username: string): Promise<UserRow | null> {
    const row = this.#db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`).get(username)
    return row === undefined ? null : UserRowSchema.parse(row)
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const row = this.#db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).get(email)
    return row === undefined ? null : UserRowSchema.parse(row)
  }

  async insert(row: UserRow): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO users
           (id, username, email, phone, password_hash, failed_attempts, lock_count, locked_until, last_login_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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
      )
  }

  async update(row: UserRow): Promise<void> {
    this.#db
      .prepare(
        `UPDATE users SET
           username = ?, email = ?, phone = ?, password_hash = ?,
           failed_attempts = ?, lock_count = ?, locked_until = ?, last_login_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
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
      )
  }
}
