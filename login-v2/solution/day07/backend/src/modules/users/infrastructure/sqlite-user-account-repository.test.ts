import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../../shared/index'
import type { UserRow } from '../domain/schemas/index'
import { SqliteUserAccountRepository } from './sqlite-user-account-repository'

const SAMPLE: UserRow = {
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  phone: '13800138000',
  passwordHash: 'hashed:passw0rd',
  failedAttempts: 0,
  lockCount: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: 1_000,
  updatedAt: 1_000,
}

describe('SqliteUserAccountRepository', () => {
  let repository: SqliteUserAccountRepository

  beforeEach(() => {
    repository = new SqliteUserAccountRepository(openDatabase(':memory:'))
  })

  it('insert → findByUsername / findByEmail 往返：字段（含可空列）一个不丢', async () => {
    await repository.insert(SAMPLE)

    expect(await repository.findByUsername('alice')).toEqual(SAMPLE)
    expect(await repository.findByEmail('alice@example.com')).toEqual(SAMPLE)
  })

  it('查不到时返回 null（而不是抛错）', async () => {
    expect(await repository.findByUsername('nobody')).toBeNull()
  })

  it('update 全量覆盖：登录写回的锁定/失败计数可见', async () => {
    await repository.insert(SAMPLE)
    await repository.update({ ...SAMPLE, failedAttempts: 3, lockedUntil: 9_999, lastLoginAt: 2_000, updatedAt: 2_000 })

    const row = await repository.findByUsername('alice')
    expect(row?.failedAttempts).toBe(3)
    expect(row?.lockedUntil).toBe(9_999)
    expect(row?.lastLoginAt).toBe(2_000)
  })

  it('用户名唯一约束由数据库兜底（应用层查重之外的最后防线）', async () => {
    await repository.insert(SAMPLE)
    await expect(repository.insert({ ...SAMPLE, id: 'u2', email: 'other@example.com' })).rejects.toThrow()
  })
})
