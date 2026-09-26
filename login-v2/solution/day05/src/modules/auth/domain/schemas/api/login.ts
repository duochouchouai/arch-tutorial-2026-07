/**
 * @file 登录入参 Schema
 * @author 教程组
 */
import { z } from 'zod'
import { PublicUserSchema } from './user'

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
})
export type Login = z.infer<typeof LoginSchema>

export const LoginResultSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
})
export type LoginResult = z.infer<typeof LoginResultSchema>
