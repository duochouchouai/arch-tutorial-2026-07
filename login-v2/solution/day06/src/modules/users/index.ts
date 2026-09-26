/**
 * @file users 模块公开入口 — 纯 barrel
 * @author 教程组
 *
 * 只发布三类东西：
 * 1. 组合根（createUsersModule）—— 供 main.ts 装配；
 * 2. 跨模块契约（UserAccountPublicPort）；
 * 3. 行形状（UserRowSchema + UserRow）—— auth 的实体需要用它做 fromData/toRow 桥接。
 *
 * 仓储端口（UserAccountRepositoryPort）与仓储实现**不在**此处发布：它们模块内部件。
 */
export { createUsersModule } from './compose'
export type { UsersModule, UsersModuleDeps } from './compose'
export type { UserAccountPublicPort } from './domain/ports/index'
export { UserRowSchema } from './domain/schemas/index'
export type { UserRow } from './domain/schemas/index'
