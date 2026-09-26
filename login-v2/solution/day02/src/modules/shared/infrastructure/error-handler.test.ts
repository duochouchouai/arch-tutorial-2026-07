/**
 * @file 错误处理中间件测试 — 错误 → HTTP 响应的唯一适配点
 * @author 教程组
 *
 * 两条纪律各有测试盯住：
 * 1. AppError 家族按其 statusCode/fieldErrors 响应（客户端能按字段报错）；
 * 2. 预期外错误只回一句「服务器内部错误」，不泄露内部信息。
 */
import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { ConflictError, ValidationError } from '../domain/errors/index'
import { errorHandler } from './error-handler'

function buildApp(thrower: () => never): express.Express {
  const app = express()
  app.get('/boom', () => thrower())
  app.use(errorHandler)
  return app
}

describe('errorHandler', () => {
  it('AppError → 按其 statusCode 与 fieldErrors 响应（ValidationError = 400 + 字段级错误）', async () => {
    const app = buildApp(() => {
      throw new ValidationError({ email: ['邮箱格式不正确'] }, '参数不合法')
    })
    const res = await request(app).get('/boom')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      success: false,
      message: '参数不合法',
      fieldErrors: { email: ['邮箱格式不正确'] },
    })
  })

  it('AppError 家族自定义 statusCode 会透传（如 409 冲突）', async () => {
    const app = buildApp(() => {
      throw new ConflictError('用户名已占用')
    })
    const res = await request(app).get('/boom')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ success: false, message: '用户名已占用' })
  })

  it('预期外错误 → 500 + 固定话术，不泄露堆栈与内部信息', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const app = buildApp(() => {
      throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email')
    })
    const res = await request(app).get('/boom')
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ success: false, message: '服务器内部错误' })
    expect(JSON.stringify(res.body)).not.toContain('SQLITE')
    expect(spy).toHaveBeenCalled() // 全量现场进日志，不进响应
    spy.mockRestore()
  })
})
