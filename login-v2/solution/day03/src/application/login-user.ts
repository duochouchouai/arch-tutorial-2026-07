import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export interface LoginUserInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  user: { id: number; username: string; email: string };
  token?: string;
}

/**
 * 登录用例
 *
 * 和 register 一样，只关注业务逻辑，不关心 HTTP 或数据库细节。
 */
export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LoginUserInput): Promise<LoginResult> {
    // 1. 查找用户
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 2. 验证密码
    const isValid = await bcrypt.compare(input.password, user.hashedPassword);
    if (!isValid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 3. 返回用户信息
    const { hashedPassword, ...safeUser } = user;
    const result: LoginResult = { user: safeUser };

    // 4. 如果需要「记住我」，生成 token（30 天过期）
    if (input.rememberMe) {
      const token = crypto.randomBytes(48).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await this.userRepository.createRememberToken(user.id, token, expiresAt);
      result.token = token;
    }

    return result;
  }
}
