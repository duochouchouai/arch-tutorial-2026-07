/**
 * @file 控制台邮件实现（notifications 自己的）
 * @author 教程组
 *
 * 与 auth 的 ConsoleMailSender 长得一样但**不共享**：各模块的实现属于各自的基础设施，
 * 共享实现会把两个模块的发布节奏绑在一起（见 GUIDE-day07「窄口原则」）。
 * 真实仓库里这些「发邮件」实现最终会收敛成一个邮件服务模块 —— 那是另一个演进故事。
 */
import type { MailSenderPort } from '../domain/ports/mail-sender.port'

export class ConsoleMailSender implements MailSenderPort {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[notifications][mail] to=${to} subject=${subject}\n${body}`)
  }
}
