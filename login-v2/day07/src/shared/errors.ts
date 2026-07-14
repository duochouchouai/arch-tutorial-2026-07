/**
 * 统一错误类型
 *
 * 所有业务错误都继承 AppError，controller 可以统一捕获并返回合适的 HTTP 状态码。
 * 不再像 v1 那样：有的错误返回 200 + success:false，有的直接崩掉。
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '认证失败') {
    super(401, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class LockedError extends UnauthorizedError {
  constructor(
    message: string,
    public readonly lockedUntil: string,
  ) {
    super(message);
    this.name = 'LockedError';
  }
}
