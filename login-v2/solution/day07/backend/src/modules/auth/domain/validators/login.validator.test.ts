import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { LoginValidator } from './login.validator'

const validator = new LoginValidator()

describe('LoginValidator', () => {
  it('用户名去掉首尾空格后返回', () => {
    expect(validator.validate({ username: '  alice ', password: 'x' })).toEqual({
      username: 'alice',
      password: 'x',
    })
  })

  it('空用户名 / 空密码抛字段级错误', () => {
    expect(() => validator.validate({ username: '  ', password: 'x' })).toThrow(ValidationError)
    expect(() => validator.validate({ username: 'alice', password: '' })).toThrow(ValidationError)
  })

  it('刻意不跑密码复杂度：简短的历史密码也能登录', () => {
    expect(validator.validate({ username: 'alice', password: '123' })).toEqual({ username: 'alice', password: '123' })
  })
})
