/**
 * User 实体
 *
 * 代表系统中的用户概念，和数据库无关，和 Express 无关。
 * 这就是 Domain 层的核心——纯业务概念。
 */
export interface User {
  id: number;
  username: string;
  email: string;
}
