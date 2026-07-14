import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError, LockedError } from '../shared/errors';

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

    // 2. 检查账户是否锁定（只拦截未过期的锁）
    const lockStatus = await this.userRepository.getLockStatus(user.id);
    if (lockStatus.lockedUntil && new Date(lockStatus.lockedUntil) > new Date()) {
      throw new LockedError('账户已锁定，请稍后再试', lockStatus.lockedUntil);
    }
    // 锁已过期 → 不重置 lockCount，保留递进级别；只有登录成功才归零

    // 3. 验证密码
    const isValid = await bcrypt.compare(input.password, user.hashedPassword);
    if (!isValid) {
      const attempts = await this.userRepository.incrementFailedAttempts(user.id);
      if (attempts >= 5) {
        // 递进式锁定：根据 lockCount 决定锁定时长
        const durations = [5, 15, 30, 60]; // 分钟
        const level = Math.min(lockStatus.lockCount, durations.length - 1);
        const lockedUntil = new Date(Date.now() + durations[level] * 60 * 1000).toISOString();
        await this.userRepository.lockAccount(user.id, lockedUntil);
        throw new LockedError(`登录失败次数过多，账户已锁定${durations[level]}分钟`, lockedUntil);
      }
      throw new UnauthorizedError('用户名或密码错误');
    }

    // 4. 登录成功，重置锁定状态
    await this.userRepository.resetLockStatus(user.id);

    // 5. 返回用户信息
    const { hashedPassword, ...safeUser } = user;
    const result: LoginResult = { user: safeUser };

    // 6. 如果需要「记住我」，生成 token（30 天过期）
    if (input.rememberMe) {
      const token = crypto.randomBytes(48).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await this.userRepository.createRememberToken(user.id, token, expiresAt);
      result.token = token;
    }

    return result;
  }
}
