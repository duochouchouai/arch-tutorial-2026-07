/**
 * @file 重置密码用例 — 验码 → 改密 → 旧会话全部失效
 * @author 教程组
 *
 * 顺序即安全设计：
 * 1. 先验码并**立刻消费**（一次性，重复提交同一枚码直接失败）；
 * 2. 找不到账号也抛「验证码无效」——不复用「账号不存在」这类可枚举的差异；
 * 3. 改密经实体的 changePassword()（业务方法顺带解锁、清失败计数）；
 * 4. 吊销该用户的所有会话：密码都换了，旧 token 必须立刻失效。
 */
import { InvalidCodeError } from '../domain/errors/index'
import { assertCodeValid } from '../domain/services/index'
import { UserEntity } from '../domain/entities/index'
import type { AuthResetPasswordDeps } from '../domain/schemas/deps/index'
import type { ResetPasswordResult } from '../domain/schemas/index'
import type { ValidatedResetPassword } from '../domain/schemas/validator/index'
import { CODE_PURPOSE_RESET } from './forgot-password.usecase'

export class ResetPasswordUseCase {
  readonly #deps: AuthResetPasswordDeps

  constructor(deps: AuthResetPasswordDeps) {
    this.#deps = deps
  }

  async execute(input: ValidatedResetPassword): Promise<ResetPasswordResult> {
    const { userAccount, codeStore, passwordHasher, sessionStore, timeProvider } = this.#deps
    const email = input.email.value
    const now = timeProvider.now()

    // 1) 验码 + 消费（先消费再改密：改密失败也不能让同一枚码被重用）
    assertCodeValid(await codeStore.find(CODE_PURPOSE_RESET, email), input.code, now)
    await codeStore.remove(CODE_PURPOSE_RESET, email)

    // 2) 账号必须存在；不存在与验证码错误的响应保持一致（防枚举）
    const row = await userAccount.findByEmail(email)
    if (row === null) {
      throw new InvalidCodeError()
    }

    // 3) 改密（实体业务方法：顺带解锁 + 清失败计数）
    const user = UserEntity.fromData(row, timeProvider)
    user.changePassword(await passwordHasher.hash(input.password.value))
    await userAccount.update(user.toRow())

    // 4) 旧会话全部失效
    await sessionStore.removeAllForUser(user.id)

    return { user: user.toSnapshot() }
  }
}
