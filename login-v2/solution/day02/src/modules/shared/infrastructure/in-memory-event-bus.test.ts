import { describe, expect, it } from 'vitest'
import { DomainEvent } from '../domain/index'
import { InMemoryEventBus } from './in-memory-event-bus'

class PingEvent extends DomainEvent {
  readonly n: number
  constructor(n: number) {
    super(0)
    this.n = n
  }
}

class OtherEvent extends DomainEvent {}

describe('InMemoryEventBus', () => {
  it('按事件类名路由：只触发对应订阅者', async () => {
    const bus = new InMemoryEventBus()
    const pingSeen: number[] = []
    const otherSeen: string[] = []
    bus.subscribe(PingEvent.name, (event) => {
      pingSeen.push((event as PingEvent).n)
    })
    bus.subscribe(OtherEvent.name, () => {
      otherSeen.push('other')
    })

    await bus.publish(new PingEvent(7))
    expect(pingSeen).toEqual([7])
    expect(otherSeen).toEqual([])
  })

  it('多个订阅者都收到；单个订阅者抛错不影响其他订阅者，也不向发布方抛出', async () => {
    const bus = new InMemoryEventBus()
    const seen: string[] = []
    bus.subscribe(PingEvent.name, () => {
      seen.push('first')
      throw new Error('订阅者坏了')
    })
    bus.subscribe(PingEvent.name, () => {
      seen.push('second')
    })

    await expect(bus.publish(new PingEvent(1))).resolves.toBeUndefined()
    expect(seen).toEqual(['first', 'second'])
  })

  it('没有订阅者时 publish 是 no-op', async () => {
    const bus = new InMemoryEventBus()
    await expect(bus.publish(new PingEvent(1))).resolves.toBeUndefined()
  })
})
