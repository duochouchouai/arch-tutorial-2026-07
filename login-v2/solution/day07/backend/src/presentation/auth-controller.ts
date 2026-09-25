import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';

import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, autoLoginSchema, oauthSchema, logoutSchema } from './auth-schema';
import { RegisterUserUseCase } from '../application/register-user';
import { LoginUserUseCase } from '../application/login-user';
import { ForgotPasswordUseCase } from '../application/forgot-password';
import { ResetPasswordUseCase } from '../application/reset-password';
import { AutoLoginUseCase } from '../application/auto-login';
import { OAuthLoginUseCase } from '../application/oauth-login';
import { LogoutUseCase } from '../application/logout';
import { AppError, LockedError } from '../shared/errors';

/**
 * 创建认证路由
 *
 * Controller 只关心三件事：
 * 1. 解析请求（从 req 中拿数据）
 * 2. 调用 use case（业务逻辑委托给 application 层）
 * 3. 统一响应（成功返回 200/201，失败返回对应错误码）
 *
 * 对比 v1：v1 的 handler 里混了校验、业务逻辑、数据库操作。
 * 这里 controller 只管 HTTP 层面的问题。
 * 依赖通过参数注入，不自己 new —— 方便测试。
 */
export function createAuthController(
  registerUseCase: RegisterUserUseCase,
  loginUseCase: LoginUserUseCase,
  forgotPasswordUseCase: ForgotPasswordUseCase,
  resetPasswordUseCase: ResetPasswordUseCase,
  autoLoginUseCase: AutoLoginUseCase,
  oauthLoginUseCase: OAuthLoginUseCase,
  logoutUseCase: LogoutUseCase,
): Router {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const input = registerSchema.parse(req.body);
      const user = await registerUseCase.execute(input);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await loginUseCase.execute(input);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/auto-login', async (req: Request, res: Response) => {
    try {
      const { token } = autoLoginSchema.parse(req.body);
      const user = await autoLoginUseCase.execute(token);
      res.json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      await forgotPasswordUseCase.execute(email);
      // 无论邮箱是否存在，都返回「已发送」——防止枚举
      res.json({ success: true, message: '重置链接已发送到您的邮箱' });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await resetPasswordUseCase.execute(input);
      res.json({ success: true, message: '密码重置成功' });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/oauth', async (req: Request, res: Response) => {
    try {
      const input = oauthSchema.parse(req.body);
      const user = await oauthLoginUseCase.execute(input);
      res.json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const { token } = logoutSchema.parse(req.body);
      await logoutUseCase.execute(token);
      res.json({ success: true, message: '已退出登录' });
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    res.status(400).json({ success: false, message: error.errors[0].message });
    return;
  }

  if (error instanceof LockedError) {
    res.status(401).json({ success: false, message: error.message, lockedUntil: error.lockedUntil });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  console.error('未处理的错误:', error);
  res.status(500).json({ success: false, message: '服务器内部错误' });
}
