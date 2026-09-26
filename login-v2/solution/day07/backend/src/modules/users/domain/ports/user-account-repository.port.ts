/**
 * @file 账号仓储端口 — users 模块内部持久化契约
 * @author 教程组
 *
 * 「内部」的含义：这张 interface 只有本模块的 compose/application 依赖。
 * 它**不是**跨模块契约 —— 模块外的人看不到它，所以它可以随内部演进自由增删方法。
 * 跨模块契约在 user-account.public.port.ts。
 *
 * 方法签名全部返回 Promise：虽然 node:sqlite 是同步 API，
 * 但端口要为「换 Postgres / 换远程服务」留出异步形状 —— 换实现时签名不变。
 */
import type { UserRow } from '../schemas/index'

export interface UserAccountRepositoryPort {
  findByUsername(username: string): Promise<UserRow | null>
  findByEmail(email: string): Promise<UserRow | null>
  insert(row: UserRow): Promise<void>
  update(row: UserRow): Promise<void>
}
