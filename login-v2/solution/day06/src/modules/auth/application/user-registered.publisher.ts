/**
 * @file 注册事件发布器 — UserRegisteredPublisherPort 的唯一实现
 * @author 教程组
 *
 * 为什么把「发事件」从用例里拿出来单独成类：
 * 1. 失败策略（只记日志、绝不抛）集中一处，不会被复制到每个调用点；
 * 2. 用例依赖的是端口（可注入可 mock），实现可以随事件基础设施演进
 *    （内存总线 → outbox + worker 重放）而用例零改动。
 */
import type { AuthUserRegisteredPublisherDeps } from '../domain/schemas/deps/index'
import type { UserRegisteredPublisherPort } from '../domain/ports/index'
import { UserRegisteredEvent } from '../domain/events/index'

export class UserRegisteredPublisher implements UserRegisteredPublisherPort {
  readonly #deps: AuthUserRegisteredPublisherDeps

  constructor(deps: AuthUserRegisteredPublisherDeps) {
    this.#deps = deps
  }

  async publish(userId: string): Promise<void> {
    const { eventBus, timeProvider } = this.#deps
    if (eventBus === undefined) {
      return
    }
    try {
      await eventBus.publish(new UserRegisteredEvent({ userId, registeredAt: timeProvider.now() }))
    } catch (err) {
      // 注册是唯一不能坏的东西：事件发送失败也不能让用户看到失败
      console.error('[auth] 注册事件发布失败', err)
    }
  }
}
