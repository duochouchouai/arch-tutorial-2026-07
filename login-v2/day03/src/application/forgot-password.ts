import crypto from 'node:crypto';
import { UserRepository } from '../domain/user-repository';

export class ForgotPasswordUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);

        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

            await this.userRepository.updateResetToken(user.id, token, expiresAt);

            console.log('重置链接: http://localhost:3000/auth/reset-pasword?token=' + token);
            console.log('（模拟发邮件，生产环境应接入邮件服务）');
        }
        // 邮件不存在 → 什么都不做，但仍然返回成功
    }
}