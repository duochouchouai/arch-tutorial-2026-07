/**
 * @file 验证码存储记录 Schema
 * @author 教程组
 *
 * 验证码落库/出库也是跨边界，形状同样有唯一出处。
 */
import { z } from 'zod'

export const StoredCodeSchema = z.object({
  code: z.string(),
  /** 过期时间（Unix 毫秒） */
  expiresAt: z.number().int(),
})
export type StoredCode = z.infer<typeof StoredCodeSchema>
