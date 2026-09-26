import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Password } from './password'

describe('Password', () => {
  it('满足复杂度要求的密码构造成功', () => {
    expect(Password.create('passw0rd').value).toBe('passw0rd')
  })

  it('过短抛错', () => {
    expect(() => Password.create('p1')).toThrow(ValidationError)
  })

  it('缺字母或数字抛错', () => {
    expect(() => Password.create('12345678')).toThrow(ValidationError)
    expect(() => Password.create('abcdefgh')).toThrow(ValidationError)
  })

  it('requireComplexity=false 时只校验长度（登录场景不走本 VO）', () => {
    expect(Password.create('12345678', 8, 64, false).value).toBe('12345678')
  })
})
