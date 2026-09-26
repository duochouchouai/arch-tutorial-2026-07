/**
 * @file auth 路由表 — 路径 → 控制器的映射，只有映射，没有逻辑
 * @author 教程组
 */
import { Router } from 'express'
import type { AuthController } from './auth.controller'

export function createAuthRouter(controller: AuthController): Router {
  const router = Router()
  router.post('/send-code', (req, res, next) => void controller.sendCode(req, res, next))
  router.post('/register', (req, res, next) => void controller.register(req, res, next))
  router.post('/login', (req, res, next) => void controller.login(req, res, next))
  router.get('/session', (req, res, next) => void controller.currentSession(req, res, next))
  router.delete('/session', (req, res, next) => void controller.logout(req, res, next))
  return router
}
