/**
 * @file auth 模块公开入口 — 纯 barrel
 * @author 教程组
 *
 * 跨模块只允许 import 这个文件（`modules/auth/index`）。
 * 本阶段只发布：组合根 + 面向外部的结果形状（PublicUser 等）。
 */
export { createAuthModule } from './compose'
export type { AuthModule } from './compose'
export { PublicUserSchema } from './domain/schemas/index'
export type { PublicUser } from './domain/schemas/index'
