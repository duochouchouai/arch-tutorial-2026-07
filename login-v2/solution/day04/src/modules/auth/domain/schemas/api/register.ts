/**
 * @file 注册入参 Schema
 * @author 教程组
 *
 * 只描述形状：哪些字段、什么类型。**不写** .min()/.email() 这类业务规则（它们在 validator）。
 * z.infer 成对导出：需要类型的地方禁止手写 interface 重述。
 */
import { z } from 'zod'
import { PublicUserSchema } from './user'

export const RegisterSchema = z.object({
  username: z.string(),
  password: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  code: z.string(),
})
export type Register = z.infer<typeof RegisterSchema>

export const RegisterResultSchema = z.object({
  user: PublicUserSchema,
})
export type RegisterResult = z.infer<typeof RegisterResultSchema>
