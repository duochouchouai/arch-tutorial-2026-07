import { describe, it, expect, vi } from 'vitest';
import { RegisterUserUseCase } from '../../src/application/register-user';
import { UserRepository } from '../../src/domain/user-repository';
import { ConflictError, ValidationError } from '../../src/shared/errors';

/**
 * 注册用例的单元测试
 *
 * 测试目标：RegisterUserUseCase
 * 依赖：UserRepository（被 mock）
 *
 * 清洁架构的好处：use case 只依赖接口，测试时用 mock 替换真实数据库，
 * 不需要启动服务、不需要连接数据库，纯粹测试业务逻辑。
 */
function createMockRepo(): UserRepository {
  return {
    findByUsername: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn().mockImplementation(async (input) => ({
      id: 1, username: input.username, email: input.email || '',
    })),
    findByOAuth: vi.fn(),
    createOAuthUser: vi.fn(),
    updateResetToken: vi.fn(),
    findByResetToken: vi.fn(),
    updatePassword: vi.fn(),
    createRememberToken: vi.fn(),
    findUserIdByRememberToken: vi.fn(),
    deleteRememberToken: vi.fn(),
    getLockStatus: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    resetLockStatus: vi.fn(),
    lockAccount: vi.fn(),
  };
}

describe('RegisterUserUseCase', () => {
  it('should register a valid user', async () => {
    const repo = createMockRepo();
    const useCase = new RegisterUserUseCase(repo);

    const user = await useCase.execute({
      username: 'newuser',
      password: '123456',
      email: 'new@example.com',
    });

    expect(user).toHaveProperty('id');
    expect(user.username).toBe('newuser');
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should reject username shorter than 3 characters', async () => {
    const useCase = new RegisterUserUseCase(createMockRepo());

    await expect(useCase.execute({
      username: 'ab',
      password: '123456',
    })).rejects.toThrow(ValidationError);
  });

  it('should reject password shorter than 6 characters', async () => {
    const useCase = new RegisterUserUseCase(createMockRepo());

    await expect(useCase.execute({
      username: 'validuser',
      password: '12345',
    })).rejects.toThrow(ValidationError);
  });

  it('should reject duplicate username', async () => {
    const repo = createMockRepo();
    repo.findByUsername = vi.fn().mockResolvedValue({ id: 1, username: 'existing', email: '', hashedPassword: '' });
    const useCase = new RegisterUserUseCase(repo);

    await expect(useCase.execute({
      username: 'existing',
      password: '123456',
    })).rejects.toThrow(ConflictError);
  });

  it('should not store plain text password', async () => {
    const repo = createMockRepo();
    let savedHashedPassword = '';
    repo.create = vi.fn().mockImplementation(async (input) => {
      savedHashedPassword = input.hashedPassword;
      return { id: 1, username: input.username, email: input.email };
    });
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({ username: 'test', password: 'mypassword' });

    // 存进去的不是明文
    expect(savedHashedPassword).not.toContain('mypassword');
    // 应该是 bcrypt 哈希（以 $2a$ 或 $2b$ 开头）
    expect(savedHashedPassword).toMatch(/^\$2[ab]/);
  });
});
