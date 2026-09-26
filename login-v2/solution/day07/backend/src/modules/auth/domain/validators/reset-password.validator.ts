/**
 * @file 重置密码校验器
 * @author 教程组
 *
 * 新密码同样走 Password 值对象的强度规则 —— 「重置入口」不是弱密码的后门。
 */
import { parseOrThrow } from './schema-parser'
import { ResetPasswordSchema } from '../schemas/api/index'
import type { ValidatedResetPassword } from '../schemas/validator/index'
import { Code, Email, Password } from '../value-objects/index'

export class ResetPasswordValidator {
  validate(input: unknown): ValidatedResetPassword {
    const data = parseOrThrow(ResetPasswordSchema, input)
    return {
      email: Email.create(data.email),
      code: Code.create(data.code),
      password: Password.create(data.password),
    }
  }
}
