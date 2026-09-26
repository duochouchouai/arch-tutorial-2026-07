/**
 * @file auth 领域常量
 * @author 教程组
 *
 * 业务数字只在这里出现一次：实体与用例引用常量，测试也引用同一常量 ——
 * 「5 次锁定」改成「3 次锁定」只需要改这一行，测试断言跟着走。
 */
/** 连续登录失败达到该次数即锁定 */
export const MAX_FAILED_ATTEMPTS = 5
/** 锁定时长（30 分钟） */
export const LOCK_DURATION_MS = 30 * 60 * 1000
