/**
 * @file 验证码校验规则 — auth 模块内跨用例共享的无状态领域规则
 * @author 教程组
 *
 * 判据归属：「验证码是否有效」的口径属于 auth 模块，收口在这一个纯函数里。
 * 注册用例与（Day 07 的）找回密码用例共用它 —— 两处各写一遍条件必然分叉。
 *
 * 三种失败（不存在 / 已过期 / 不匹配）对外**合并为同一个错误**：
 * 不给攻击者区分「码错了」和「码过期了」的信息，也不泄露邮箱是否发过码。
 */
import { InvalidCodeError } from '../errors/index'
import type { StoredCode } from '../schemas/index'
import type { Code } from '../value-objects/index'

export function assertCodeValid(stored: StoredCode | null, input: Code, now: number): void {
  if (stored === null || stored.expiresAt <= now || stored.code !== input.value) {
    throw new InvalidCodeError()
  }
}
