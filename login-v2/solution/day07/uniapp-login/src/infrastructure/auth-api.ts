/**
 * @file Auth API 封装 — 全前端唯一出现 uni.request 的地方
 * @author 教程组
 *
 * 这一层做三件事，一件不多：
 * 1. 拼 URL / 塞 Authorization 头（HTTP 细节）；
 * 2. 把响应信封**先 parse 再信**（跨边界数据纪律，与后端同一条）；
 * 3. 把失败信封映射成 ApiError（含 fieldErrors），让上层只认领域错误。
 *
 * 页面与 useXxx 一律不 import 本文件的 uni 用法之外的任何东西 ——
 * 想换 fetch/axios 只改这一个文件（与后端「换数据库只改基础设施」对称）。
 */
import { z } from 'zod'
import { ApiError } from '../domain/errors'
import {
  EmailResultSchema,
  EnvelopeSchema,
  LoginResultSchema,
  RegisterResultSchema,
  ResetPasswordResultSchema,
  SessionResultSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type LoginResult,
  type RegisterInput,
  type RegisterResult,
  type ResetPasswordInput,
  type ResetPasswordResult,
  type SendCodeInput,
  type SessionResult,
} from '../domain/schemas'

const BASE_URL = 'http://localhost:3000/auth'

interface RequestParams {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  /** 请求体（GET 不需要） */
  body?: unknown
  /** 会话 token（需要认证的端点传） */
  token?: string | undefined
}

async function request<T>(schema: z.ZodType<T>, params: RequestParams): Promise<T> {
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (params.token !== undefined) {
    header['Authorization'] = `Bearer ${params.token}`
  }

  const res = await uni.request({
    url: `${BASE_URL}${params.path}`,
    method: params.method,
    header,
    data: params.body,
  })

  // 响应也是跨边界数据：契约不符就当服务端出错，别拿半截数据继续跑
  const envelope = EnvelopeSchema.safeParse(res.data)
  if (!envelope.success) {
    throw new ApiError('服务端响应不符合契约', res.statusCode)
  }

  if (!envelope.data.success) {
    throw new ApiError(envelope.data.message, res.statusCode, envelope.data.fieldErrors)
  }

  return schema.parse(envelope.data.data)
}

export const authApi = {
  sendCode(input: SendCodeInput): Promise<{ email: string }> {
    return request(EmailResultSchema, { method: 'POST', path: '/send-code', body: input })
  },

  register(input: RegisterInput): Promise<RegisterResult> {
    return request(RegisterResultSchema, { method: 'POST', path: '/register', body: input })
  },

  login(input: LoginInput): Promise<LoginResult> {
    return request(LoginResultSchema, { method: 'POST', path: '/login', body: input })
  },

  session(token: string): Promise<SessionResult> {
    return request(SessionResultSchema, { method: 'GET', path: '/session', token })
  },

  logout(token: string): Promise<Record<string, never>> {
    return request(z.object({}), { method: 'DELETE', path: '/session', token })
  },

  forgotPassword(input: ForgotPasswordInput): Promise<{ email: string }> {
    return request(EmailResultSchema, { method: 'POST', path: '/forgot-password', body: input })
  },

  resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    return request(ResetPasswordResultSchema, { method: 'POST', path: '/reset-password', body: input })
  },
}
