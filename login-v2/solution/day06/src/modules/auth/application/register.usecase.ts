/**
 * @file 注册用例
 * @author 教程组
 *
 * 顺序即安全设计：
 * 1. 先验验证码（否则可以用注册接口白嫖「这个邮箱是否已注册」的信息）；
 * 2. 再查重（用户名/邮箱），数据库唯一索引是最后防线；
 * 3. 哈希密码（基础设施）→ 实体工厂建账号 → 经**公共端口**落库；
 * 4. 发注册事件（副作用，失败不拖垮注册）。
 *
 * 用例全程不写 SQL、不碰 bcrypt、不感知是 SQLite 还是 Postgres —— 只认端口。
 */
import { EmailTakenError, UsernameTakenError } from '../domain/errors/index'
import { CODE_PURPOSE_REGISTER } from './send-code.usecase'
import { assertCodeValid } from '../domain/services/index'
import { UserEntity } from '../domain/entities/index'
import type { AuthRegisterDeps } from '../domain/schemas/deps/index'
import type { RegisterResult } from '../domain/schemas/index'
import type { ValidatedRegister } from '../domain/schemas/validator/index'

export class RegisterUseCase {
  readonly #deps: AuthRegisterDeps

  constructor(deps: AuthRegisterDeps) {
    this.#deps = deps
  }

  async execute(input: ValidatedRegister): Promise<RegisterResult> {
    const { userAccount, passwordHasher, codeStore, timeProvider, idGenerator, userRegisteredPublisher } = this.#deps
    const now = timeProvider.now()
    const email = input.email.value

    // 1) 验证码（错误/过期/不存在合并抛 InvalidCodeError）
    assertCodeValid(await codeStore.find(CODE_PURPOSE_REGISTER, email), input.code, now)
    await codeStore.remove(CODE_PURPOSE_REGISTER, email)

    // 2) 查重 —— 读也走公共端口
    if ((await userAccount.findByUsername(input.username)) !== null) {
      throw new UsernameTakenError()
    }
    if ((await userAccount.findByEmail(email)) !== null) {
      throw new EmailTakenError()
    }

    // 3) 构建实体（构造即校验 + 时间注入）并落库
    const passwordHash = await passwordHasher.hash(input.password.value)
    const user = UserEntity.createEmailUser(
      {
        id: idGenerator.generate(),
        username: input.username,
        email,
        phone: input.phone === undefined ? null : input.phone.value,
        passwordHash,
      },
      timeProvider,
    )
    await userAccount.insert(user.toRow())

    // 4) 注册事件（订阅方 = Day 07 的 notifications）
    await userRegisteredPublisher?.publish(user.id)

    return { user: user.toSnapshot() }
  }
}
