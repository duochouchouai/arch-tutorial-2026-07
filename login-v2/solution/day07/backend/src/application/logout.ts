import { UserRepository } from '../domain/user-repository';

/**
 * 退出登录用例
 *
 * 销毁记住我 token，让自动登录失效。
 * 对比 v1：v1 的记住我 token 一旦生成就永远留在数据库里。
 */
export class LogoutUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(token: string): Promise<void> {
    await this.userRepository.deleteRememberToken(token);
  }
}
