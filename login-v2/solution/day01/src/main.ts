/**
 * @file 服务入口 — 组合根（Composition Root）
 * @author 教程组
 *
 * 整个应用只有这里知道「谁是谁的实现」：
 *   共享基础设施（时钟 / id / 事件总线）→ auth 模块 → HTTP 装配。
 * 模块自己不认识彼此的实现，全部依赖从构造函数进。
 *
 * createApp 单独导出：e2e 测试直接复用它，不另写一套装配（测的装配 = 跑的装配）。
 * 本阶段还没有需要配置的东西，也没有错误处理中间件（Day 02 加入）；
 * Day 05 起签名开始收 config，组合根始终是唯一读配置的代码。
 */
import express from 'express'
import { loadConfig } from './config/index'
import { createAuthModule } from './modules/auth/index'

export interface AppBundle {
  app: express.Express
}

export function createApp(): AppBundle {
  // ① 模块装配（本阶段模块内还没有可注入的依赖）
  const auth = createAuthModule()

  // ② HTTP 装配
  const app = express()
  app.use(express.json())
  // 探针：不属于任何业务模块，直接挂组合根
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  app.use('/auth', auth.createRouter())
  return { app }
}

// 直接运行才监听端口（被测试 import 时不启动服务）
if (require.main === module) {
  const config = loadConfig()
  const { app } = createApp()
  app.listen(config.port, () => {
    console.log(`login-v2 服务已启动：http://localhost:${config.port}`)
  })
}
