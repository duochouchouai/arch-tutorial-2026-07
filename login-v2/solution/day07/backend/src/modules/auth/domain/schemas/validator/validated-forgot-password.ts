/**
 * @file 忘记密码校验输出 Schema
 * @author 教程组
 */
import { z } from 'zod'
import type { Email } from '../../value-objects/index'

export const ValidatedForgotPasswordSchema = z.object({
  email: z.custom<Email>(),
})
export type ValidatedForgotPassword = z.infer<typeof ValidatedForgotPasswordSchema>
