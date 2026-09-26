import { describe, expect, it } from 'vitest'
import {
  FakeMailSender,
  FakeTimeProvider,
  FixedCodeGenerator,
  InMemoryCodeStore,
} from '../../../../tests/support/fakes'
import { CODE_TTL_MS } from '../domain/constants'
import { Email } from '../domain/value-objects/index'
import { SendCodeUseCase } from './send-code.usecase'

describe('SendCodeUseCase', () => {
  it('生成验证码 → 带 TTL 落库 → 发邮件（全走端口，零真实 I/O）', async () => {
    const time = new FakeTimeProvider(1_000)
    const codeStore = new InMemoryCodeStore()
    const mailSender = new FakeMailSender()
    const useCase = new SendCodeUseCase({
      codeStore,
      codeGenerator: new FixedCodeGenerator('654321'),
      mailSender,
      timeProvider: time,
    })

    const result = await useCase.execute({ email: Email.create('alice@example.com') })

    expect(result).toEqual({ email: 'alice@example.com' })
    expect(codeStore.records.get('register::alice@example.com')).toEqual({
      code: '654321',
      expiresAt: 1_000 + CODE_TTL_MS,
    })
    expect(mailSender.lastCode()).toBe('654321')
  })
})
