/**
 * @file 密码学随机 id 生成器 — 基础设施实现
 * @author 教程组
 */
import { randomBytes } from 'node:crypto'
import type { IdGenerator } from '../domain/ports/index'

export class CryptoIdGenerator implements IdGenerator {
  readonly #bytes: number

  constructor(bytes = 16) {
    this.#bytes = bytes
  }

  generate(): string {
    return randomBytes(this.#bytes).toString('hex')
  }
}
