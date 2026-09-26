import { describe, expect, it } from 'vitest'
import { CryptoIdGenerator } from './crypto-id-generator'

describe('CryptoIdGenerator', () => {
  it('生成的 id 长度正确且不重复', () => {
    const generator = new CryptoIdGenerator(16)
    const ids = new Set(Array.from({ length: 100 }, () => generator.generate()))
    expect(ids.size).toBe(100)
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{32}$/)
    }
  })
})
