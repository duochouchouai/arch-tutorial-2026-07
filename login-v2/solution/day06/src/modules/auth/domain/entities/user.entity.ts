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
import { LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS } from '../constants'
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

  /** 记录一次登录失败：累计到阈值即锁定（再次失败会重置锁定时长，见 GUIDE 说明） */
  recordFailedLogin(): void {
    const now = this.#now.now()
    this.#failedAttempts += 1
    this.#updatedAt = now
    if (this.#failedAttempts >= MAX_FAILED_ATTEMPTS) {
      this.#lockedUntil = now + LOCK_DURATION_MS
    }
  }

  /** 记录一次成功登录：失败计数与锁定状态全部归零 */
  recordLogin(): void {
    const now = this.#now.now()
    this.#failedAttempts = 0
    this.#lockedUntil = null
    this.#lastLoginAt = now
    this.#updatedAt = now
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
