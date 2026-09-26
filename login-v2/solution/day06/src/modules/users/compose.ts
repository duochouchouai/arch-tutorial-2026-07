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
import { SqliteUserAccountRepository } from './infrastructure/index'

export interface UsersModuleDeps {
  db: DatabaseSync
}

export interface UsersModule {
  /** 账号公共端口 —— auth 模块的唯一入口 */
  readonly account: UserAccountPublicPort
}

export function createUsersModule(deps: UsersModuleDeps): UsersModule {
  const repository = new SqliteUserAccountRepository(deps.db)
  return { account: new UserAccountPublicService(repository) }
}
