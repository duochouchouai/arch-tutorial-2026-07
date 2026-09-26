/**
 * @file auth 控制器 — HTTP 与用例之间的适配层
 * @author 教程组
 *
 * 控制器的全部工作：
 * 1. 取 body/header（HTTP 世界的输入）；
 * 2. 交给 Validator 做「边界校验」（形状 + 业务规则 + 值对象）；
 * 3. 调用用例；
 * 4. 把结果装进响应信封。
 * 不写业务判断、不碰数据库 —— 在 v1 里这三件事全糊在路由函数里。
 */
import type { NextFunction, Request, Response } from 'express'
import { UnauthorizedError, ok } from '../../shared/index'
import { LoginUseCase, RegisterUseCase, SendCodeUseCase, SessionUseCase } from '../application/index'
import { LoginValidator, RegisterValidator, SendCodeValidator } from '../domain/validators/index'

export interface AuthControllerDeps {
  sendCodeUseCase: SendCodeUseCase
  registerUseCase: RegisterUseCase
  loginUseCase: LoginUseCase
  sessionUseCase: SessionUseCase
  sendCodeValidator: SendCodeValidator
  registerValidator: RegisterValidator
  loginValidator: LoginValidator
}

export class AuthController {
  readonly #deps: AuthControllerDeps

  constructor(deps: AuthControllerDeps) {
    this.#deps = deps
  }

  async sendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = this.#deps.sendCodeValidator.validate(req.body)
      const result = await this.#deps.sendCodeUseCase.execute(input)
      res.status(200).json(ok(result))
    } catch (err) {
      next(err)
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = this.#deps.registerValidator.validate(req.body)
      const result = await this.#deps.registerUseCase.execute(input)
      res.status(201).json(ok(result))
    } catch (err) {
      next(err)
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = this.#deps.loginValidator.validate(req.body)
      const result = await this.#deps.loginUseCase.execute(input)
      res.status(200).json(ok(result))
    } catch (err) {
      next(err)
    }
  }

  async currentSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.#deps.sessionUseCase.current(this.#extractToken(req))
      res.status(200).json(ok(result))
    } catch (err) {
      next(err)
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.#deps.sessionUseCase.logout(this.#extractToken(req))
      res.status(200).json(ok({}))
    } catch (err) {
      next(err)
    }
  }

  /** 从 Authorization: Bearer <token> 取 token；缺失即未认证 */
  #extractToken(req: Request): string {
    const header = req.headers.authorization
    if (header === undefined || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError()
    }
    return header.slice('Bearer '.length)
  }
}
