/**
 * @file 进程内事件总线端口
 * @author 教程组
 *
 * 发布方与订阅方互不感知：模块 A 只认识「事件」和「总线」，
 * 不知道谁在听、有几个听众 —— 新增订阅方零改动 A 的代码。
 */
import type { DomainEvent } from '../domain-event'

export type EventHandler = (event: DomainEvent) => Promise<void> | void

export interface EventBus {
  /** 按事件类名订阅（与 DomainEvent 的路由约定配套） */
  subscribe(eventName: string, handler: EventHandler): void
  /** 广播事件；单个订阅方失败不影响其他订阅方（进程内同步派发，见实现注释） */
  publish(event: DomainEvent): Promise<void>
}
