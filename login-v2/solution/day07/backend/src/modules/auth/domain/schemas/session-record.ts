/**
 * @file 会话存储记录 Schema
 * @author 教程组
 */
import { z } from 'zod'

export const StoredSessionSchema = z.object({
  userId: z.string(),
  /** 过期时间（Unix 毫秒） */
  expiresAt: z.number().int(),
})
export type StoredSession = z.infer<typeof StoredSessionSchema>
