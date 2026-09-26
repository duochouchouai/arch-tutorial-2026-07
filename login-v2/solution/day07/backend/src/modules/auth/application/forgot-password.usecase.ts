/**
 * @file 忘记密码用例 — 给已注册邮箱发一枚重置码
 * @author 教程组
 *
 * 跨模块点：验证「这个邮箱有没有账号」走 users 模块的公共端口，
 * auth 拿到的只是一行 UserRow，看不到 users 的表与仓储。
 *
 * 防枚举：邮箱不存在时**静默返回同样的成功响应**（不发邮件）——
 * 否则这个端点会变成「批量探测哪些邮箱注册过」的工具，
 * 与登录接口「账号不存在与密码错误同一个响应」是同一条纪律。
 */
import { CODE_TTL_MS } from '../domain/constants'
import type { AuthForgotPasswordDeps } from '../domain/schemas/deps/index'
import type { ForgotPasswordResult } from '../domain/schemas/index'
import type { ValidatedForgotPassword } from '../domain/schemas/validator/index'

/** 验证码用途：与注册码共用存储、按 purpose 隔离，互不通用 */
export const CODE_PURPOSE_RESET = 'reset'

export class ForgotPasswordUseCase {
  readonly #deps: AuthForgotPasswordDeps

  constructor(deps: AuthForgotPasswordDeps) {
    this.#deps = deps
  }

  async execute(input: ValidatedForgotPassword): Promise<ForgotPasswordResult> {
    const { userAccount, codeStore, codeGenerator, mailSender, timeProvider } = this.#deps
    const email = input.email.value

    if ((await userAccount.findByEmail(email)) === null) {
      return { email }
    }

    const now = timeProvider.now()
    const code = codeGenerator.generate()
    await codeStore.save(CODE_PURPOSE_RESET, email, code.value, now + CODE_TTL_MS)
    await mailSender.send(email, '重置密码验证码', `您的验证码是 ${code.value}，${CODE_TTL_MS / 60000} 分钟内有效。`)

    return { email }
  }
}
