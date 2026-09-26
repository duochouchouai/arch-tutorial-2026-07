/**
 * @file 忘记密码（申请重置码）入参 Schema
 * @author 教程组
 *
 * 只描述形状；邮箱是否合法由 validator 判断。
 * 响应形状与 send-code 一致（{ email }）：**不透露该邮箱是否注册**。
 */
import { z } from 'zod'

export const ForgotPasswordSchema = z.object({
  email: z.string(),
})
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>

export const ForgotPasswordResultSchema = z.object({
  email: z.string(),
})
export type ForgotPasswordResult = z.infer<typeof ForgotPasswordResultSchema>
