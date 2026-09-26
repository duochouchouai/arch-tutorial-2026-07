/**
 * @file 用户类型 — 唯一出口是 Schema 的 z.infer
 * @author 教程组
 *
 * 前端不允许手写 interface User 重述形状（旧教程就是这么和后端漂移的）。
 */
export type { PublicUser, LoginResult, SessionResult, RegisterResult, ResetPasswordResult } from './schemas'
