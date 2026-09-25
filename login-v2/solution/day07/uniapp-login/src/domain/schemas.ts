/**
 * 前端 Zod 校验
 *
 * 放在 domain 层，所有用例入口共享同一份校验规则。
 * 校验在调 authApi 之前执行，不通过直接返回错误信息，不发起网络请求。
 */
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
