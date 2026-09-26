/**
 * @file auth 模块组合根 — 依赖装配
 * @author 教程组
 *
 * 装配顺序即依赖顺序：
 *   基础设施实现（bcrypt / 两个 store / 邮件 / 验证码生成）
 *   → 用例（注入端口）
 *   → 校验器（纯内存件）
 *   → 控制器（注入用例+校验器）
 *   → 路由
 *
 * 注意两个「外部件」都不是本模块自己造的：
 * - `userAccount`：users 模块的公共端口，由 main.ts 从对方模块取来传进来；
 * - `timeProvider` / `idGenerator` / `eventBus`：shared 的公共件，同理。
 * 模块只组装「自己的」东西，跨模块依赖一律从构造函数进 —— 组合根是唯一知道谁实现谁的地方。
 */
import type { DatabaseSync } from 'node:sqlite'
import type { EventBus, IdGenerator, TimeProvider } from '../shared/index'
import type { UserAccountPublicPort } from '../users/index'
import {
  LoginUseCase,
  RegisterUseCase,
  SendCodeUseCase,
  SessionUseCase,
  UserRegisteredPublisher,
} from './application/index'
import { LoginValidator, RegisterValidator, SendCodeValidator } from './domain/validators/index'
import {
  BcryptPasswordHasher,
  ConsoleMailSender,
  CryptoCodeGenerator,
  SqliteCodeStore,
  SqliteSessionStore,
} from './infrastructure/index'
import { AuthController, createAuthRouter, type AuthControllerDeps } from './presentation/index'

export interface AuthModuleDeps {
  /** 本模块自己的表（auth_codes / auth_sessions）用的连接 */
  db: DatabaseSync
  /** users 模块公共端口（跨模块协作的唯一入口） */
  userAccount: UserAccountPublicPort
  timeProvider: TimeProvider
  idGenerator: IdGenerator
  eventBus: EventBus
  /** bcrypt 轮数（测试传低值） */
  bcryptRounds: number
}

export interface AuthModule {
  createRouter: () => ReturnType<typeof createAuthRouter>
}

export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  // 基础设施（端口实现）
  const passwordHasher = new BcryptPasswordHasher(deps.bcryptRounds)
  const codeStore = new SqliteCodeStore(deps.db)
  const sessionStore = new SqliteSessionStore(deps.db)
  const mailSender = new ConsoleMailSender()
  const codeGenerator = new CryptoCodeGenerator()
  const userRegisteredPublisher = new UserRegisteredPublisher({
    timeProvider: deps.timeProvider,
    eventBus: deps.eventBus,
  })

  // 用例（依赖全部是端口）
  const sendCodeUseCase = new SendCodeUseCase({
    codeStore,
    codeGenerator,
    mailSender,
    timeProvider: deps.timeProvider,
  })
  const registerUseCase = new RegisterUseCase({
    userAccount: deps.userAccount,
    timeProvider: deps.timeProvider,
    idGenerator: deps.idGenerator,
    codeStore,
    passwordHasher,
    userRegisteredPublisher,
  })
  const loginUseCase = new LoginUseCase({
    userAccount: deps.userAccount,
    timeProvider: deps.timeProvider,
    idGenerator: deps.idGenerator,
    passwordHasher,
    sessionStore,
  })
  const sessionUseCase = new SessionUseCase({ sessionStore })

  // 校验器 + 控制器 + 路由
  const controllerDeps: AuthControllerDeps = {
    sendCodeUseCase,
    registerUseCase,
    loginUseCase,
    sessionUseCase,
    sendCodeValidator: new SendCodeValidator(),
    registerValidator: new RegisterValidator(),
    loginValidator: new LoginValidator(),
  }
  const controller = new AuthController(controllerDeps)
  return { createRouter: () => createAuthRouter(controller) }
}
