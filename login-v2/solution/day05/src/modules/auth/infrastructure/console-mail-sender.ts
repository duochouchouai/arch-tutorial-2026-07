/**
 * @file 控制台邮件发送 — MailSenderPort 的教学实现
 * @author 教程组
 *
 * 验证码会打印到服务端控制台（开发时“收邮件”就是看控制台）。
 * 换真实邮件服务只动这一个文件 —— 端口不变。
 */
import type { MailSenderPort } from '../domain/ports/index'

export class ConsoleMailSender implements MailSenderPort {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[mail] to=${to} subject=${subject} body=${body}`)
  }
}
