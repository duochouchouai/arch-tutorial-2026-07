/**
 * @file UserEntity — 账号行为实体（纯 TS，零 npm 依赖）
 * @author 教程组
 *
 * 归属说明（与真实架构同构）：users 表行形状（UserRowSchema）在 users 模块，
 * 账号**行为**（改密码、记登录、锁定）在 auth 模块。两者靠 toRow()/fromData() 桥接 ——
 * 行为与存储可以分属两个模块，靠公共契约对接（见 GUIDE-day06）。
 *
 * 纪律：
 * - 状态全部 #private，外部只能通过 getter 读、通过**业务方法**改；
 *   直接赋值（`user.failedAttempts = 0`）在类型层面就不存在。
 * - 实体永远不调 Date.now()，时间从构造函数注入的 TimeProvider 取。
 */
import type { TimeProvider } from '../../../shared/index'
import type { UserRow } from '../../../users/index'
import { MAX_FAILED_ATTEMPTS, lockDurationFor } from '../constants'
import type { PublicUser } from '../schemas/index'
import { Email, Phone } from '../value-objects/index'

export interface CreateEmailUserInput {
  id: string
  username: string
  email: string
  phone: string | null
  /** 已哈希的密码（哈希是基础设施动作，实体只持有结果） */
  passwordHash: string
}

export class UserEntity {
  readonly id: string
  readonly username: string
  readonly createdAt: number

  readonly #now: TimeProvider
  #email: Email
  #phone: Phone | null
  #passwordHash: string
  #failedAttempts: number
  #lockCount: number
  #lockedUntil: number | null
  #lastLoginAt: number | null
  #updatedAt: number

  private constructor(row: UserRow, now: TimeProvider) {
    this.#now = now
    this.id = row.id
    this.username = row.username
    this.createdAt = row.createdAt
    // DB 行是信任来源：恢复用 fromTrusted，不重复跑校验
    this.#email = Email.fromTrusted(row.email)
    this.#phone = row.phone === null ? null : Phone.fromTrusted(row.phone)
    this.#passwordHash = row.passwordHash
    this.#failedAttempts = row.failedAttempts
    this.#lockCount = row.lockCount
    this.#lockedUntil = row.lockedUntil
    this.#lastLoginAt = row.lastLoginAt
    this.#updatedAt = row.updatedAt
  }

  /* ──────── 静态工厂 ──────── */

  /** 从 DB 行恢复实体（读完即用，改完经 toRow 写回） */
  static fromData(row: UserRow, now: TimeProvider): UserEntity {
    return new UserEntity(row, now)
  }

  /** 新建邮箱注册用户（id 由调用方用 IdGenerator 生成，见用例） */
  static createEmailUser(input: CreateEmailUserInput, now: TimeProvider): UserEntity {
    const timestamp = now.now()
    return new UserEntity(
      {
        id: input.id,
        username: input.username,
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        failedAttempts: 0,
        lockCount: 0,
        lockedUntil: null,
        lastLoginAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      now,
    )
  }

  /* ──────── 只读访问 ──────── */

  get email(): string {
    return this.#email.value
  }

  get phone(): string | null {
    return this.#phone === null ? null : this.#phone.value
  }

  /** 仅供 PasswordHasher.verify 使用；哈希永远不出模块、不进任何响应 */
  get passwordHash(): string {
    return this.#passwordHash
  }

  get failedAttempts(): number {
    return this.#failedAttempts
  }

  /** 被锁定的累计次数（递进档位；登录成功清零） */
  get lockCount(): number {
    return this.#lockCount
  }

  get lockedUntil(): number | null {
    return this.#lockedUntil
  }

  get lastLoginAt(): number | null {
    return this.#lastLoginAt
  }

  get updatedAt(): number {
    return this.#updatedAt
  }

  /* ──────── 业务方法 ──────── */

  /** 指定时刻是否处于锁定状态（`time` 由调用方从 TimeProvider 取，保证判据一致） */
  isLockedAt(time: number): boolean {
    return this.#lockedUntil !== null && this.#lockedUntil > time
  }

  /** 记录一次登录失败：累计到阈值即锁定，时长按「第几次被锁」递进（5 / 15 / 30 / 60 分钟封顶） */
  recordFailedLogin(): void {
    const now = this.#now.now()
    this.#failedAttempts += 1
    this.#updatedAt = now
    if (this.#failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.#lockCount += 1
      this.#lockedUntil = now + lockDurationFor(this.#lockCount)
      // 锁定已生效：失败计数归零，下一轮从零攒 —— 解锁后再攒满 5 次就进入下一档
      this.#failedAttempts = 0
    }
  }

  /** 记录一次成功登录：失败计数、锁定档位、锁定状态全部归零 */
  recordLogin(): void {
    const now = this.#now.now()
    this.#failedAttempts = 0
    this.#lockCount = 0
    this.#lockedUntil = null
    this.#lastLoginAt = now
    this.#updatedAt = now
  }

  /**
   * 重置密码（Day 07）：只收已哈希的密码。
   * 改密视为「账号主人操作」：顺带解锁并清空失败计数 —— 否则被锁用户改完密码仍旧进不去。
   */
  changePassword(passwordHash: string): void {
    this.#passwordHash = passwordHash
    this.#failedAttempts = 0
    this.#lockedUntil = null
    this.#updatedAt = this.#now.now()
  }

  /* ──────── 桥接 ──────── */

  /** 实体 → 表行（持久化用；两个模块靠 UserRow 这个公共形状对接） */
  toRow(): UserRow {
    return {
      id: this.id,
      username: this.username,
      email: this.#email.value,
      phone: this.phone,
      passwordHash: this.#passwordHash,
      failedAttempts: this.#failedAttempts,
      lockCount: this.#lockCount,
      lockedUntil: this.#lockedUntil,
      lastLoginAt: this.#lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.#updatedAt,
    }
  }

  /** 实体 → 对外快照（响应给客户端的**唯一**用户形状；passwordHash 等永不出现） */
  toSnapshot(): PublicUser {
    return { id: this.id, username: this.username, email: this.email, phone: this.phone }
  }
}
