/**
 * @file 发送验证码用例
 * @author 教程组
 *
 * 编排：生成验证码（端口）→ 存（端口，带 TTL）→ 发邮件（端口）。
 * 用例不知道验证码存在哪、怎么发 —— 只认端口。
 */
import { CODE_TTL_MS } from '../domain/constants'
import type { AuthSendCodeDeps } from '../domain/schemas/deps/index'
import type { SendCodeResult } from '../domain/schemas/index'
import type { ValidatedSendCode } from '../domain/schemas/validator/index'

/** 验证码用途：注册与（Day 07 的）重置密码共用存储、互不干扰 */
export const CODE_PURPOSE_REGISTER = 'register'

export class SendCodeUseCase {
  readonly #deps: AuthSendCodeDeps

  constructor(deps: AuthSendCodeDeps) {
    this.#deps = deps
  }

  async execute(input: ValidatedSendCode): Promise<SendCodeResult> {
    const { codeStore, codeGenerator, mailSender, timeProvider } = this.#deps
    const email = input.email.value
    const now = timeProvider.now()
    const code = codeGenerator.generate()

    await codeStore.save(CODE_PURPOSE_REGISTER, email, code.value, now + CODE_TTL_MS)
    await mailSender.send(email, '注册验证码', `您的验证码是 ${code.value}，${CODE_TTL_MS / 60000} 分钟内有效。`)

    return { email }
  }
}
