/**
 * @file 登录校验器
 * @author 教程组
 *
 * 只做「非空」级别的最低校验（防明显垃圾请求），**不跑**密码复杂度与用户名格式规则：
 * 那些规则只约束「设置」，不约束「使用」。
 */
import { parseOrThrow } from './schema-parser'
import { ValidationError } from '../../../shared/index'
import { LoginSchema } from '../schemas/api/index'
import type { ValidatedLogin } from '../schemas/validator/index'

export class LoginValidator {
  validate(input: unknown): ValidatedLogin {
    const data = parseOrThrow(LoginSchema, input)
    const username = data.username.trim()
    if (username.length === 0 || data.password.length === 0) {
      throw new ValidationError({ username: ['请输入用户名'], password: ['请输入密码'] })
    }
    return { username, password: data.password }
  }
}
