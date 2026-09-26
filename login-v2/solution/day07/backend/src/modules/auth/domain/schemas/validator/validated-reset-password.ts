/**
 * @file 重置密码校验输出 Schema
 * @author 教程组
 */
import { z } from 'zod'
import type { Code, Email, Password } from '../../value-objects/index'

export const ValidatedResetPasswordSchema = z.object({
  email: z.custom<Email>(),
  code: z.custom<Code>(),
  password: z.custom<Password>(),
})
export type ValidatedResetPassword = z.infer<typeof ValidatedResetPasswordSchema>
