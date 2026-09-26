/**
 * @file 未找到错误
 * @author 教程组
 */
import { AppError } from './app-error'

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, { code: 'NOT_FOUND', statusCode: 404 })
  }
}
