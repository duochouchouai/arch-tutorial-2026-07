/**
 * @file 忘记密码校验器
 * @author 教程组
 */
import { parseOrThrow } from './schema-parser'
import { ForgotPasswordSchema } from '../schemas/api/index'
import type { ValidatedForgotPassword } from '../schemas/validator/index'
import { Email } from '../value-objects/index'

export class ForgotPasswordValidator {
  validate(input: unknown): ValidatedForgotPassword {
    const data = parseOrThrow(ForgotPasswordSchema, input)
    return { email: Email.create(data.email) }
  }
}
