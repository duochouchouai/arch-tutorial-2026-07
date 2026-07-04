import { UserRepository } from "../domain/user-repository";

export class LogoutUseCase {
    constructor(private readonly userRepository: UserRepository) {}

    async execute(token: string): Promise<void> {
        await this.userRepository.deleteRememberToken(token);
    }
}