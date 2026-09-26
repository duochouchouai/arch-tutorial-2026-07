/**
 * @file auth 模块公开入口 — 纯 barrel
 * @author 教程组
 *
 * 跨模块只允许 import 这个文件（`modules/auth/index`）。
 * 本阶段只发布组合根：模块里还没有对外形状。
 */
export { createAuthModule } from './compose'
export type { AuthModule } from './compose'
