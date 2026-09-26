/**
 * @file 登录用例
 * @author 教程组
 *
 * 状态变更全部经实体业务方法（recordFailedLogin / recordLogin），
 * 用例只负责「取行 → 恢复实体 → 校验密码 → 调实体 → 写回 → 发会话」。
 */
import { AccountLockedError, InvalidCredentialsError } from '../domain/errors/index'
import { SESSION_TTL_MS } from '../domain/constants'
import { UserEntity } from '../domain/entities/index'
import type { AuthLoginDeps } from '../domain/schemas/deps/index'
import type { LoginResult } from '../domain/schemas/index'
import type { ValidatedLogin } from '../domain/schemas/validator/index'

export class LoginUseCase {
  readonly #deps: AuthLoginDeps

  constructor(deps: AuthLoginDeps) {
    this.#deps = deps
  }

  async execute(input: ValidatedLogin): Promise<LoginResult> {
    const { userAccount, passwordHasher, sessionStore, timeProvider, idGenerator } = this.#deps
    const now = timeProvider.now()

    const row = await userAccount.findByUsername(input.username)
    // 防枚举：账号不存在与密码错误返回同一个错误、同一状态码
    if (row === null) {
      throw new InvalidCredentialsError()
    }

    const user = UserEntity.fromData(row, timeProvider)
    if (user.isLockedAt(now)) {
      throw new AccountLockedError()
    }

    const passwordMatched = await passwordHasher.verify(input.password, user.passwordHash)
    if (!passwordMatched) {
      user.recordFailedLogin()
      await userAccount.update(user.toRow())
      throw new InvalidCredentialsError()
    }

    user.recordLogin()
    await userAccount.update(user.toRow())

    // 会话 token 走密码学随机端口（对比旧教程的 Math.random 生成重置码）
    const token = idGenerator.generate()
    await sessionStore.save(token, user.id, now + SESSION_TTL_MS)

    return { token, user: user.toSnapshot() }
  }
}
