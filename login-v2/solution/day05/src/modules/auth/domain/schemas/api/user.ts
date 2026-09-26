/**
 * @file 用户对外形状 Schema
 * @author 教程组
 *
 * 响应里出现的用户形状**只有这一份**（toSnapshot 的返回类型）。
 * passwordHash、failedAttempts 这类内部字段永远不出现在这里 ——
 * 输出形状是白名单，不是「把实体减掉几个字段」。
 */
import { z } from 'zod'

export const PublicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
})
export type PublicUser = z.infer<typeof PublicUserSchema>
