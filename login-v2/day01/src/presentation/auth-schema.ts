import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(3, '用户名至少3个字符'),
    password: z.string().min(6, '密码至少6个字符'),
    email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
});

export const loginSchema = z.object({
    username: z.string().min(1,'请输入用户名'),
    password: z.string().min(1,'请输入密码'),
});