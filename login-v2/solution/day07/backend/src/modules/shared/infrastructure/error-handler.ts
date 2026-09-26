/**
 * @file Express 错误处理中间件 — 错误 → HTTP 响应的唯一适配点
 * @author 教程组
 *
 * 预期内错误（AppError 家族）：按其 code/statusCode/fieldErrors 响应。
 * 预期外错误：日志留全量现场，响应只给一句话 —— 不把堆栈和内部信息泄露给客户端。
 */
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import { AppError } from '../domain/errors/index'
import { fail } from '../schemas/index'

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.message, err.fieldErrors))
    return
  }
  console.error('[unexpected error]', err)
  res.status(500).json(fail('服务器内部错误'))
}
