/**
 * @file 校验错误 — 输入不合法
 * @author 教程组
 *
 * 全教程唯一「字段级错误」的载体：谁抛错谁负责给出字段名与文案，
 * 前端拿到 fieldErrors 可以直接渲染到对应输入框下面。
 */
import { AppError, type FieldErrors } from './app-error'

export class ValidationError extends AppError {
  constructor(fieldErrors: FieldErrors, message = '输入校验未通过') {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, fieldErrors })
  }
}
