/**
 * @file 邮件发送端口（notifications 自己的窄口）
 * @author 教程组
 *
 * 窄口原则：本模块**不复用** auth 的 MailSenderPort，即使签名一样 ——
 * 模块间不共享端口类型，各持一份自己需要的契约。好处是：
 * auth 想给它的邮件端口加方法/改签名时，notifications 完全不受牵连。
 * （如果哪天真的需要共享，那说明这两个模块该合成一个。）
 */
export interface MailSenderPort {
  send(to: string, subject: string, body: string): Promise<void>
}
