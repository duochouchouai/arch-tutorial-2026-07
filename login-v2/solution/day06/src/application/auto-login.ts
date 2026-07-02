import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

/**
 * 自动登录用例（通过记住我 token）
 *
 * 对比 v1：
 *   - ❌ token 用 Math.random()、不过期 → ✅ crypto.randomBytes(48)、30 天过期
 *   - ❌ /tokens 调试接口泄露所有 token → ✅ 无调试接口
 *   - ❌ /auto-login 无防枚举 → ✅ token 256 位随机，不可枚举
 */
export class AutoLoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(token: string) {
    const userId = await this.userRepository.findUserIdByRememberToken(token);
    if (!userId) {
      throw new UnauthorizedError('自动登录已过期，请重新登录');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    return user;
  }
}
