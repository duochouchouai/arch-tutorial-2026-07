import { UserRepository } from "../domain/user-repository";
import { UnauthorizedError } from "../shared/errors";

export class AutoLoginUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(token: string) {
        const userId = await this.userRepository.findUserIdByRememberToken(token);
        if (!userId) {
            throw new UnauthorizedError('自动登录已过期，请重新登录');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError('用户不存在');
        }

        return user;
    }
}