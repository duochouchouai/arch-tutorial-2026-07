/**
 * @file Code 值对象 — 构造即校验
 * @author 教程组
 */
import { ValidationError } from '../../../shared/index'

const CODE_PATTERN = /^\d{6}$/

export class Code {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  /** 从已校验数据恢复，不做二次校验 */
  static fromTrusted(raw: string): Code {
    return new Code(raw)
  }

  static create(raw: string): Code {
    if (typeof raw !== 'string' || !CODE_PATTERN.test(raw)) {
      throw new ValidationError({ code: ['验证码格式不正确，必须为 6 位数字'] })
    }
    return new Code(raw)
  }
}
