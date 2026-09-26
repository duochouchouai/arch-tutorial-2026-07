import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Email, Password } from '../value-objects/index'
import { RegisterValidator } from './register.validator'

const validator = new RegisterValidator()

const validInput = {
  username: 'alice',
  password: 'passw0rd',
  email: 'alice@example.com',
  code: '123456',
}

describe('RegisterValidator', () => {
  it('合法输入产出装好值对象的管道产物', () => {
    const result = validator.validate({ ...validInput, phone: '13800138000' })
    expect(result.username).toBe('alice')
    expect(result.email).toBeInstanceOf(Email)
    expect(result.password).toBeInstanceOf(Password)
    expect(result.phone?.value).toBe('13800138000')
    expect(result.code.value).toBe('123456')
  })

  it('不传 phone 时 phone 为空（可选字段）', () => {
    expect(validator.validate(validInput).phone).toBeUndefined()
  })

  it('用户名格式不符：字段级错误指向 username', () => {
    try {
      validator.validate({ ...validInput, username: 'a!' })
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).fieldErrors).toHaveProperty('username')
    }
  })

  it('密码不够强：错误来自 Password 值对象', () => {
    expect(() => validator.validate({ ...validInput, password: '123' })).toThrow(ValidationError)
  })

  it('邮箱非法 / 验证码非法：各自的字段级错误', () => {
    expect(() => validator.validate({ ...validInput, email: 'not-an-email' })).toThrow(ValidationError)
    expect(() => validator.validate({ ...validInput, code: 'abc' })).toThrow(ValidationError)
  })

  it('缺字段：形状解析阶段就拦下（安全解析 → 字段错误）', () => {
    const { password: _password, ...withoutPassword } = validInput
    expect(() => validator.validate(withoutPassword)).toThrow(ValidationError)
  })
})
