import { describe, it, expect, vi } from 'vitest';
import { LogoutUseCase } from '../../src/application/logout';
import { UserRepository } from '../../src/domain/user-repository';

/**
 * 退出登录用例的单元测试
 *
 * 这是最简单的用例——只调一次 deleteRememberToken。
 * 但正因为它简单，更能看出测试的价值：
 * 你能确认「销毁 token」这个行为确实发生了。
 */
function createMockRepo(): UserRepository {
  return {
    deleteRememberToken: vi.fn(),
    // 其他方法测试中用不到
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
    repo.deleteRememberToken = vi.fn().mockResolvedValue(undefined); // SQLite 删不存在的行不会报错
    const useCase = new LogoutUseCase(repo);

    await expect(
      useCase.execute('non-existent-token'),
    ).resolves.not.toThrow();
  });
});
