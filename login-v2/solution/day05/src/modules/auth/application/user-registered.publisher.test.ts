import { describe, expect, it } from 'vitest'
import { FakeTimeProvider } from '../../../../tests/support/fakes'
import { InMemoryEventBus } from '../../shared/index'
import { UserRegisteredEvent } from '../domain/events/index'
import { UserRegisteredPublisher } from './user-registered.publisher'

describe('UserRegisteredPublisher', () => {
  it('有总线：以注入时钟的 registeredAt 发布事件', async () => {
    const time = new FakeTimeProvider(5_000)
    const bus = new InMemoryEventBus()
    const seen: UserRegisteredEvent[] = []
    bus.subscribe(UserRegisteredEvent.name, (event) => {
      seen.push(event as UserRegisteredEvent)
    })

    await new UserRegisteredPublisher({ timeProvider: time, eventBus: bus }).publish('u1')

    expect(seen).toHaveLength(1)
    expect(seen[0]?.userId).toBe('u1')
    expect(seen[0]?.registeredAt).toBe(5_000)
  })

  it('无总线：no-op，不抛错', async () => {
    const publisher = new UserRegisteredPublisher({ timeProvider: new FakeTimeProvider() })
    await expect(publisher.publish('u1')).resolves.toBeUndefined()
  })

  it('订阅方抛错：发布方兜底，不把异常带回注册主流程', async () => {
    const bus = new InMemoryEventBus()
    bus.subscribe(UserRegisteredEvent.name, () => {
      throw new Error('通知模块坏了')
    })
    const publisher = new UserRegisteredPublisher({ timeProvider: new FakeTimeProvider(), eventBus: bus })

    await expect(publisher.publish('u1')).resolves.toBeUndefined()
  })
})
