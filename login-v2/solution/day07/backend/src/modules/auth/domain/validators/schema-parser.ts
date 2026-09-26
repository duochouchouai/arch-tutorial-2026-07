/**
 * @file Schema 解析工具 — Zod 错误 → ValidationError 的唯一转换点
 * @author 教程组
 *
 * 全教程所有「入口校验」都从这里过：safeParse 拿到 issue 列表，
 * 映射成字段级错误。手写 if/else 收集字段错误是旧教程的屎山形态之一。
 */
import type { z } from 'zod'
import { ValidationError, type FieldErrors } from '../../../shared/index'

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (result.success) {
    return result.data
  }
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join('.') || '_'
    const existing = fieldErrors[path]
    if (existing) {
      existing.push(issue.message)
    } else {
      fieldErrors[path] = [issue.message]
    }
  }
  throw new ValidationError(fieldErrors as FieldErrors)
}
