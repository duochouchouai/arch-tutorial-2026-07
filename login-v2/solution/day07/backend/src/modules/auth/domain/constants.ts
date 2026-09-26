/**
 * @file auth 领域常量
 * @author 教程组
 *
 * 业务数字只在这里出现一次：实体与用例引用常量，测试也引用同一常量 ——
 * 规则改动只改这一行，测试断言跟着走。
 */
/** 连续登录失败达到该次数即触发一次锁定 */
export const MAX_FAILED_ATTEMPTS = 5

/** 验证码有效期（5 分钟） */
export const CODE_TTL_MS = 5 * 60 * 1000
/** 会话有效期（30 天） */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 递进式锁定时长阶梯（Day 07）：第一次被锁 5 分钟，之后每被锁一次升一档，
 * 第四档起恒定 60 分钟封顶 —— 反复爆破的成本随次数指数上升。
 */
const LOCK_DURATION_LADDER_MS = [5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000] as const
const MAX_LOCK_DURATION_MS = 60 * 60_000

/** 第 `lockCount` 次被锁时的时长（1 起数；超过阶梯长度即封顶） */
export function lockDurationFor(lockCount: number): number {
  const index = Math.min(Math.max(lockCount, 1), LOCK_DURATION_LADDER_MS.length) - 1
  return LOCK_DURATION_LADDER_MS[index] ?? MAX_LOCK_DURATION_MS
}
