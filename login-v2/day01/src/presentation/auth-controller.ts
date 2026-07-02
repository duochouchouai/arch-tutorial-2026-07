import { Router, Request, Response } from 'express';
import {ZodError } from 'zod';

import { registerSchema, loginSchema } from './auth-schema';
import { RegisterUserUseCase } from '../application/register-user';
import { LoginUserUseCase } from '../application/login-user';
import { AppError } from '../shared/errors';

export function createAuthController(
    RegisterUserUseCase: RegisterUserUseCase,
    LoginUserUseCase: LoginUserUseCase,
): Router {
    const router = Router();

    router.post('/register', async (req: Request, res:Response) =>{
        try {
            const input = registerSchema.parse(req.body);
            const user = await RegisterUserUseCase.execute(input);
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            handleError(res,error);
        }
    });

    router.post('/login', async (req: Request, res: Response) => {
        try {
            const input = loginSchema.parse(req.body);
            const user = await LoginUserUseCase.execute(input);
            res.status(200).json({ success: true, data: user });
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