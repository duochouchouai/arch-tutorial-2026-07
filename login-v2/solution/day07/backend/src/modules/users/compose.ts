/**
 * @file 用户模块组合根 — 依赖装配
 * @author 教程组
 *
 * 只有「组合者」（main.ts）可以 import 本文件（经由 index.ts 转发）。
 * 装配完只交出一个公共端口，内部件（仓储实现、应用服务）不出模块。
 */
import type { DatabaseSync } from 'node:sqlite'
import type { UserAccountPublicPort } from './domain/ports/index'
import { UserAccountPublicService } from './application/index'
import { PostgresUserAccountRepository, SqliteUserAccountRepository } from './infrastructure/index'

export interface UsersModuleDeps {
  /** SQLite 连接（默认实现用；auth 自己的两张表也走它） */
  db: DatabaseSync
  /** 设置后账号表改走 PostgreSQL（Day 07）；仓储构造函数会建表 */
  databaseUrl?: string | undefined
}

export interface UsersModule {
  /** 账号公共端口 —— auth 模块的唯一入口 */
  readonly account: UserAccountPublicPort
}

export function createUsersModule(deps: UsersModuleDeps): UsersModule {
  // 实现的选择只发生在这里：往上（用例）/ 往外（auth）看到的都只是端口
  const repository =
    deps.databaseUrl === undefined
      ? new SqliteUserAccountRepository(deps.db)
      : new PostgresUserAccountRepository(deps.databaseUrl)
  return { account: new UserAccountPublicService(repository) }
}
