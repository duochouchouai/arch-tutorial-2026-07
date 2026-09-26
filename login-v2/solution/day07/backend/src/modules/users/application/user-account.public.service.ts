/**
 * @file 账号公共端口实现 — application 层的薄转发
 * @author 教程组
 *
 * 为什么要这层「什么都没做」的转发？
 * 1. 契约的持有者是**应用服务**，不是仓储：仓储（infrastructure）随时可以拆表、换库、
 *    改查询；跨模块消费者依赖的是本类，不受影响。
 * 2. 未来的编排（审计日志、缓存、事务）有唯一落点，不会散进仓储实现。
 */
import type { UserAccountPublicPort, UserAccountRepositoryPort } from '../domain/ports/index'
import type { UserRow } from '../domain/schemas/index'

export class UserAccountPublicService implements UserAccountPublicPort {
  readonly #repository: UserAccountRepositoryPort

  constructor(repository: UserAccountRepositoryPort) {
    this.#repository = repository
  }

  findByUsername(username: string): Promise<UserRow | null> {
    return this.#repository.findByUsername(username)
  }

  findByEmail(email: string): Promise<UserRow | null> {
    return this.#repository.findByEmail(email)
  }

  insert(row: UserRow): Promise<void> {
    return this.#repository.insert(row)
  }

  update(row: UserRow): Promise<void> {
    return this.#repository.update(row)
  }
}
