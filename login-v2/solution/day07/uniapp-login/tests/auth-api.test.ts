/**
 * @file auth-api 测试 — 用假 uni.request 验证「请求形状」与「信封 → ApiError」映射
 * @author 教程组
 *
 * 为什么敢直接测基础设施：它不含业务判断，只做协议转换；
 * 用替身把 uni.request 换掉之后，「发给后端的 URL / 头 / body」和
 * 「后端错误怎么变成前端错误」都是可断言的纯数据。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/domain/errors'
import { authApi } from '../src/infrastructure/auth-api'

interface CapturedCall {
  url: string
  method?: string
  header?: Record<string, string>
  data?: unknown
}

let calls: CapturedCall[] = []
let respond: { statusCode: number; data: unknown }

beforeEach(() => {
  calls = []
  respond = { statusCode: 200, data: { success: true, data: {} } }
  vi.stubGlobal('uni', {
    request: (options: CapturedCall) => {
      calls.push(options)
      return Promise.resolve(respond)
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authApi', () => {
  it('login：POST /auth/login，成功信封解包后按 Schema 校验', async () => {
    respond = {
      statusCode: 200,
      data: {
        success: true,
        data: { token: 't-1', user: { id: 'u1', username: 'alice', email: 'a@b.com', phone: null } },
      },
    }

    const result = await authApi.login({ username: 'alice', password: 'passw0rd' })

    expect(calls[0]?.url).toBe('http://localhost:3000/auth/login')
    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.data).toEqual({ username: 'alice', password: 'passw0rd' })
    expect(result.token).toBe('t-1')
    expect(result.user.username).toBe('alice')
  })

  it('session / logout：GET、DELETE + Authorization: Bearer 头', async () => {
    respond = { statusCode: 200, data: { success: true, data: { userId: 'u1' } } }
    await authApi.session('t-1')
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.header?.['Authorization']).toBe('Bearer t-1')

    respond = { statusCode: 200, data: { success: true, data: {} } }
    await authApi.logout('t-1')
    expect(calls[1]?.method).toBe('DELETE')
    expect(calls[1]?.url).toBe('http://localhost:3000/auth/session')
  })

  it('失败信封 → ApiError（含 statusCode 与 fieldErrors）', async () => {
    respond = {
      statusCode: 400,
      data: { success: false, message: '输入校验未通过', fieldErrors: { code: ['验证码不正确'] } },
    }

    const error = await authApi
      .resetPassword({ email: 'a@b.com', code: '000000', password: 'new-passw0rd' })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    if (error instanceof ApiError) {
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('输入校验未通过')
      expect(error.fieldError('code')).toBe('验证码不正确')
    }
  })

  it('423 锁定：错误原样带出（页面按状态码分支提示）', async () => {
    respond = { statusCode: 423, data: { success: false, message: '账号已锁定，请稍后再试' } }
    const error = await authApi.login({ username: 'alice', password: 'x' }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    if (error instanceof ApiError) {
      expect(error.statusCode).toBe(423)
    }
  })

  it('响应不符合信封契约 → ApiError（不拿半截数据继续跑）', async () => {
    respond = { statusCode: 200, data: { hello: 'world' } }
    const error = await authApi.session('t-1').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    if (error instanceof ApiError) {
      expect(error.message).toBe('服务端响应不符合契约')
    }
  })

  it('成功信封但 data 形状不符 → 抛错（Schema 是最后一道闸）', async () => {
    respond = { statusCode: 200, data: { success: true, data: { token: 123 } } }
    await expect(authApi.login({ username: 'a', password: 'x' })).rejects.toBeTruthy()
  })
})
