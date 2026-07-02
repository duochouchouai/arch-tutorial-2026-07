import { User } from './user';

/**
 * 用户仓库接口
 *
 * 只定义「能干什么」，不关心「怎么干」。
 * domain 层只依赖这个接口，不依赖具体数据库实现。
 *
 * 这就是「依赖倒置原则」：
 *  高层模块（domain）定义接口
 *  低层模块（infrastructure）实现接口
 *  两者都依赖抽象
 */
export interface CreateUserInput {
  username: string;
  email: string;
  hashedPassword: string;
}

export interface UserWithPassword extends User {
  hashedPassword: string;
}

export interface LockStatus {
  failedAttempts: number;
  lockedUntil: string | null;
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<UserWithPassword | null>;
  findByEmail(email: string): Promise<UserWithPassword | null>;
  create(input: CreateUserInput): Promise<User>;

  // 忘记密码 / 重置密码
  updateResetToken(userId: number, token: string, expiresAt: string): Promise<void>;
  findByResetToken(token: string): Promise<UserWithPassword | null>;
  updatePassword(userId: number, newHashedPassword: string): Promise<void>;

  // 记住我
  createRememberToken(userId: number, token: string, expiresAt: string): Promise<void>;
  findUserIdByRememberToken(token: string): Promise<number | null>;
  deleteRememberToken(token: string): Promise<void>;

  // 登录限制（防爆破）
  getLockStatus(userId: number): Promise<LockStatus>;
  incrementFailedAttempts(userId: number): Promise<number>;
  resetLockStatus(userId: number): Promise<void>;
  lockAccount(userId: number, lockedUntil: string): Promise<void>;
}
