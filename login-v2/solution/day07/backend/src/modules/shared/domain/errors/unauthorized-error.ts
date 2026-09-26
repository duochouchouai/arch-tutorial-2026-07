/**
 * @file 未认证错误
 * @author 教程组
 */
import { AppError } from './app-error'

export class UnauthorizedError extends AppError {
  constructor(message = '未登录或会话已失效') {
    super(message, { code: 'UNAUTHORIZED', statusCode: 401 })
  }
}
