/**
 * @file users 模块对外公共端口 — 账号读写（供 auth 等模块消费）
 * @author 教程组
 *
 * 模块间协作契约：其他模块**只允许**通过这里使用 users 的能力，
 * 不允许 import users 模块的内部实现（仓储、表 DDL、应用服务）。
 *
 * users 表读写收敛于此：auth 要建账号、要按用户名查账号，全走本端口；
 * 任何模块直写 users 表 SQL 都会造成「两份口径」，见 GUIDE-day06「违规 → 症状」。
 *
 * 「窄口」在真实仓库里的形态：同一个提供方按**消费者**切多个端口
 * （只给 A 用的方法不进给 B 的端口）。本教程只有一个消费者（auth），
 * 故合成了一个端口 + 文件头注释标明契约动机。
 */
import type { UserRow } from '../schemas/index'

export interface UserAccountPublicPort {
  findByUsername(username: string): Promise<UserRow | null>
  findByEmail(email: string): Promise<UserRow | null>
  /** 新建（id 由调用方生成，见 IdGenerator 端口） */
  insert(row: UserRow): Promise<void>
  /** 全量更新既有行（登录后写回失败次数/锁定状态/登录时间也走这里） */
  update(row: UserRow): Promise<void>
}
