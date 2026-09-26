/**
 * @file auth 模块错误 — 只在本模块语义下成立的错误类型
 * @author 教程组
 *
 * 通用错误（校验/冲突/未认证）继承 shared 基类即可；
 * 本文件只放「auth 特有、且消费方可能按 code 分支」的错误。
 */
import { AppError, ConflictError, UnauthorizedError, ValidationError } from '../../../shared/index'

/** 用户名或密码错误 —— 两种失败合并为一个错误，不泄露账号是否存在（防枚举） */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('用户名或密码错误')
  }
}

/** 账户处于锁定期 */
export class AccountLockedError extends AppError {
  constructor() {
    super('账户已锁定，请稍后再试', { code: 'ACCOUNT_LOCKED', statusCode: 423 })
  }
}

/** 用户名已被占用 */
export class UsernameTakenError extends ConflictError {
  constructor() {
    super('用户名已被占用', { username: ['用户名已被占用'] })
  }
}

/** 邮箱已被注册 */
export class EmailTakenError extends ConflictError {
  constructor() {
    super('邮箱已被注册', { email: ['邮箱已被注册'] })
  }
}

/** 验证码错误或已过期（三种失败合并，不给攻击者区分信息） */
export class InvalidCodeError extends ValidationError {
  constructor() {
    super({ code: ['验证码错误或已过期'] }, '验证码错误或已过期')
  }
}
