import { Router, Request, Response } from 'express';
import {ZodError } from 'zod';

import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, autoLoginSchema } from './auth-schema';
import { RegisterUserUseCase } from '../application/register-user';
import { LoginUserUseCase } from '../application/login-user';
import { AutoLoginUseCase } from '../application/auto-login';
import { ForgotPasswordUseCase } from '../application/forgot-password';
import { ResetPasswordUseCase } from '../application/reset-password';
import { AppError } from '../shared/errors';

export function createAuthController(
    registerUserUseCase: RegisterUserUseCase,
    loginUserUseCase: LoginUserUseCase,
    forgotPasswordUseCase: ForgotPasswordUseCase,
    resetPasswordUseCase: ResetPasswordUseCase,
    autoLoginUseCase: AutoLoginUseCase,
): Router {
    const router = Router();

    router.post('/register', async (req: Request, res:Response) =>{
        try {
            const input = registerSchema.parse(req.body);
            const user = await registerUserUseCase.execute(input);
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            handleError(res,error);
        }
    });

    router.post('/login', async (req: Request, res: Response) => {
        try {
            const input = loginSchema.parse(req.body);
            const result = await loginUserUseCase.execute(input);
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

    router.post('/forgot-password', async (req: Request, res:Response) =>{
        try {
            const { email } = forgotPasswordSchema.parse(req.body);
            await forgotPasswordUseCase.execute(email);
            res.json({ success: true, message: '重置链接已发送到您的邮箱'});
        } catch (error) {
            handleError(res, error);
        }
    });

    router.post('/reset-password', async (req: Request, res:Response) =>{
        try {
            const input = resetPasswordSchema.parse(req.body);
            await resetPasswordUseCase.execute(input);
            res.json({ success: true, message: '密码重置成功'});
        } catch (error) {
            handleError(res, error);
        }
    });

    return router;
}

function handleError(res: Response, error:unknown) {
    if (error instanceof ZodError) {
        // 校验失败：400
        res.status(400).json({ success: false, message: error.errors[0].message });
        return;
    }

    if (error instanceof AppError) {
        // 业务错误：按error.statusCode
        res.status(error.statusCode).json({ success: false, message: error.message });
        return;
    }

    // 未知错误：500
    console.error('未处理的错误:',error);
    res.status(500).json({ success: false, message: '服务器内部错误'});
}