/**
 * @file 发送验证码校验输出 Schema
 * @author 教程组
 */
import { z } from 'zod'
import type { Email } from '../../value-objects/index'

export const ValidatedSendCodeSchema = z.object({
  email: z.custom<Email>(),
})
export type ValidatedSendCode = z.infer<typeof ValidatedSendCodeSchema>
