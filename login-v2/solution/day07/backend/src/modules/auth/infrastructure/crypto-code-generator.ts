/**
 * @file 密码学随机验证码生成 — CodeGeneratorPort 实现
 * @author 教程组
 */
import { randomInt } from 'node:crypto'
import type { CodeGeneratorPort } from '../domain/ports/index'
import { Code } from '../domain/value-objects/index'

export class CryptoCodeGenerator implements CodeGeneratorPort {
  generate(): Code {
    // fromTrusted：格式（6 位补零）由本实现保证，不需再过 create 的校验
    return Code.fromTrusted(String(randomInt(0, 1_000_000)).padStart(6, '0'))
  }
}
