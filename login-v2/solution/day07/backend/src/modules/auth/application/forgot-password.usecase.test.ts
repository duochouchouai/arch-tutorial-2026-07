import { describe, expect, it } from 'vitest'
import {
  FakeMailSender,
  FakeTimeProvider,
  FixedCodeGenerator,
  InMemoryCodeStore,
  InMemoryUserAccountStore,
} from '../../../../tests/support/fakes'
import { CODE_TTL_MS } from '../domain/constants'
import { UserEntity } from '../domain/entities/index'
import { ForgotPasswordValidator } from '../domain/validators/index'
import { CODE_PURPOSE_RESET, ForgotPasswordUseCase } from './forgot-password.usecase'

const START = 1_000
const EMAIL = 'alice@example.com'

function build(withAccount: boolean) {
  const time = new FakeTimeProvider(START)
  const userAccount = new InMemoryUserAccountStore()
  const codeStore = new InMemoryCodeStore()
  const mailSender = new FakeMailSender()
  if (withAccount) {
    userAccount.rows.set(
      'u1',
      UserEntity.createEmailUser(
        { id: 'u1', username: 'alice', email: EMAIL, phone: null, passwordHash: 'hashed:passw0rd' },
        time,
      ).toRow(),
    )
  }
  const useCase = new ForgotPasswordUseCase({
    userAccount,
    timeProvider: time,
    codeStore,
    codeGenerator: new FixedCodeGenerator('654321'),
    mailSender,
  })
  return { codeStore, mailSender, useCase }
}

describe('ForgotPasswordUseCase', () => {
  it('已注册邮箱：存重置码（TTL=配置常数）+ 发邮件，响应只回 email', async () => {
    const { codeStore, mailSender, useCase } = build(true)

    const result = await useCase.execute(new ForgotPasswordValidator().validate({ email: EMAIL }))

    expect(result).toEqual({ email: EMAIL })
    expect(await codeStore.find(CODE_PURPOSE_RESET, EMAIL)).toEqual({ code: '654321', expiresAt: START + CODE_TTL_MS })
    expect(mailSender.sent).toHaveLength(1)
    expect(mailSender.lastCode()).toBe('654321')
  })

  it('未注册邮箱：静默成功（防枚举），不发邮件、不存码', async () => {
    const { codeStore, mailSender, useCase } = build(false)

    const result = await useCase.execute(new ForgotPasswordValidator().validate({ email: EMAIL }))

    expect(result).toEqual({ email: EMAIL })
    expect(mailSender.sent).toHaveLength(0)
    expect(await codeStore.find(CODE_PURPOSE_RESET, EMAIL)).toBeNull()
  })

  it('注册码与重置码按 purpose 隔离：注册用途的码不能被当成重置码', async () => {
    const { codeStore, useCase } = build(true)
    await codeStore.save('register', EMAIL, '111111', START + CODE_TTL_MS)

    await useCase.execute(new ForgotPasswordValidator().validate({ email: EMAIL }))

    expect((await codeStore.find('register', EMAIL))?.code).toBe('111111')
    expect((await codeStore.find(CODE_PURPOSE_RESET, EMAIL))?.code).toBe('654321')
  })
})
