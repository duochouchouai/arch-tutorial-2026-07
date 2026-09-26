import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../../shared/index'
import { Email } from './email'

describe('Email', () => {
  it('合法邮箱构造成功并可读值', () => {
    const email = Email.create('alice@example.com')
    expect(email.value).toBe('alice@example.com')
    expect(String(email)).toBe('alice@example.com')
  })

  it('实例被冻结（不可变）', () => {
    const email = Email.create('alice@example.com')
    expect(Object.isFrozen(email)).toBe(true)
  })

  it.each([
    ['', '空'],
    ['ALICE@example.com', '含大写'],
    [' alice@example.com', '首尾空格'],
    ['alice@@example.com', '两个 @'],
    ['@example.com', '缺用户名'],
    ['alice@', '缺域名'],
    ['alice@example', '域名无点'],
  ])('非法输入同步抛 ValidationError：%s（%s）', (raw) => {
    expect(() => Email.create(raw)).toThrow(ValidationError)
  })

  it('fromTrusted 跳过校验（DB 行等信任来源）', () => {
    // 即使是格式古怪的历史数据，恢复路径也不抛错 —— 校验只在入口发生一次
    const email = Email.fromTrusted('legacy-data@internal')
    expect(email.value).toBe('legacy-data@internal')
  })
})
