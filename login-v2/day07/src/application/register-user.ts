import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { ValidationError, ConflictError } from '../shared/errors';

export interface RegisterUserInput {
  username: string;
  password: string;
  email?: string;
}

/**
 * 注册用例
 *
 * Application 层只做业务编排，不关心 I/O。
 * 它依赖 UserRepository 接口，但不关心是 SQLite 还是其他实现。
 */
export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: RegisterUserInput) {
    // 1. 校验输入
    if (!input.username || input.username.length < 3) {
      throw new ValidationError('用户名至少3个字符');
    }
    if (!input.password || input.password.length < 6) {
      throw new ValidationError('密码至少6个字符');
    }

    // 2. 检查用户名是否已存在
    const existing = await this.userRepository.findByUsername(input.username);
    if (existing) {
      throw new ConflictError('用户名已存在');
    }

    // 3. 密码哈希（对比 v1 的明文存储）
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // 4. 保存用户
    const user = await this.userRepository.create({
      username: input.username,
      email: input.email || '',
      hashedPassword,
    });

    return user;
  }
}
