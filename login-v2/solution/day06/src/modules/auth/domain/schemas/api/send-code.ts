/**
 * @file 发送验证码入参 Schema
 * @author 教程组
 */
import { z } from 'zod'

export const SendCodeSchema = z.object({
  email: z.string(),
})
export type SendCode = z.infer<typeof SendCodeSchema>

export const SendCodeResultSchema = z.object({
  email: z.string(),
})
export type SendCodeResult = z.infer<typeof SendCodeResultSchema>
