/**
 * @file 注册校验器 — 形状解析 + 业务规则 + 值对象构造
 * @author 教程组
 *
 * 分工：Schema 只管形状（api/register.ts），本文件管业务规则：
 * 用户名格式、密码强度、邮箱/手机号合法性、验证码格式。
 * 规则改动只动这一个文件，且错误都是字段级（前端能逐字段渲染）。
 */
import { parseOrThrow } from './schema-parser'
import { ValidationError } from '../../../shared/index'
import { RegisterSchema } from '../schemas/api/index'
import type { ValidatedRegister } from '../schemas/validator/index'
import { Code, Email, Password, Phone } from '../value-objects/index'

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/

export class RegisterValidator {
  validate(input: unknown): ValidatedRegister {
    const data = parseOrThrow(RegisterSchema, input)

    const username = data.username.trim()
    if (!USERNAME_PATTERN.test(username)) {
      throw new ValidationError({ username: ['用户名需为 3-20 位字母、数字或下划线'] })
    }

    const password = Password.create(data.password)
    const email = Email.create(data.email)
    const phone = data.phone === undefined ? undefined : Phone.create(data.phone)
    const code = Code.create(data.code)

    return { username, password, email, phone, code }
  }
}
