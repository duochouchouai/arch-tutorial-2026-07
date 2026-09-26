/**
 * @file auth 模块组合根 — 骨架
 * @author 教程组
 *
 * 模块对外的形状从第一天就立好：
 *   createXxxModule(deps) → { createRouter() }
 * main.ts 只认这个入口，不认模块内部（domain/validators/… 都不许被外部 import）。
 *
 * 本阶段模块里还没有用例与基础设施，路由留空；
 * Day 05 起这里开始真正装配（端口实现 → 用例 → 控制器 → 路由）。
 */
import { Router } from 'express'

export interface AuthModule {
  createRouter: () => Router
}

export function createAuthModule(): AuthModule {
  // 骨架阶段没有端点：/auth 下暂时全是 404。Day 05 挂上 send-code / register / login / session。
  return { createRouter: () => Router() }
}
