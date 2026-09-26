/**
 * @file 用户注册领域事件
 * @author 教程组
 *
 * 新账号创建成功后发布。订阅方（Day 07 的 notifications）把「注册」变成通知落库。
 * 发布方（auth）不知道订阅方的存在 —— 新增订阅方不改 auth 一行代码。
 *
 * payload 也走 Schema（跨边界：事件可能被序列化/落库重放，反序列化后必须 .parse() 再信）。
 */
import { z } from 'zod'
import { DomainEvent } from '../../../shared/index'

export const UserRegisteredPayloadSchema = z.object({
  userId: z.string(),
  username: z.string(),
  /** 注册邮箱（订阅方发欢迎邮件要用 —— 事件载荷内自带，别让订阅方回查） */
  email: z.string(),
  /** 注册时间（Unix 毫秒） */
  registeredAt: z.number().int(),
})
export type UserRegisteredPayload = z.infer<typeof UserRegisteredPayloadSchema>

export class UserRegisteredEvent extends DomainEvent {
  readonly userId: string
  readonly username: string
  readonly email: string
  readonly registeredAt: number

  constructor(payload: UserRegisteredPayload) {
    super(payload.registeredAt)
    this.userId = payload.userId
    this.username = payload.username
    this.email = payload.email
    this.registeredAt = payload.registeredAt
  }
}
