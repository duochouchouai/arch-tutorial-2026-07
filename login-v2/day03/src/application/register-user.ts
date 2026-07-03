import bcrypt from 'bcryptjs'
import { UserRepository } from '../domain/user-repository'
import { ValidationError, ConflictError } from '../shared/errors';
import { User } from '../domain/user';

export interface RegisterUserInput {
    username: string;
    password: string;
    email?: string;
}

export class RegisterUserUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(input: RegisterUserInput) {
        if (!input.username || input.username.length < 3 ) {
            throw new ValidationError('用户名至少3个字符');
        }
        if (!input.password || input.password.length < 6) {
            throw new ValidationError('用户密码至少6个字符');
        }

        const existing = await this.userRepository.findByUsername(input.username);
        if (existing) {
            throw new ConflictError('用户名已存在');
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const user = await this.userRepository.create({
            username: input.username,
            email: input.email || '',
            hashedPassword
        });
        
        return user;
    }
}