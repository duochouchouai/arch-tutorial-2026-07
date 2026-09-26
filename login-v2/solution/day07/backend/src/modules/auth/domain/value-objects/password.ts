/**
 * @file Password 值对象 — 构造即校验
 * @author 教程组
 *
 * 注意：本对象只持有**明文用于校验的瞬间**，不会被持久化 ——
 * 落库的永远是 PasswordHasher 产出的哈希（见 domain/ports/password-hasher.port.ts）。
 * 复杂度规则只用于「设置密码」场景（注册 / 改密）；
 * 登录校验密码时不跑本 VO（否则规则一改，老用户全部登不进来），见 LoginValidator。
 */
import { ValidationError } from '../../../shared/index'

export class Password {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  /** 从已校验数据恢复，不做二次校验 */
  static fromTrusted(raw: string): Password {
    return new Password(raw)
  }

  static create(raw: string, minLength = 8, maxLength = 64, requireComplexity = true): Password {
    if (typeof raw !== 'string') {
      throw new ValidationError({ password: ['密码格式不正确'] })
    }
    if (raw.length < minLength) {
      throw new ValidationError({ password: [`密码长度不能少于 ${minLength} 位`] })
    }
    if (raw.length > maxLength) {
      throw new ValidationError({ password: [`密码长度不能超过 ${maxLength} 位`] })
    }
    if (requireComplexity && !/[a-zA-Z]/.test(raw)) {
      throw new ValidationError({ password: ['密码必须包含字母'] })
    }
    if (requireComplexity && !/\d/.test(raw)) {
      throw new ValidationError({ password: ['密码必须包含数字'] })
    }
    return new Password(raw)
  }
}
