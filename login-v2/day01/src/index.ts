import express from 'express';

import { getDatabase } from './infrastructure/database';
import { SqliteUserRepository } from './infrastructure/user-repository-sqlite';
import { RegisterUserUseCase } from './application/register-user';
import { LoginUserUseCase } from './application/login-user';
import { createAuthController } from './presentation/auth-controller';

// 1. 基础设施：数据库
getDatabase();
const userRepository = new SqliteUserRepository();

// 2. 业务用例：注入仓库实现
const registerUserUseCase = new RegisterUserUseCase(userRepository);
const loginUserUseCase = new LoginUserUseCase(userRepository);

// 3. Express 应用
const app =express();
app.use(express.json());

// 4. 路由：注入use case
app.use('/auth', createAuthController(registerUserUseCase, loginUserUseCase));

// 5. 启动
app.listen(3000, () => {
    console.log('登录服务已启动：http://localhost:3000')
});