/**
 * @file users 表行 Schema — 单一真理源（SSOT）
 * @author 教程组
 *
 * 形状 vs 业务规则：这里只描述「有哪些列、什么类型、可空与否」。
 * 「用户名 3-20 位」「密码必须含字母数字」这类**业务规则**不在 Schema 里 ——
 * 它们属于 auth 的 domain/validators/（见 GUIDE-day04）。
 *
 * 全项目任何地方都不得再手写 interface/type 重述这个形状：
 * 需要类型时 `z.infer`（本文件已导出 UserRow），需要校验时 `.parse()`。
 */
import { z } from 'zod'

export const UserRowSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  passwordHash: z.string(),
  /** 连续登录失败次数（登录成功清零） */
  failedAttempts: z.number().int(),
  /** 锁定截止时间（Unix 毫秒；null = 未锁定） */
  lockedUntil: z.number().int().nullable(),
  lastLoginAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type UserRow = z.infer<typeof UserRowSchema>
