/**
 * @file 发送验证码校验器
 * @author 教程组
 */
import { parseOrThrow } from './schema-parser'
import { SendCodeSchema } from '../schemas/api/index'
import type { ValidatedSendCode } from '../schemas/validator/index'
import { Email } from '../value-objects/index'

export class SendCodeValidator {
  validate(input: unknown): ValidatedSendCode {
    const data = parseOrThrow(SendCodeSchema, input)
    return { email: Email.create(data.email) }
  }
}
