/**
 * @file 邮件发送端口
 * @author 教程组
 *
 * 教程实现是 ConsoleMailSender（把验证码打到控制台）；
 * 真实实现换 nodemailer/SMTP，仅动 infrastructure 一个文件。
 */
export interface MailSenderPort {
  send(to: string, subject: string, body: string): Promise<void>
}
