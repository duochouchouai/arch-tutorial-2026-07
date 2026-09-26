/**
 * @file HTTP 响应信封 — 前后端共同的响应形状
 * @author 教程组
 *
 * 成功：{ success: true, data: ... }
 * 失败：{ success: false, message, fieldErrors? }
 *
 * 这是**跨端契约**：uniapp 侧镜像同一份形状（见 day07 前端）。
 * 改这里 = 改契约，先看 GUIDE-day04 的「先加后发」顺序。
 */
import { z } from 'zod'
import type { FieldErrors } from '../domain/errors/index'

export const EnvelopeSchema = z.union([
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({
    success: z.literal(false),
    message: z.string(),
    fieldErrors: z.record(z.array(z.string())).optional(),
  }),
])
export type Envelope = z.infer<typeof EnvelopeSchema>

export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data }
}

export function fail(
  message: string,
  fieldErrors?: FieldErrors | undefined,
): {
  success: false
  message: string
  fieldErrors: FieldErrors | undefined
} {
  return { success: false, message, fieldErrors }
}
