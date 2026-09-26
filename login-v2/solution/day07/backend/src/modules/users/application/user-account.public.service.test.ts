import { describe, expect, it } from 'vitest'
import type { UserAccountRepositoryPort } from '../domain/ports/index'
import type { UserRow } from '../domain/schemas/index'
import { UserAccountPublicService } from './user-account.public.service'

const ROW: UserRow = {
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  phone: null,
  passwordHash: 'hashed:passw0rd',
  failedAttempts: 0,
  lockCount: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: 1_000,
  updatedAt: 1_000,
}

describe('UserAccountPublicService', () => {
  it('四个方法全部转发到仓储（契约持有者是服务，不是仓储）', async () => {
    const calls: string[] = []
    const repository: UserAccountRepositoryPort = {
      async findByUsername(username) {
        calls.push(`findByUsername:${username}`)
        return ROW
      },
      async findByEmail(email) {
        calls.push(`findByEmail:${email}`)
        return null
      },
      async insert() {
        calls.push('insert')
      },
      async update() {
        calls.push('update')
      },
    }
    const service = new UserAccountPublicService(repository)

    expect(await service.findByUsername('alice')).toEqual(ROW)
    expect(await service.findByEmail('nobody@example.com')).toBeNull()
    await service.insert(ROW)
    await service.update(ROW)

    expect(calls).toEqual(['findByUsername:alice', 'findByEmail:nobody@example.com', 'insert', 'update'])
  })
})
