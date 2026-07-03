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
        const user = await this.userRepository.findByUsername(input.username);
        if (!user) {
            throw new UnauthorizedError('用户名或密码错误');
        }

        const isValid = await bcrypt.compare(input.password,user.hashedPassword);
        if(!isValid) {
            throw new UnauthorizedError('用户名或密码错误');
        }

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