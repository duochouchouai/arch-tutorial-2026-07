/**
 * User 类型定义
 *
 * 与后端 domain/user.ts 完全一致。
 * 前后端共享同一个类型定义，保证接口契约一致。
 */
export interface User {
  id: number;
  username: string;
  email: string;
}
