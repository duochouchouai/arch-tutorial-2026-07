import { describe, expect, it } from 'vitest'
import {
  FakeIdGenerator,
  FakePasswordHasher,
  FakeTimeProvider,
  InMemoryCodeStore,
  InMemoryUserAccountStore,
  RecordingEventBus,
} from '../../../../tests/support/fakes'
import { InMemoryEventBus } from '../../shared/index'
import { EmailTakenError, InvalidCodeError, UsernameTakenError } from '../domain/errors/index'
import { UserRegisteredEvent } from '../domain/events/index'
import { RegisterValidator } from '../domain/validators/index'
import { CODE_PURPOSE_REGISTER } from './send-code.usecase'
import { RegisterUseCase } from './register.usecase'
import { UserRegisteredPublisher } from './user-registered.publisher'

const INPUT = { username: 'alice', password: 'passw0rd', email: 'alice@example.com', code: '123456' }

function build() {
  const time = new FakeTimeProvider(1_000)
  const userAccountRepository = new InMemoryUserAccountStore()
  const codeStore = new InMemoryCodeStore()
  const eventBus = new RecordingEventBus(new InMemoryEventBus())
  const useCase = new RegisterUseCase({
    userAccountRepository,
    timeProvider: time,
    idGenerator: new FakeIdGenerator(),
    codeStore,
    passwordHasher: new FakePasswordHasher(),
    userRegisteredPublisher: new UserRegisteredPublisher({ timeProvider: time, eventBus }),
  })
  return { time, userAccountRepository, codeStore, eventBus, useCase }
}

describe('RegisterUseCase', () => {
  it('验证码正确时：建账号（哈希落库、时间戳来自时钟）→ 消费验证码 → 发注册事件', async () => {
    const { userAccountRepository, codeStore, eventBus, useCase } = build()
    await codeStore.save(CODE_PURPOSE_REGISTER, 'alice@example.com', '123456', 2_000)

    const result = await useCase.execute(new RegisterValidator().validate(INPUT))

    const row = userAccountRepository.rows.get('id-1')
    expect(row).toBeDefined()
    expect(row?.username).toBe('alice')
    expect(row?.passwordHash).toBe('hashed:passw0rd')
    expect(row?.failedAttempts).toBe(0)
    expect(row?.createdAt).toBe(1_000)
    expect(result.user).not.toHaveProperty('passwordHash')

    // 验证码一次性：用掉即删
    expect(await codeStore.find(CODE_PURPOSE_REGISTER, 'alice@example.com')).toBeNull()

    // 注册事件以「实体 id + 注入时钟」的载荷发出
    expect(eventBus.published).toHaveLength(1)
    expect(eventBus.published[0]).toBeInstanceOf(UserRegisteredEvent)
    expect((eventBus.published[0] as UserRegisteredEvent).userId).toBe('id-1')
  })

  it('验证码错：抛 InvalidCodeError，且不消费验证码（用户可重试）', async () => {
    const { codeStore, useCase } = build()
    await codeStore.save(CODE_PURPOSE_REGISTER, 'alice@example.com', '000000', 2_000)

    await expect(useCase.execute(new RegisterValidator().validate(INPUT))).rejects.toBeInstanceOf(InvalidCodeError)
    expect(await codeStore.find(CODE_PURPOSE_REGISTER, 'alice@example.com')).not.toBeNull()
  })

  it('用户名已占用：抛 UsernameTakenError', async () => {
    const { codeStore, userAccountRepository, useCase } = build()
    await codeStore.save(CODE_PURPOSE_REGISTER, 'alice@example.com', '123456', 2_000)
    userAccountRepository.rows.set('existing', {
      id: 'existing',
      username: 'alice',
      email: 'other@example.com',
      phone: null,
      passwordHash: 'hashed:x',
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: 0,
      updatedAt: 0,
    })

    await expect(useCase.execute(new RegisterValidator().validate(INPUT))).rejects.toBeInstanceOf(UsernameTakenError)
  })

  it('邮箱已注册：抛 EmailTakenError', async () => {
    const { codeStore, userAccountRepository, useCase } = build()
    await codeStore.save(CODE_PURPOSE_REGISTER, 'alice@example.com', '123456', 2_000)
    userAccountRepository.rows.set('existing', {
      id: 'existing',
      username: 'someoneelse',
      email: 'alice@example.com',
      phone: null,
      passwordHash: 'hashed:x',
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: 0,
      updatedAt: 0,
    })

    await expect(useCase.execute(new RegisterValidator().validate(INPUT))).rejects.toBeInstanceOf(EmailTakenError)
  })
})
