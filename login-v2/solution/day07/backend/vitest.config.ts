import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// 本地 .env 参与测试：PG 集成测试要真实外部资源，靠它拿到 DATABASE_URL；
// 没有 .env 也一样跑（相关用例 describe.skipIf 自动跳过）。
if (existsSync('.env')) process.loadEnvFile()

// 测试量不大：显式限制并发 worker（min/max 成对写，避免 pool 参数冲突），
// 低配机器/CI 上不至于把内存打满
export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: 2,
  },
})
