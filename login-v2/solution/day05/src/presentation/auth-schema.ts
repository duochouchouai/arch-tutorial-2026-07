import { z } from 'zod';

/**
 * Zod 校验 schema
 *
 * 在 presentation 层定义请求体的校验规则。
 * 对比 v1：v1 的校验散落在 handler 里（if/else + 复制粘贴）。
 * 这里用 schema 集中定义，类型安全 + 可复用。
 */
export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
});

export const autoLoginSchema = z.object({
  token: z.string().min(1, 'token 不能为空'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'token 不能为空'),
  newPassword: z.string().min(6, '密码至少6个字符'),
});

export const oauthSchema = z.object({
  provider: z.enum(['wechat', 'qq'], { message: '不支持的登录方式（支持 wechat / qq）' }),
  code: z.string().min(1, 'code 不能为空'),
});
