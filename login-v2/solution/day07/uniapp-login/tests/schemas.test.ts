/**
 * @file 前端入口 Schema 测试 — 校验规则的前端侧边界
 * @author 教程组
 */
import { describe, expect, it } from 'vitest'
import {
  LoginInputSchema,
  RegisterInputSchema,
  SendCodeInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
} from '../src/domain/schemas'

describe('入口 Schema', () => {
  it('登录：用户名/密码非空即可（真伪由后端判）', () => {
    expect(LoginInputSchema.safeParse({ username: 'alice', password: 'x' }).success).toBe(true)
    expect(LoginInputSchema.safeParse({ username: '', password: 'x' }).success).toBe(false)
  })

  it('注册：用户名 3-20 位字母数字下划线、密码含字母与数字、验证码 6 位数字', () => {
    const good = { username: 'alice_01', password: 'passw0rd', email: 'a@b.com', code: '123456' }
    expect(RegisterInputSchema.safeParse(good).success).toBe(true)

    expect(RegisterInputSchema.safeParse({ ...good, username: 'ab' }).success).toBe(false)
    expect(RegisterInputSchema.safeParse({ ...good, username: 'alice 01' }).success).toBe(false)
    expect(RegisterInputSchema.safeParse({ ...good, password: 'passwordOnly' }).success).toBe(false)
    expect(RegisterInputSchema.safeParse({ ...good, code: '12345' }).success).toBe(false)
  })

  it('发码 / 忘记密码：只收合法邮箱', () => {
    expect(SendCodeInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
    expect(ForgotPasswordInputSchema.safeParse({ email: 'alice@example.com' }).success).toBe(true)
  })

  it('重置密码：邮箱 + 验证码 + 新密码（重置入口不放松强度）', () => {
    const base = { email: 'alice@example.com', code: '123456' }
    expect(ResetPasswordInputSchema.safeParse({ ...base, password: 'new-passw0rd' }).success).toBe(true)
    expect(ResetPasswordInputSchema.safeParse({ ...base, password: '123' }).success).toBe(false)
  })

  it('错误信息是字段级文案（前端直接展示）', () => {
    const result = SendCodeInputSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('请输入邮箱')
    }
  })
})
