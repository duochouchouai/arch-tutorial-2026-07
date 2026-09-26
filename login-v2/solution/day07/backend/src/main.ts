/**
 * @file 服务入口 — 组合根（Composition Root）
 * @author 教程组
 *
 * 整个应用只有这里知道「谁是谁的实现」：
 *   共享基础设施 → users 模块 → auth 模块（注入 users 的公共端口）
 *   → notifications 模块（订阅事件总线）→ HTTP 装配。
 * 「换数据库」（Day 07 Task 2）只在这里体现为一个字段透传：databaseUrl。
 * 模块自己不认识彼此的实现，全部依赖从构造函数进。
 *
 * createApp 单独导出：e2e 测试直接复用它，不另写一套装配（测的装配 = 跑的装配）。
 */
import express from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { loadConfig, loadEnvFile, type Config } from './config/index'
import {
  CryptoIdGenerator,
  InMemoryEventBus,
  SystemTimeProvider,
  errorHandler,
  openDatabase,
} from './modules/shared/index'
import { createUsersModule } from './modules/users/index'
import { createAuthModule } from './modules/auth/index'
import { createNotificationsModule } from './modules/notifications/index'

export interface AppBundle {
  app: express.Express
  /** 暴露给 e2e 测试白盒查表用（生产代码不消费它） */
  db: DatabaseSync
}

export function createApp(config: Config): AppBundle {
  // ① 共享基础设施：连接 / 时钟 / id / 事件总线
  const db = openDatabase(config.dbPath)
  const timeProvider = new SystemTimeProvider()
  const idGenerator = new CryptoIdGenerator()
  const eventBus = new InMemoryEventBus()

  // ② 模块按依赖顺序装配：users 在前（auth 要注入它的公共端口）
  //    config.databaseUrl 有值 → users 的账号仓储切到 Postgres（其余模块不改一行）
  const users = createUsersModule({ db, databaseUrl: config.databaseUrl })
  const auth = createAuthModule({
    db,
    userAccount: users.account,
    timeProvider,
    idGenerator,
    eventBus,
    bcryptRounds: config.bcryptRounds,
  })
  // ③ 订阅方：装配即订阅，auth 一行不改（Day 07 Task 4）
  createNotificationsModule({ eventBus })

  // ④ HTTP 装配
  const app = express()
  app.use(express.json())
  // 探针：不属于任何业务模块，直接挂组合根
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })
  app.use('/auth', auth.createRouter())
  app.use(errorHandler)
  return { app, db }
}

// 直接运行才监听端口（被测试 import 时不启动服务）
if (require.main === module) {
  // 本地开发把配置放 .env（照 .env.example 抄一份）；.env 永不进仓库
  loadEnvFile()
  const config = loadConfig()
  const { app } = createApp(config)
  app.listen(config.port, () => {
    console.log(`login-v2 服务已启动：http://localhost:${config.port}`)
  })
}
