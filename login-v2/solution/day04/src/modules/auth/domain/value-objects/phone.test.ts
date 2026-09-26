import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Phone } from './phone'

describe('Phone', () => {
  it('合法手机号构造成功', () => {
    expect(Phone.create('13800138000').value).toBe('13800138000')
  })

  it.each(['1234567890', '23800138000', '1380013800', '138001380001', 'abcdefghijk'])(
    '非法手机号抛 ValidationError：%s',
    (raw) => {
      expect(() => Phone.create(raw)).toThrow(ValidationError)
    },
  )
})
