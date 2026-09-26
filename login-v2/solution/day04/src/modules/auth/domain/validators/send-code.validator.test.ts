import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Email } from '../value-objects/index'
import { SendCodeValidator } from './send-code.validator'

describe('SendCodeValidator', () => {
  it('合法邮箱转成 Email 值对象', () => {
    expect(new SendCodeValidator().validate({ email: 'alice@example.com' }).email).toBeInstanceOf(Email)
  })

  it('邮箱非法抛错', () => {
    expect(() => new SendCodeValidator().validate({ email: 'nope' })).toThrow(ValidationError)
  })
})
