/**
 * @file 前端领域 Schema — 与后端同形（响应信封 / 用户形状 / 各入口入参）
 * @author 教程组
 *
 * 三条纪律：
 * 1. **响应信封与后端 shared/schemas/envelope.ts 是同一份契约**：后端改了信封，
 *    这里必须改（先加后发：先让前端兼容新旧两版，后端再发）。
 * 2. 入参 Schema 做「前端能做的校验」：形状、必填、明显格式错误 —— 目的是少发无效请求；
 *    密码强度这类**判据归属在后端**，前端只是提前提示，不代替后端校验。
 * 3. 所有网络出入数据都从 Schema 走：`z.infer` 出类型，禁止另写 interface 重述。
 */
import { z } from 'zod'

/* ──────── 跨端契约 ──────── */

export const EnvelopeSchema = z.union([
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({
    success: z.literal(false),
    message: z.string(),
    fieldErrors: z.record(z.array(z.string())).optional(),
  }),
])
export type Envelope = z.infer<typeof EnvelopeSchema>

export const PublicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
})
export type PublicUser = z.infer<typeof PublicUserSchema>

export const LoginResultSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
})
export type LoginResult = z.infer<typeof LoginResultSchema>

export const SessionResultSchema = z.object({
  userId: z.string(),
})
export type SessionResult = z.infer<typeof SessionResultSchema>

export const RegisterResultSchema = z.object({ user: PublicUserSchema })
export type RegisterResult = z.infer<typeof RegisterResultSchema>

export const EmailResultSchema = z.object({ email: z.string() })
export type EmailResult = z.infer<typeof EmailResultSchema>

export const ResetPasswordResultSchema = z.object({ user: PublicUserSchema })
export type ResetPasswordResult = z.infer<typeof ResetPasswordResultSchema>

/* ──────── 入口校验 ──────── */

const EmailField = z.string().min(1, '请输入邮箱').email('邮箱格式不正确')
const CodeField = z.string().regex(/^\d{6}$/, '验证码为 6 位数字')
const PasswordField = z
  .string()
  .min(8, '密码至少 8 位')
  .max(64, '密码最多 64 位')
  .regex(/[A-Za-z]/, '密码需包含字母')
  .regex(/\d/, '密码需包含数字')

export const SendCodeInputSchema = z.object({ email: EmailField })
export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3, '用户名 3-20 位字母、数字或下划线')
    .max(20, '用户名 3-20 位字母、数字或下划线')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名 3-20 位字母、数字或下划线'),
  password: PasswordField,
  email: EmailField,
  code: CodeField,
})
export const LoginInputSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})
export const ForgotPasswordInputSchema = z.object({ email: EmailField })
export const ResetPasswordInputSchema = z.object({
  email: EmailField,
  code: CodeField,
  password: PasswordField,
})

export type SendCodeInput = z.infer<typeof SendCodeInputSchema>
export type RegisterInput = z.infer<typeof RegisterInputSchema>
export type LoginInput = z.infer<typeof LoginInputSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>
