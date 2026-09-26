/**
 * @file auth 用例依赖契约 — 全部类型出自 Zod，无手写 interface
 * @author 教程组
 *
 * 每个用例在构造函数里收 deps，deps 的形状在这里成对导出（Schema + type）。
 * 好处：用例的依赖清单是一份**可被检视的契约** ——
 * 打开本文件就知道「注册用例需要哪些能力」，不用读用例实现。
 *
 * z.custom<T>()：只做类型标注（不运行时校验对象内部结构），
 * 运行时行为由各端口自己的测试与组合根装配保证。
 */
import { z } from 'zod'
import type { EventBus, IdGenerator, TimeProvider } from '../../../../shared/index'
import type {
  CodeGeneratorPort,
  CodeStorePort,
  MailSenderPort,
  PasswordHasherPort,
  SessionStorePort,
  UserAccountRepositoryPort,
  UserRegisteredPublisherPort,
} from '../../ports/index'

/** 全部用例共享的最小底座 */
export const AuthBaseDepsSchema = z.object({
  userAccountRepository: z.custom<UserAccountRepositoryPort>(),
  timeProvider: z.custom<TimeProvider>(),
  idGenerator: z.custom<IdGenerator>(),
})
export type AuthBaseDeps = z.infer<typeof AuthBaseDepsSchema>

/** 发送验证码 */
export const AuthSendCodeDepsSchema = z.object({
  codeStore: z.custom<CodeStorePort>(),
  codeGenerator: z.custom<CodeGeneratorPort>(),
  mailSender: z.custom<MailSenderPort>(),
  timeProvider: z.custom<TimeProvider>(),
})
export type AuthSendCodeDeps = z.infer<typeof AuthSendCodeDepsSchema>

/** 注册（底座 + 验证码 + 哈希 + 事件） */
export const AuthRegisterDepsSchema = AuthBaseDepsSchema.extend({
  codeStore: z.custom<CodeStorePort>(),
  passwordHasher: z.custom<PasswordHasherPort>(),
  /** 不注入则不发布（单测常见）；详情见 UserRegisteredPublisher 文件头 */
  userRegisteredPublisher: z.custom<UserRegisteredPublisherPort>().optional(),
})
export type AuthRegisterDeps = z.infer<typeof AuthRegisterDepsSchema>

/** 登录（底座 + 哈希 + 会话） */
export const AuthLoginDepsSchema = AuthBaseDepsSchema.extend({
  passwordHasher: z.custom<PasswordHasherPort>(),
  sessionStore: z.custom<SessionStorePort>(),
})
export type AuthLoginDeps = z.infer<typeof AuthLoginDepsSchema>

/** 会话读取 / 退出 */
export const AuthSessionDepsSchema = z.object({
  sessionStore: z.custom<SessionStorePort>(),
})
export type AuthSessionDeps = z.infer<typeof AuthSessionDepsSchema>

/** 注册事件发布器自己的依赖 */
export const AuthUserRegisteredPublisherDepsSchema = z.object({
  timeProvider: z.custom<TimeProvider>(),
  /** 不注入 → publish 直接 no-op（单测 / 不关心订阅方的装配） */
  eventBus: z.custom<EventBus>().optional(),
})
export type AuthUserRegisteredPublisherDeps = z.infer<typeof AuthUserRegisteredPublisherDepsSchema>
