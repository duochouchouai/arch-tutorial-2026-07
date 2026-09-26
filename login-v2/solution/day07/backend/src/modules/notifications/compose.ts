/**
 * @file notifications 模块组合根
 * @author 教程组
 *
 * 装配即「订阅」：createNotificationsModule 被调用时，处理器就挂上了事件总线。
 * auth 那边一行都不用改 —— 这正是 Day 06 把「发注册事件」独立成端口的目的。
 *
 * 依赖方向：notifications → auth（只 import auth/index 的事件类型）。
 * 反向没有任何依赖：auth 不知道 notifications 的存在。
 */
import { UserRegisteredEvent } from '../auth/index'
import type { EventBus } from '../shared/index'
import { UserRegisteredWelcomeHandler } from './application/index'
import { ConsoleMailSender } from './infrastructure/index'

export interface NotificationsModuleDeps {
  eventBus: EventBus
}

export interface NotificationsModule {
  /** 装配完成后订阅已生效；返回值供 main.ts 断言/扩展用 */
  readonly subscribed: boolean
}

export function createNotificationsModule(deps: NotificationsModuleDeps): NotificationsModule {
  const handler = new UserRegisteredWelcomeHandler({ mailSender: new ConsoleMailSender() })

  // 事件路由按「类名」：订阅方从公共面拿事件类型，不 import auth 内部路径
  deps.eventBus.subscribe(UserRegisteredEvent.name, async (event) => {
    if (event instanceof UserRegisteredEvent) {
      await handler.handle(event)
    }
  })

  return { subscribed: true }
}
