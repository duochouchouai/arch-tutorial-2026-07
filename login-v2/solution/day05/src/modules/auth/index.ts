/**
 * @file auth 模块公开入口 — 纯 barrel
 * @author 教程组
 *
 * 发布：组合根（供 main.ts）、面向表现层的路由工厂（含在 AuthModule 里）、
 * 以及事件类型（供 Day 07 的 notifications 订阅 —— 事件是 auth 对外的事实，
 * 类型必须从公共面出，订阅方不许 import auth/domain/events 内部路径）。
 */
export { createAuthModule } from './compose'
export type { AuthModule, AuthModuleDeps } from './compose'
export { UserRegisteredEvent, UserRegisteredPayloadSchema } from './domain/events/index'
export type { UserRegisteredPayload } from './domain/events/index'
export { PublicUserSchema, RegisterResultSchema, LoginResultSchema, SendCodeResultSchema } from './domain/schemas/index'
export type { PublicUser, RegisterResult, LoginResult, SendCodeResult } from './domain/schemas/index'
