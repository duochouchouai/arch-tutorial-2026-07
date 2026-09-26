/**
 * @file 账号仓储端口 — 账号持久化的出站契约
 * @author 教程组
 *
 * 依赖倒置的落点：用例只认这张 interface，不认识 SQLite / Postgres / 内存实现。
 * 「换数据库只改基础设施」之所以成立，就是因为用例依赖的是它。
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
