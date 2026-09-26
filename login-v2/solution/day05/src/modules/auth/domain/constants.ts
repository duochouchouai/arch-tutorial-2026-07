/**
 * @file auth 模块业务常数 — 判据只在这里一份
 * @author 教程组
 *
 * 这些数字被测试直接引用（如「第 5 次失败触发锁定」），
 * 散落成字面量就会出现「测试改了、实现没改」的分叉。
 */
/** 连续失败达到该次数即锁定 */
export const MAX_FAILED_ATTEMPTS = 5
/** 锁定时长（毫秒）：固定 30 分钟（Day 07 项目 1 会把它改为递进式） */
export const LOCK_DURATION_MS = 30 * 60 * 1000
/** 验证码有效期（毫秒） */
export const CODE_TTL_MS = 5 * 60 * 1000
/** 会话有效期（毫秒） */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
