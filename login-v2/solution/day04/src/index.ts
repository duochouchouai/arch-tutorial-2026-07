import express from 'express';

import { getDatabase } from './infrastructure/database';
import { SqliteUserRepository } from './infrastructure/user-repository-sqlite';
import { RegisterUserUseCase } from './application/register-user';
import { LoginUserUseCase } from './application/login-user';
import { ForgotPasswordUseCase } from './application/forgot-password';
import { ResetPasswordUseCase } from './application/reset-password';
import { AutoLoginUseCase } from './application/auto-login';
import { createAuthController } from './presentation/auth-controller';

// ──────────────────────────────────────────────
// Composition Root（组合根）
//
// 这里是整个应用的组装点：
//   1. 初始化基础设施（数据库）
//   2. 创建具体实现（SqliteUserRepository）
//   3. 注入到 use case
//   4. 注入到 controller
//   5. 挂载路由
//
// 所有依赖都在这里「自顶向下」注入。
// 任何一层都不需要自己 new 依赖——这就是依赖注入。
// ──────────────────────────────────────────────

// 1. 基础设施
getDatabase();
const userRepository = new SqliteUserRepository();

// 2. 业务用例（注入仓库实现）
const registerUseCase = new RegisterUserUseCase(userRepository);
const loginUseCase = new LoginUserUseCase(userRepository);
const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepository);
const resetPasswordUseCase = new ResetPasswordUseCase(userRepository);
const autoLoginUseCase = new AutoLoginUseCase(userRepository);

// 3. 应用
const app = express();
app.use(express.json());

// 4. 路由（注入 use case）
app.use('/auth', createAuthController(
  registerUseCase, loginUseCase,
  forgotPasswordUseCase, resetPasswordUseCase,
  autoLoginUseCase,
));

// 5. 启动
app.listen(3000, () => {
  console.log('登录服务已启动：http://localhost:3000');
});
