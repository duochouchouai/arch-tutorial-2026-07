/**
 * @file 注册欢迎通知 — UserRegisteredEvent 的订阅处理器
 * @author 教程组
 *
 * 处理器只认三样东西：事件载荷的形状、自己的邮件端口、自己的失败策略。
 * 它不知道 auth 的存在，也不知道事件是怎么发出来的。
 */
import type { UserRegisteredEvent } from '../../auth/index'
import type { MailSenderPort } from '../domain/ports/mail-sender.port'

export interface UserRegisteredWelcomeDeps {
  mailSender: MailSenderPort
}

/** 副作用边界：这里出错只记日志，绝不把异常抛回发布方 */
export class UserRegisteredWelcomeHandler {
  readonly #deps: UserRegisteredWelcomeDeps

  constructor(deps: UserRegisteredWelcomeDeps) {
    this.#deps = deps
  }

  async handle(event: UserRegisteredEvent): Promise<void> {
    try {
      await this.#deps.mailSender.send(
        event.email,
        '欢迎加入',
        `${event.username} 你好，欢迎加入！你的账号已创建成功。`,
      )
    } catch (err) {
      console.error('[notifications] 欢迎邮件发送失败', err)
    }
  }
}
