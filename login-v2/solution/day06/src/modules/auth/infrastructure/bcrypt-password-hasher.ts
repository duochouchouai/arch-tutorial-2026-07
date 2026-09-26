/**
 * @file bcrypt 密码哈希 — PasswordHasherPort 实现
 * @author 教程组
 *
 * rounds 由组合根从配置传入：生产 10+，测试传低值（bcrypt 是故意设计得慢的，
 * 测试里用生产参数会白白拖慢整个测试套件 —— 这也是「依赖注入」的红利之一）。
 */
import bcrypt from 'bcryptjs'
import type { PasswordHasherPort } from '../domain/ports/index'

export class BcryptPasswordHasher implements PasswordHasherPort {
  readonly #rounds: number

  constructor(rounds: number) {
    this.#rounds = rounds
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.#rounds)
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
