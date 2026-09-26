/**
 * @file 重置密码入参 Schema
 * @author 教程组
 */
import { z } from 'zod'
import { PublicUserSchema } from './user'

export const ResetPasswordSchema = z.object({
  email: z.string(),
  code: z.string(),
  password: z.string(),
})
export type ResetPassword = z.infer<typeof ResetPasswordSchema>

export const ResetPasswordResultSchema = z.object({
  user: PublicUserSchema,
})
export type ResetPasswordResult = z.infer<typeof ResetPasswordResultSchema>
