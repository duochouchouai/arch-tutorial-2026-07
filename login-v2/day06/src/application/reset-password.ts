import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { ValidationError,UnauthorizedError } from '../shared/errors';

export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}

export class ResetPasswordUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(input: ResetPasswordInput) {
        if (!input.newPassword || input.newPassword.length < 6) {
            throw new ValidationError('密码至少6个字符');
        }

        const user = await this.userRepository.findByResetToken(input.token);
        if (!user) {
            throw new UnauthorizedError('重置链接无效或已过期');
        }

        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await this.userRepository.updatePassword(user.id, hashedPassword);
    }
}