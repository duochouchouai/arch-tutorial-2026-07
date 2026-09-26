/**
 * @file 冲突错误 — 资源已存在 / 状态冲突
 * @author 教程组
 */
import { AppError, type FieldErrors } from './app-error'

export class ConflictError extends AppError {
  constructor(message = '资源冲突', fieldErrors?: FieldErrors | undefined) {
    super(message, { code: 'CONFLICT', statusCode: 409, fieldErrors })
  }
}
