import { describe, expect, it } from 'vitest'
import { FakeTimeProvider } from '../../../../../tests/support/fakes'
import { LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS } from '../constants'
import { UserEntity } from './user.entity'

function createUser(time: FakeTimeProvider): UserEntity {
  return UserEntity.createEmailUser(
    { id: 'u1', username: 'alice', email: 'alice@example.com', phone: null, passwordHash: 'hashed' },
    time,
  )
}

describe('UserEntity', () => {
  it('createEmailUser：初始状态 + 时间戳来自注入的时钟', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    expect(user.failedAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
    expect(user.lastLoginAt).toBeNull()
    expect(user.createdAt).toBe(1_000)
    expect(user.updatedAt).toBe(1_000)
  })

  it('recordLogin：失败计数与锁定清零，lastLoginAt 取注入时钟', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    user.recordFailedLogin()
    expect(user.failedAttempts).toBe(1)

    time.advance(500)
    user.recordLogin()
    expect(user.failedAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
    expect(user.lastLoginAt).toBe(1_500)
    expect(user.updatedAt).toBe(1_500)
  })

  it(`第 ${MAX_FAILED_ATTEMPTS} 次失败触发锁定，时长为 ${LOCK_DURATION_MS / 60000} 分钟`, () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    expect(user.lockedUntil).toBe(1_000 + LOCK_DURATION_MS)
    expect(user.isLockedAt(1_000)).toBe(true)
  })

  it('isLockedAt：锁定到期即不再是锁定态（判据用传入的时间，不看环境）', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    expect(user.isLockedAt(1_000 + LOCK_DURATION_MS - 1)).toBe(true)
    expect(user.isLockedAt(1_000 + LOCK_DURATION_MS)).toBe(false)
  })

  it('fromData / toRow 桥接：往返不丢字段', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    user.recordFailedLogin()
    const row = user.toRow()

    const restored = UserEntity.fromData(row, time)
    expect(restored.toRow()).toEqual(row)
  })

  it('toSnapshot 只暴露对外字段（没有 passwordHash / failedAttempts）', () => {
    const time = new FakeTimeProvider(1_000)
    const snapshot = createUser(time).toSnapshot()
    expect(Object.keys(snapshot).sort()).toEqual(['email', 'id', 'phone', 'username'])
  })
})
