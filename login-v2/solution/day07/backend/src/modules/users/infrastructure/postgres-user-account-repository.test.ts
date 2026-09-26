/**
 * @file PostgreSQL 仓储集成测试 — 需要真实数据库时才跑
 * @author 教程组
 *
 * 运行方式：
 *   DATABASE_URL=postgres://user:pass@localhost:5432/login_test npm test
 * 未提供 DATABASE_URL 时整个文件跳过 —— CI 与本地默认零依赖。
 *
 * 同一套断言也适用于 SQLite 实现（契约一致性的含义：换实现，测试不变）。
 */
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { UserRow } from '../domain/schemas/index'
import { PostgresUserAccountRepository } from './postgres-user-account-repository'

const DATABASE_URL = process.env['DATABASE_URL']

describe.skipIf(DATABASE_URL === undefined)('PostgresUserAccountRepository（集成）', () => {
  const repository = new PostgresUserAccountRepository(DATABASE_URL ?? '')
  /** 清场用独立连接：仓储接口没有「删表/删行」能力（也不该有） */
  const cleanupPool = new Pool({ connectionString: DATABASE_URL ?? '' })

  const SAMPLE: UserRow = {
    id: 'pg-u1',
    username: 'pg-alice',
    email: 'pg-alice@example.com',
    phone: '13800138000',
    passwordHash: 'hashed:passw0rd',
    failedAttempts: 0,
    lockCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
  }

  beforeEach(async () => {
    await repository.migrate()
    await cleanupPool.query('DELETE FROM users WHERE id = $1', [SAMPLE.id])
  })

  afterAll(async () => {
    await repository.close()
    await cleanupPool.end()
  })

  it('insert → findByUsername / findByEmail 往返：字段（含可空列）一个不丢', async () => {
    await repository.insert(SAMPLE)

    expect(await repository.findByUsername('pg-alice')).toEqual(SAMPLE)
    expect(await repository.findByEmail('pg-alice@example.com')).toEqual(SAMPLE)
  })

  it('update：登录后写回失败次数 / 锁定档位 / 登录时间', async () => {
    await repository.insert(SAMPLE)

    await repository.update({ ...SAMPLE, failedAttempts: 4, lockCount: 2, lastLoginAt: 2_000, updatedAt: 2_000 })

    const row = await repository.findByUsername('pg-alice')
    expect(row?.failedAttempts).toBe(4)
    expect(row?.lockCount).toBe(2)
    expect(row?.lastLoginAt).toBe(2_000)
  })

  it('查不到返回 null', async () => {
    expect(await repository.findByUsername('nobody')).toBeNull()
  })
})
