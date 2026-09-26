/**
 * @file vitest 配置（教程机器内存小：限制并行 worker 数）
 * @author 教程组
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: 2,
  },
})
