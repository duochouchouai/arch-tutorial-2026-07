import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { LoginUserUseCase } from '../../src/application/login-user';
import { UserRepository } from '../../src/domain/user-repository';
import { UnauthorizedError } from '../../src/shared/errors';

/**
 * 登录用例的单元测试
 *
 * 重点测试场景：
 *   1. 正确的用户名密码 → 返回用户信息（不含密码哈希）
 *   2. 错误的密码 → UnauthorizedError
 *   3. 不存在的用户名 → UnauthorizedError（和错误密码一致，不透漏信息）
 *   4. 记住我 → 返回 token
 */
function createMockRepo(): UserRepository {
  return {
    findByUsername: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    findByOAuth: vi.fn(),
    createOAuthUser: vi.fn(),
    updateResetToken: vi.fn(),
    findByResetToken: vi.fn(),
    updatePassword: vi.fn(),
    createRememberToken: vi.fn(),
    findUserIdByRememberToken: vi.fn(),
    deleteRememberToken: vi.fn(),
    // 默认：账户未锁定，失败次数 0
    getLockStatus: vi.fn().mockResolvedValue({ failedAttempts: 0, lockedUntil: null }),
    incrementFailedAttempts: vi.fn().mockResolvedValue(1),
    resetLockStatus: vi.fn(),
    lockAccount: vi.fn(),
  };
}

describe('LoginUserUseCase', () => {
  it('should return user on valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('correct', 10);
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({
      id: 1, username: 'alice', email: 'alice@test.com', hashedPassword,
    });
    const useCase = new LoginUserUseCase(repo);

    const result = await useCase.execute({ username: 'alice', password: 'correct' });

    expect(result.user.username).toBe('alice');
    // 返回结果中不应该包含密码哈希
    expect(result).not.toHaveProperty('hashedPassword');
  });

  it('should throw on wrong password', async () => {
    const hashedPassword = await bcrypt.hash('correct', 10);
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({
      id: 1, username: 'alice', email: 'alice@test.com', hashedPassword,
    });
    const useCase = new LoginUserUseCase(repo);

    await expect(
      useCase.execute({ username: 'alice', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw on non-existent user (same message as wrong password)', async () => {
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue(null);
    const useCase = new LoginUserUseCase(repo);

    await expect(
      useCase.execute({ username: 'nobody', password: 'anything' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should generate a remember token when rememberMe is true', async () => {
    const hashedPassword = await bcrypt.hash('pass', 10);
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({
      id: 1, username: 'alice', email: 'a@b.com', hashedPassword,
    });
    repo.createRememberToken = vi.fn();
    repo.getLockStatus = vi.fn().mockResolvedValue({ failedAttempts: 0, lockedUntil: null });
    repo.incrementFailedAttempts = vi.fn().mockResolvedValue(1);
    repo.resetLockStatus = vi.fn();
    const useCase = new LoginUserUseCase(repo);

    const result = await useCase.execute({
      username: 'alice', password: 'pass', rememberMe: true,
    });

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token!.length).toBeGreaterThan(0);
    expect(repo.createRememberToken).toHaveBeenCalledOnce();
  });

  it('should not generate token when rememberMe is false', async () => {
    const hashedPassword = await bcrypt.hash('pass', 10);
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({
      id: 1, username: 'alice', email: 'a@b.com', hashedPassword,
    });
    const useCase = new LoginUserUseCase(repo);

    const result = await useCase.execute({
      username: 'alice', password: 'pass', rememberMe: false,
    });

    expect(result.token).toBeUndefined();
  });

  it('should check lock status before verifying password', async () => {
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({
      id: 1, username: 'alice', email: 'a@b.com', hashedPassword: 'hash',
    });
    // 账户被锁定
    repo.getLockStatus = vi.fn().mockResolvedValue({
      failedAttempts: 5,
      lockedUntil: new Date(Date.now() + 3600000).toISOString(),
    });
    const useCase = new LoginUserUseCase(repo);

    await expect(
      useCase.execute({ username: 'alice', password: 'any' }),
    ).rejects.toThrow('账户已锁定');
  });
});
