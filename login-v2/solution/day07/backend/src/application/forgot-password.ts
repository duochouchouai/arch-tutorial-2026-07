import crypto from 'node:crypto';
import { UserRepository } from '../domain/user-repository';

/**
 * 忘记密码用例
 *
 * 对比 v1：
 *   - ❌ Math.random() → ✅ crypto.randomBytes（密码学安全）
 *   - ❌ token 永久有效 → ✅ 1 小时过期
 *   - ❌ 泄露邮箱是否注册 → ✅ 统一返回「已发送」
 */
export class ForgotPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string): Promise<void> {
    // 无论邮箱是否存在，对外统一返回「已发送」——防止攻击者枚举有效邮箱
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 小时过期

      await this.userRepository.updateResetToken(user.id, token, expiresAt);

      console.log('==============================');
      console.log(`重置链接: http://localhost:3000/auth/reset-password?token=${token}`);
      console.log('（模拟发邮件，生产环境应接入邮件服务）');
      console.log('==============================');
    }
  }
}
