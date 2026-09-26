import { describe, expect, it } from 'vitest'
import { UserRegisteredEvent } from '../../auth/index'
import type { MailSenderPort } from '../domain/ports/mail-sender.port'
import { UserRegisteredWelcomeHandler } from './user-registered-welcome.handler'

class RecordingMailSender implements MailSenderPort {
  readonly sent: { to: string; subject: string; body: string }[] = []

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sent.push({ to, subject, body })
  }
}

function build() {
  const mailSender = new RecordingMailSender()
  return { mailSender, handler: new UserRegisteredWelcomeHandler({ mailSender }) }
}

describe('UserRegisteredWelcomeHandler', () => {
  it('按事件载荷发欢迎邮件（不回查 users 模块）', async () => {
    const { mailSender, handler } = build()

    await handler.handle(
      new UserRegisteredEvent({ userId: 'u1', username: 'alice', email: 'alice@example.com', registeredAt: 1 }),
    )

    expect(mailSender.sent).toHaveLength(1)
    expect(mailSender.sent[0]?.to).toBe('alice@example.com')
    expect(mailSender.sent[0]?.body).toContain('alice')
  })

  it('邮件发送失败只记日志，绝不把异常抛回发布方', async () => {
    const broken: MailSenderPort = {
      send: () => Promise.reject(new Error('smtp down')),
    }
    const handler = new UserRegisteredWelcomeHandler({ mailSender: broken })

    await expect(
      handler.handle(
        new UserRegisteredEvent({ userId: 'u1', username: 'alice', email: 'alice@example.com', registeredAt: 1 }),
      ),
    ).resolves.toBeUndefined()
  })
})
