/**
 * @file Email 值对象 — 构造即校验
 * @author 教程组
 *
 * 值对象的三条铁律：
 * 1. 构造即校验：非法的 Email 实例在系统里**根本不存在**（不需要到处 if 检查 email 是否合法）；
 * 2. 不可变：private constructor + Object.freeze，外部只能读 value；
 * 3. 两个入口：create（不可信来源，全量校验）与 fromTrusted（DB 等已信任来源，不重复校验）。
 */
import { ValidationError } from '../../../shared/index'

const MAX_LENGTH = 254

export class Email {
  readonly value: string

  private constructor(value: string) {
    this.value = value
    Object.freeze(this)
  }

  toString(): string {
    return this.value
  }

  /** 从已校验数据恢复（DB 行等信任来源），不做二次校验 */
  static fromTrusted(raw: string): Email {
    return new Email(raw)
  }

  /** 从不可信输入构造（API 入参等），任何一条规则不满足即抛错 */
  static create(raw: string): Email {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new ValidationError({ email: ['邮箱不能为空'] })
    }
    if (raw.length > MAX_LENGTH) {
      throw new ValidationError({ email: [`邮箱不能超过 ${MAX_LENGTH} 个字符`] })
    }
    if (raw !== raw.trim()) {
      throw new ValidationError({ email: ['邮箱不能包含首尾空格'] })
    }
    if (raw !== raw.toLowerCase()) {
      throw new ValidationError({ email: ['邮箱必须使用小写字母'] })
    }
    const atIndex = raw.indexOf('@')
    if (atIndex <= 0 || atIndex !== raw.lastIndexOf('@') || atIndex === raw.length - 1) {
      throw new ValidationError({ email: ['邮箱格式不正确'] })
    }
    if (!raw.slice(atIndex + 1).includes('.')) {
      throw new ValidationError({ email: ['邮箱域名格式不正确'] })
    }
    return new Email(raw)
  }
}
