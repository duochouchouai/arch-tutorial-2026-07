import { describe, expect, it } from 'vitest'
import { FakeTimeProvider } from '../../../../tests/support/fakes'
import { InMemoryEventBus } from '../../shared/index'
import { UserRegisteredEvent } from '../domain/events/index'
import { UserRegisteredPublisher } from './user-registered.publisher'

const ALICE = { id: 'u1', username: 'alice', email: 'alice@example.com', phone: null }

describe('UserRegisteredPublisher', () => {
  it('有总线：以注入时钟的 registeredAt 发布事件', async () => {
    const time = new FakeTimeProvider(5_000)
    const bus = new InMemoryEventBus()
    const seen: UserRegisteredEvent[] = []
    bus.subscribe(UserRegisteredEvent.name, (event) => {
      seen.push(event as UserRegisteredEvent)
    })

    await new UserRegisteredPublisher({ timeProvider: time, eventBus: bus }).publish(ALICE)

    expect(seen).toHaveLength(1)
    expect(seen[0]?.userId).toBe('u1')
    expect(seen[0]?.username).toBe('alice')
    expect(seen[0]?.email).toBe('alice@example.com')
    expect(seen[0]?.registeredAt).toBe(5_000)
  })

  it('无总线：no-op，不抛错', async () => {
    const publisher = new UserRegisteredPublisher({ timeProvider: new FakeTimeProvider() })
    await expect(publisher.publish(ALICE)).resolves.toBeUndefined()
  })

  it('订阅方抛错：发布方兜底，不把异常带回注册主流程', async () => {
    const bus = new InMemoryEventBus()
    bus.subscribe(UserRegisteredEvent.name, () => {
      throw new Error('通知模块坏了')
    })
    const publisher = new UserRegisteredPublisher({ timeProvider: new FakeTimeProvider(), eventBus: bus })

    await expect(publisher.publish(ALICE)).resolves.toBeUndefined()
  })
})
