import { describe, it, expect, vi} from 'vitest';
import { LogoutUseCase } from '../../src/application/logout';
import { UserRepository } from '../../src/domain/user-repository';

function createMockRepo(): UserRepository {
    return {
        deleteRememberToken: vi.fn(),
        // 其他方法用不到，但 TypeScript 要求实现全部接口
        findById: vi.fn(), 
        findByUsername: vi.fn(), 
        findByEmail: vi.fn(),
        create: vi.fn(), 
        findByOAuth: vi.fn(), 
        createOAuthUser: vi.fn(),
        updateResetToken: vi.fn(), 
        findByResetToken: vi.fn(), 
        updatePassword: vi.fn(),
        createRememberToken: vi.fn(), 
        findUserIdByRememberToken: vi.fn(),
        getLockStatus: vi.fn(), 
        incrementFailedAttempts: vi.fn(),
        resetLockStatus: vi.fn(), 
        lockAccount: vi.fn(),
    };
}

describe('LogoutUseCase', () => {
    it('should delete the remember token', async () => {
        const repo = createMockRepo();
        const useCase = new LogoutUseCase(repo);

        await useCase.execute('some-token');

        expect(repo.deleteRememberToken).toHaveBeenCalledWith('some-token');
    });

    it('should not throw when token does not exist', async () => {
        const repo = createMockRepo();
        const userCase = new LogoutUseCase(repo);

        await expect(
            userCase.execute('not-existent'),
        ).resolves.not.toThrow();
    });
});