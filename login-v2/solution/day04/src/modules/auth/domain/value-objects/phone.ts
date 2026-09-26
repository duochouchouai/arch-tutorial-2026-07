/**
 * @file Phone 值对象 — 构造即校验
 * @author 教程组
 *
 * 「什么算合法手机号」的口径只在这里一份。任何模块、任何层要判断手机号，
 * 都不得重写一遍正则 —— 判据归属见 GUIDE-day06。
 */
import { ValidationError } from '../../../shared/index'

const PHONE_PATTERN = /^1[3-9]\d{9}$/

export class Phone {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  /** 从已校验数据恢复（DB 行等信任来源），不做二次校验 */
  static fromTrusted(raw: string): Phone {
    return new Phone(raw)
  }

  static create(raw: string): Phone {
    if (typeof raw !== 'string' || !PHONE_PATTERN.test(raw)) {
      throw new ValidationError({ phone: ['手机号格式不正确'] })
    }
    return new Phone(raw)
  }
}
