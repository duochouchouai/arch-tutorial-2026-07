/**
 * @file 会话用例 — 校验当前会话 / 退出登录
 * @author 教程组
 */
import { UnauthorizedError } from '../../shared/index'
import type { AuthSessionDeps } from '../domain/schemas/deps/index'

export class SessionUseCase {
  readonly #deps: AuthSessionDeps

  constructor(deps: AuthSessionDeps) {
    this.#deps = deps
  }

  async current(token: string): Promise<{ userId: string }> {
    const session = await this.#deps.sessionStore.find(token)
    if (session === null) {
      throw new UnauthorizedError()
    }
    return { userId: session.userId }
  }

  /** 退出登录幂等：token 不存在也返回成功 */
  async logout(token: string): Promise<void> {
    await this.#deps.sessionStore.remove(token)
  }
}
