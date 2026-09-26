/**
 * @file 订阅装配集成测试 — 真实事件总线 + 真实实现，只 spy 一个 console.log
 * @author 教程组
 */
import { describe, expect, it, vi } from 'vitest'
import { UserRegisteredEvent } from '../auth/index'
import { InMemoryEventBus } from '../shared/index'
import { createNotificationsModule } from './compose'

describe('createNotificationsModule', () => {
  it('装配即订阅：注册事件一发布，欢迎邮件就发出去（auth 侧零改动）', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const eventBus = new InMemoryEventBus()
    createNotificationsModule({ eventBus })

    await eventBus.publish(
      new UserRegisteredEvent({ userId: 'u1', username: 'alice', email: 'alice@example.com', registeredAt: 1 }),
    )

    const printed = log.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(printed).toContain('alice@example.com')
    expect(printed).toContain('欢迎加入')
    log.mockRestore()
  })
})
