/**
 * @file 内存事件总线 — 基础设施实现
 * @author 教程组
 *
 * 进程内同步派发：publish 会等待所有订阅方处理完才返回。
 * 用 Promise.allSettled 而非 Promise.all：单个订阅方抛错**不拖垮**其他订阅方，
 * 也不把异常抛回业务主流程（注册不能因为通知模块坏了而失败）。
 *
 * 简化说明：本教程只有进程内实现。真实架构里跨进程/需持久化的事件走 outbox 表 + worker 重放，
 * 端口签名不变 —— 那正是「端口与实现分离」的意义。
 */
import type { DomainEvent } from '../domain/index'
import type { EventBus, EventHandler } from '../domain/ports/index'

export class InMemoryEventBus implements EventBus {
  readonly #handlers: Map<string, EventHandler[]> = new Map()

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.#handlers.get(eventName)
    if (handlers) {
      handlers.push(handler)
      return
    }
    this.#handlers.set(eventName, [handler])
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.#handlers.get(event.constructor.name) ?? []
    // 先包成 Promise 再进 allSettled：订阅方**同步**抛错也会被兜住
    //（直接 map 调用的话，同步抛错会在构造数组时抛出，allSettled 根本没机会接）
    await Promise.allSettled(handlers.map((handler) => Promise.resolve().then(() => handler(event))))
  }
}
