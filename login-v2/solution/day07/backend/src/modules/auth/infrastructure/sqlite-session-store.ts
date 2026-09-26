/**
 * @file 会话存储 — SQLite 实现（auth_sessions 表拥有者）
 * @author 教程组
 */
import type { DatabaseSync } from 'node:sqlite'
import type { SessionStorePort } from '../domain/ports/index'
import { StoredSessionSchema, type StoredSession } from '../domain/schemas/index'

export class SqliteSessionStore implements SessionStorePort {
  readonly #db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.#db = db
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)
  }

  async save(token: string, userId: string, expiresAt: number): Promise<void> {
    this.#db
      .prepare(`INSERT INTO auth_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
      .run(token, userId, expiresAt, Date.now())
  }

  async find(token: string): Promise<StoredSession | null> {
    const row = this.#db
      .prepare(`SELECT user_id AS userId, expires_at AS expiresAt FROM auth_sessions WHERE token = ?`)
      .get(token)
    if (row === undefined) {
      return null
    }
    const session = StoredSessionSchema.parse(row)
    // 过期即视为不存在（惰性删除，简化说明同 code store）
    return session.expiresAt <= Date.now() ? null : session
  }

  async remove(token: string): Promise<void> {
    this.#db.prepare(`DELETE FROM auth_sessions WHERE token = ?`).run(token)
  }

  async removeAllForUser(userId: string): Promise<void> {
    this.#db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(userId)
  }
}
