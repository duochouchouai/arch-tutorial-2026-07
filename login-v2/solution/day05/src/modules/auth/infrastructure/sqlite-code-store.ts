/**
 * @file 验证码存储 — SQLite 实现（auth_codes 表拥有者）
 * @author 教程组
 *
 * 主键是 (purpose, target)：注册码与重置码互不覆盖。
 * 过期行不做后台清理，由 find 时的时间判断兜底（简化说明：真实系统用定时任务清表）。
 */
import type { DatabaseSync } from 'node:sqlite'
import type { CodeStorePort } from '../domain/ports/index'
import { StoredCodeSchema, type StoredCode } from '../domain/schemas/index'

export class SqliteCodeStore implements CodeStorePort {
  readonly #db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.#db = db
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS auth_codes (
        purpose TEXT NOT NULL,
        target TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (purpose, target)
      )
    `)
  }

  async save(purpose: string, target: string, code: string, expiresAt: number): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO auth_codes (purpose, target, code, expires_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(purpose, target) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`,
      )
      .run(purpose, target, code, expiresAt)
  }

  async find(purpose: string, target: string): Promise<StoredCode | null> {
    const row = this.#db
      .prepare(`SELECT code, expires_at AS expiresAt FROM auth_codes WHERE purpose = ? AND target = ?`)
      .get(purpose, target)
    return row === undefined ? null : StoredCodeSchema.parse(row)
  }

  async remove(purpose: string, target: string): Promise<void> {
    this.#db.prepare(`DELETE FROM auth_codes WHERE purpose = ? AND target = ?`).run(purpose, target)
  }
}
