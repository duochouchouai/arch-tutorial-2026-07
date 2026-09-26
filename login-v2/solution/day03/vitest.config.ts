import { defineConfig } from 'vitest/config'

// 测试量不大：显式限制并发 worker（min/max 成对写，避免 pool 参数冲突），
// 低配机器/CI 上不至于把内存打满
export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: 2,
  },
})
