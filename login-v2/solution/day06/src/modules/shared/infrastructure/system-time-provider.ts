/**
 * @file 系统时间源 — 基础设施实现
 * @author 教程组
 */
import type { TimeProvider } from '../domain/ports/index'

export class SystemTimeProvider implements TimeProvider {
  now(): number {
    return Date.now()
  }
}
