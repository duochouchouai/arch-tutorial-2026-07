import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export interface LoginUserInput {
  username: string;
  password: string;
}

/**
 * 登录用例
 *
 * 和 register 一样，只关注业务逻辑，不关心 HTTP 或数据库细节。
 */
export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LoginUserInput) {
    // 1. 查找用户
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      // 统一返回「用户名或密码错误」，不泄露用户是否存在
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 2. 验证密码
    const isValid = await bcrypt.compare(input.password, user.hashedPassword);
    if (!isValid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 3. 返回用户信息（不含密码哈希）
    const { hashedPassword, ...safeUser } = user;
    return safeUser;
  }
}
