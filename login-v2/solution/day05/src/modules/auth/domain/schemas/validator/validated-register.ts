/**
 * @file 注册校验输出 Schema — Validator 的返回形状
 * @author 教程组
 *
 * 注意这不是「数据形状」：它是**领域管道产物** —— 字段已经转成了值对象，
 * 带上了不变量（能返回就必然合法）。z.custom<T>() 让管道产物也保持
 * 「类型来自 Schema」的单一出处，而不是手写 interface。
 */
import { z } from 'zod'
import type { Code, Email, Password, Phone } from '../../value-objects/index'

export const ValidatedRegisterSchema = z.object({
  username: z.string(),
  password: z.custom<Password>(),
  email: z.custom<Email>(),
  phone: z.custom<Phone>().optional(),
  code: z.custom<Code>(),
})
export type ValidatedRegister = z.infer<typeof ValidatedRegisterSchema>
