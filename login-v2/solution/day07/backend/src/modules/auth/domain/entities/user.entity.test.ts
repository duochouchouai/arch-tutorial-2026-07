import { describe, expect, it } from 'vitest'
import { FakeTimeProvider } from '../../../../../tests/support/fakes'
import { MAX_FAILED_ATTEMPTS, lockDurationFor } from '../constants'
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
    expect(user.lockCount).toBe(0)
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
    expect(user.lockCount).toBe(0)
    expect(user.lockedUntil).toBeNull()
    expect(user.lastLoginAt).toBe(1_500)
    expect(user.updatedAt).toBe(1_500)
  })

  it(`第 ${MAX_FAILED_ATTEMPTS} 次失败触发锁定：首次锁定时长 = 阶梯第一档（${lockDurationFor(1) / 60000} 分钟）`, () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    expect(user.lockCount).toBe(1)
    expect(user.lockedUntil).toBe(1_000 + lockDurationFor(1))
    expect(user.isLockedAt(1_000)).toBe(true)
  })

  it('锁定生效时失败计数归零（下一轮从零攒，攒满即进入下一档）', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    expect(user.failedAttempts).toBe(0)
  })

  it('递进式锁定：1→5、2→15、3→30、4 起 60 分钟封顶', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    const observed: number[] = []
    for (let round = 0; round < 5; round += 1) {
      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
        user.recordFailedLogin()
      }
      observed.push((user.lockedUntil ?? 0) - time.now())
      // 解锁后进入下一轮（时间推进到锁定到期之后）
      time.advance((user.lockedUntil ?? 0) - time.now())
    }
    expect(observed).toEqual([
      5 * 60_000,
      15 * 60_000,
      30 * 60_000,
      60 * 60_000,
      60 * 60_000, // 第 5 次被锁仍封顶 60 分钟
    ])
    expect(user.lockCount).toBe(5)
  })

  it('changePassword：换哈希并解锁（改密即账号主人操作，顺带清失败计数）', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    time.advance(1_000)

    user.changePassword('hashed:new-pass')

    expect(user.passwordHash).toBe('hashed:new-pass')
    expect(user.failedAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
    expect(user.isLockedAt(time.now())).toBe(false)
    expect(user.updatedAt).toBe(2_000)
    // 档位不清零：改密解除锁定，但「被锁过几次」的历史留着（后续再锁仍按累计档位）
    expect(user.lockCount).toBe(1)
  })

  it('isLockedAt：锁定到期即不再是锁定态（判据用传入的时间，不看环境）', () => {
    const time = new FakeTimeProvider(1_000)
    const user = createUser(time)
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      user.recordFailedLogin()
    }
    expect(user.isLockedAt(1_000 + lockDurationFor(1) - 1)).toBe(true)
    expect(user.isLockedAt(1_000 + lockDurationFor(1))).toBe(false)
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
