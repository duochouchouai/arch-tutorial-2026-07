import { describe, expect, it } from 'vitest'
import {
  FakeIdGenerator,
  FakePasswordHasher,
  FakeTimeProvider,
  InMemorySessionStore,
  InMemoryUserAccountStore,
} from '../../../../tests/support/fakes'
import { LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS, SESSION_TTL_MS } from '../domain/constants'
import { AccountLockedError, InvalidCredentialsError } from '../domain/errors/index'
import { UserEntity } from '../domain/entities/index'
import { LoginUseCase } from './login.usecase'

const START = 1_000

function build() {
  const time = new FakeTimeProvider(START)
  const userAccount = new InMemoryUserAccountStore()
  const sessionStore = new InMemorySessionStore()
  const useCase = new LoginUseCase({
    userAccount,
    timeProvider: time,
    idGenerator: new FakeIdGenerator(),
    passwordHasher: new FakePasswordHasher(),
    sessionStore,
  })
  userAccount.rows.set(
    'u1',
    UserEntity.createEmailUser(
      { id: 'u1', username: 'alice', email: 'alice@example.com', phone: null, passwordHash: 'hashed:passw0rd' },
      time,
    ).toRow(),
  )
  return { time, userAccount, sessionStore, useCase }
}

describe('LoginUseCase', () => {
  it('密码正确：会话入库（TTL=配置常数）、登录信息写回、失败计数清零', async () => {
    const { userAccount, sessionStore, useCase } = build()

    const result = await useCase.execute({ username: 'alice', password: 'passw0rd' })

    expect(result.user.username).toBe('alice')
    expect(sessionStore.sessions.get(result.token)).toEqual({ userId: 'u1', expiresAt: START + SESSION_TTL_MS })
    expect(userAccount.rows.get('u1')?.lastLoginAt).toBe(START)
    expect(userAccount.rows.get('u1')?.failedAttempts).toBe(0)
  })

  it('密码错误：抛统一错误 + 失败计数 +1', async () => {
    const { userAccount, useCase } = build()

    await expect(useCase.execute({ username: 'alice', password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
    expect(userAccount.rows.get('u1')?.failedAttempts).toBe(1)
  })

  it('账号不存在：与密码错误完全相同的错误（防枚举）', async () => {
    const { useCase } = build()

    await expect(useCase.execute({ username: 'nobody', password: 'passw0rd' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    )
  })

  it(`连续失败 ${MAX_FAILED_ATTEMPTS} 次锁定；锁定期间正确密码也被拒`, async () => {
    const { userAccount, useCase } = build()

    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await expect(useCase.execute({ username: 'alice', password: 'wrong' })).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      )
    }
    expect(userAccount.rows.get('u1')?.lockedUntil).toBe(START + LOCK_DURATION_MS)

    await expect(useCase.execute({ username: 'alice', password: 'passw0rd' })).rejects.toBeInstanceOf(
      AccountLockedError,
    )
  })

  it('锁定期满后可再次登录成功（时间判定统一取自 TimeProvider）', async () => {
    const { time, useCase } = build()

    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await useCase.execute({ username: 'alice', password: 'wrong' }).catch(() => undefined)
    }
    time.advance(LOCK_DURATION_MS)

    const result = await useCase.execute({ username: 'alice', password: 'passw0rd' })
    expect(result.token).toBeDefined()
  })
})
