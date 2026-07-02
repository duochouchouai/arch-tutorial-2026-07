import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export interface LoginUserInput {
    username: string;
    password: string;
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
        return safeUser;  
    }
}