import express from 'express';

import { initDatabase } from './infrastructure/database';
import { PgUserRepository } from './infrastructure/user-repository-pg';
import { RegisterUserUseCase } from './application/register-user';
import { LoginUserUseCase } from './application/login-user';
import { ForgotPasswordUseCase } from './application/forgot-password';
import { ResetPasswordUseCase } from './application/reset-password';
import { AutoLoginUseCase } from './application/auto-login';
import { OAuthLoginUseCase } from './application/oauth-login';
import { LogoutUseCase } from './application/logout';
import { createAuthController } from './presentation/auth-controller';

// ──────────────────────────────────────────────
// Composition Root（组合根）
//
// 这里是整个应用的组装点：
//   1. 初始化基础设施（PostgreSQL 连接池 + 建表）
//   2. 创建具体实现（PgUserRepository）
//   3. 注入到 use case
//   4. 注入到 controller
//   5. 挂载路由
//
// 对比 day06：只换了数据库实现，use case / controller 一行未动。
// ──────────────────────────────────────────────

async function start() {
  // 1. 基础设施
  await initDatabase();
  const userRepository = new PgUserRepository();

  // 2. 业务用例（注入仓库实现）
  const registerUseCase = new RegisterUserUseCase(userRepository);
  const loginUseCase = new LoginUserUseCase(userRepository);
  const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepository);
  const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);
  const autoLoginUseCase = new AutoLoginUseCase(userRepository);
  const oauthLoginUseCase = new OAuthLoginUseCase(userRepository);
  const logoutUseCase = new LogoutUseCase(userRepository);

  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    if (_req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use('/auth', createAuthController(
    registerUseCase, loginUseCase,
    forgotPasswordUseCase, resetPasswordUseCase,
    autoLoginUseCase, oauthLoginUseCase,
    logoutUseCase,
  ));

  app.listen(3000, () => {
    console.log('登录服务已启动：http://localhost:3000');
  });
}

start();
