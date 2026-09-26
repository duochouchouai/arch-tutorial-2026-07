import { describe, expect, it } from 'vitest'
import { InvalidCodeError } from '../errors/index'
import { Code } from '../value-objects/index'
import { assertCodeValid } from './code-verification.service'

const code = Code.create('123456')
const stored = { code: '123456', expiresAt: 2_000 }

describe('assertCodeValid', () => {
  it('匹配且未过期：通过', () => {
    expect(() => assertCodeValid(stored, code, 1_999)).not.toThrow()
  })

  it('不存在 / 已过期 / 不匹配：三种失败合并为同一个错误', () => {
    expect(() => assertCodeValid(null, code, 1_000)).toThrow(InvalidCodeError)
    expect(() => assertCodeValid(stored, code, 2_000)).toThrow(InvalidCodeError)
    expect(() => assertCodeValid(stored, Code.create('000000'), 1_000)).toThrow(InvalidCodeError)
  })
})
