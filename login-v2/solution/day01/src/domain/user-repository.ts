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

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<UserWithPassword | null>;
  create(input: CreateUserInput): Promise<User>;
}
