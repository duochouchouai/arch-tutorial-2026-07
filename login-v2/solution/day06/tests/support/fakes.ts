/**
 * @file 测试替身（fakes）— 单测与集成测试共用
 * @author 教程组
 *
 * 测试只依赖**端口**：把基础设施换成假实现，业务逻辑依然完整跑。
 * 与「mock（vi.fn 断言调用次数）」的区别：fake 有真实行为、可断言最终状态，
 * 这里用它表达三件事：时间可控、邮件可截获、id 可预测。
 */
import type { DomainEvent, EventBus, EventHandler, IdGenerator, TimeProvider } from '../../src/modules/shared/index'
import type {
  CodeGeneratorPort,
  CodeStorePort,
  MailSenderPort,
  PasswordHasherPort,
  SessionStorePort,
} from '../../src/modules/auth/domain/ports/index'
import { Code } from '../../src/modules/auth/domain/value-objects/index'
import type { StoredCode, StoredSession } from '../../src/modules/auth/domain/schemas/index'
import type { UserAccountPublicPort, UserRow } from '../../src/modules/users/index'

export class FakeTimeProvider implements TimeProvider {
  #nowMs: number

  constructor(startMs = 1_700_000_000_000) {
    this.#nowMs = startMs
  }

  now(): number {
    return this.#nowMs
  }

  /** 时间旅行：把「30 分钟后解锁」变成一行测试代码 */
  advance(ms: number): void {
    this.#nowMs += ms
  }
}

export class FakeIdGenerator implements IdGenerator {
  #counter = 0

  generate(): string {
    this.#counter += 1
    return `id-${this.#counter}`
  }
}

/** 假哈希：不做真 bcrypt（慢），但保持「明文与哈希一一对应」的可断言行为 */
export class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

export interface SentMail {
  to: string
  subject: string
  body: string
}

export class FakeMailSender implements MailSenderPort {
  readonly sent: SentMail[] = []

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sent.push({ to, subject, body })
  }

  /** 从最后一封邮件里提取 6 位验证码（用例测试要「读到」验证码） */
  lastCode(): string {
    const last = this.sent[this.sent.length - 1]
    if (last === undefined) {
      throw new Error('还没有发过任何邮件')
    }
    const match = /(\d{6})/.exec(last.body)
    if (match === null || match[1] === undefined) {
      throw new Error(`邮件里找不到 6 位验证码：${last.body}`)
    }
    return match[1]
  }
}

/** 记录型事件总线：包装真实实现，额外保留「发过哪些事件」供断言 */
export class RecordingEventBus implements EventBus {
  readonly published: DomainEvent[] = []
  readonly #inner: EventBus

  constructor(inner: EventBus) {
    this.#inner = inner
  }

  subscribe(eventName: string, handler: EventHandler): void {
    this.#inner.subscribe(eventName, handler)
  }

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event)
    await this.#inner.publish(event)
  }
}

export class InMemoryCodeStore implements CodeStorePort {
  readonly records = new Map<string, StoredCode>()

  #key(purpose: string, target: string): string {
    return `${purpose}::${target}`
  }

  async save(purpose: string, target: string, code: string, expiresAt: number): Promise<void> {
    this.records.set(this.#key(purpose, target), { code, expiresAt })
  }

  async find(purpose: string, target: string): Promise<StoredCode | null> {
    return this.records.get(this.#key(purpose, target)) ?? null
  }

  async remove(purpose: string, target: string): Promise<void> {
    this.records.delete(this.#key(purpose, target))
  }
}

export class InMemorySessionStore implements SessionStorePort {
  readonly sessions = new Map<string, StoredSession>()

  async save(token: string, userId: string, expiresAt: number): Promise<void> {
    this.sessions.set(token, { userId, expiresAt })
  }

  async find(token: string): Promise<StoredSession | null> {
    return this.sessions.get(token) ?? null
  }

  async remove(token: string): Promise<void> {
    this.sessions.delete(token)
  }
}

export class FixedCodeGenerator implements CodeGeneratorPort {
  constructor(private readonly value = '123456') {}

  generate(): Code {
    return Code.fromTrusted(this.value)
  }
}

export class InMemoryUserAccountStore implements UserAccountPublicPort {
  readonly rows = new Map<string, UserRow>()

  async findByUsername(username: string): Promise<UserRow | null> {
    return [...this.rows.values()].find((row) => row.username === username) ?? null
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    return [...this.rows.values()].find((row) => row.email === email) ?? null
  }

  async insert(row: UserRow): Promise<void> {
    this.rows.set(row.id, row)
  }

  async update(row: UserRow): Promise<void> {
    this.rows.set(row.id, row)
  }
}
