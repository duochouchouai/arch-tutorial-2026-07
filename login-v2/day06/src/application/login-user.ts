import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export interface LoginUserInput {
    username: string;
    password: string;
    rememberMe?:boolean;
}

export interface LoginResult {
    user: { id: number; username: string; email: string};
    token?:string;
}

export class LoginUserUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(input: LoginUserInput) {
        // 1. 查找用户
        const user = await this.userRepository.findByUsername(input.username);
        if (!user) {
            throw new UnauthorizedError('用户名或密码错误');
        }

        // 2. 检查账户是否锁定
        const lockStatus = await this.userRepository.getLockStatus(user.id);
        if (lockStatus.lockedUntil && new Date(lockStatus.lockedUntil) > new Date()) {
            throw new UnauthorizedError('账户已锁定，请在30分钟后再试');
        }
        if (lockStatus.lockedUntil) {
            // 锁定已过期，自动清除
            await this.userRepository.resetLockStatus(user.id)
        }

        // 3. 验证密码
        const isValid = await bcrypt.compare(input.password,user.hashedPassword);
        if (!isValid) {
          const attempts = await this.userRepository.incrementFailedAttempts(user.id);
          if (attempts >= 5) {
            const lockedUntil = new Date(Date.now() + 30* 60 * 1000).toISOString();
            await this.userRepository.lockAccount(user.id, lockedUntil);
            throw new UnauthorizedError('登录失败次数过多，账户已锁定30分钟');
          }
          throw new UnauthorizedError('用户名或密码错误');
        }

        // 4. 登录成功，重置锁定状态
        await this.userRepository.resetLockStatus(user.id);

        const { hashedPassword, ...safeUser } = user;
        
        const result: LoginResult = { user: safeUser };

        if (input.rememberMe) {
            const token = crypto.randomBytes(48).toString('hex');
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString();
            await this.userRepository.createRememberToken(user.id, token, expiresAt);
            result.token = token;
        }
        
        return result;
    }
}