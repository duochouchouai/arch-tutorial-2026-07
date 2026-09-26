import { describe, expect, it } from 'vitest'
import {
  FakePasswordHasher,
  FakeTimeProvider,
  InMemoryCodeStore,
  InMemorySessionStore,
  InMemoryUserAccountStore,
} from '../../../../tests/support/fakes'
import { CODE_TTL_MS, MAX_FAILED_ATTEMPTS } from '../domain/constants'
import { UserEntity } from '../domain/entities/index'
import { InvalidCodeError } from '../domain/errors/index'
import { ResetPasswordValidator } from '../domain/validators/index'
import { CODE_PURPOSE_RESET } from './forgot-password.usecase'
import { ResetPasswordUseCase } from './reset-password.usecase'

const START = 1_000
const EMAIL = 'alice@example.com'
const NEW_PASSWORD = 'new-passw0rd'

async function build() {
  const time = new FakeTimeProvider(START)
  const userAccount = new InMemoryUserAccountStore()
  const codeStore = new InMemoryCodeStore()
  const sessionStore = new InMemorySessionStore()
  const useCase = new ResetPasswordUseCase({
    userAccount,
    timeProvider: time,
    codeStore,
    passwordHasher: new FakePasswordHasher(),
    sessionStore,
  })
  userAccount.rows.set(
    'u1',
    UserEntity.createEmailUser(
      { id: 'u1', username: 'alice', email: EMAIL, phone: null, passwordHash: 'hashed:passw0rd' },
      time,
    ).toRow(),
  )
  await codeStore.save(CODE_PURPOSE_RESET, EMAIL, '654321', START + CODE_TTL_MS)
  return { time, userAccount, codeStore, sessionStore, useCase }
}

describe('ResetPasswordUseCase', () => {
  it('happy path：换哈希、消费验证码、吊销该用户全部旧会话', async () => {
    const { userAccount, codeStore, sessionStore, useCase } = await build()
    await sessionStore.save('old-token-1', 'u1', START + 1_000)
    await sessionStore.save('old-token-2', 'u1', START + 1_000)
    await sessionStore.save('other-user-token', 'u2', START + 1_000)

    const result = await useCase.execute(
      new ResetPasswordValidator().validate({ email: EMAIL, code: '654321', password: NEW_PASSWORD }),
    )

    expect(result.user.username).toBe('alice')
    expect(userAccount.rows.get('u1')?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`)
    // 一次性：码用掉即删
    expect(await codeStore.find(CODE_PURPOSE_RESET, EMAIL)).toBeNull()
    // 旧会话全灭，别人的会话不受影响
    expect(await sessionStore.find('old-token-1')).toBeNull()
    expect(await sessionStore.find('old-token-2')).toBeNull()
    expect(await sessionStore.find('other-user-token')).not.toBeNull()
  })

  it('重置顺带解锁：被锁定的账号改完密码即可登录', async () => {
    const { userAccount, useCase } = await build()
    const row = userAccount.rows.get('u1')
    if (row === undefined) throw new Error('fixture 丢了')
    userAccount.rows.set('u1', {
      ...row,
      failedAttempts: MAX_FAILED_ATTEMPTS,
      lockCount: 1,
      lockedUntil: START + 999_999,
    })

    await useCase.execute(
      new ResetPasswordValidator().validate({ email: EMAIL, code: '654321', password: NEW_PASSWORD }),
    )

    expect(userAccount.rows.get('u1')?.lockedUntil).toBeNull()
    expect(userAccount.rows.get('u1')?.failedAttempts).toBe(0)
  })

  it('验证码错误 → InvalidCodeError，且不改密码、不消费码', async () => {
    const { userAccount, codeStore, useCase } = await build()

    await expect(
      useCase.execute(new ResetPasswordValidator().validate({ email: EMAIL, code: '000000', password: NEW_PASSWORD })),
    ).rejects.toBeInstanceOf(InvalidCodeError)
    expect(userAccount.rows.get('u1')?.passwordHash).toBe('hashed:passw0rd')
    expect(await codeStore.find(CODE_PURPOSE_RESET, EMAIL)).not.toBeNull()
  })

  it('账号不存在（却拿着码）：同样抛 InvalidCodeError —— 不复用「账号不存在」这类可枚举的差异', async () => {
    const { codeStore, useCase } = await build()
    // 白盒造一个「码在、人不在」的极端现场（正常流程发不出这种码）
    await codeStore.save(CODE_PURPOSE_RESET, 'ghost@example.com', '654321', START + CODE_TTL_MS)

    await expect(
      useCase.execute(
        new ResetPasswordValidator().validate({ email: 'ghost@example.com', code: '654321', password: NEW_PASSWORD }),
      ),
    ).rejects.toBeInstanceOf(InvalidCodeError)
  })
})
