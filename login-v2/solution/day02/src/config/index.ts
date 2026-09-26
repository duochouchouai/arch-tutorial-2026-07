/**
 * @file 启动配置 — 环境变量的唯一校验点
 * @author 教程组
 *
 * 配置也是「跨边界数据」（进程外 → 进程内），必须校验后再用：
 * 端口不是数字、bcrypt 轮数是负数，都应该在**启动时**炸，
 * 而不是在某个深夜的请求里才暴露。默认值让零配置也能跑起来。
 */
import { z } from 'zod'

export const ConfigSchema = z.object({
  port: z.coerce.number().int().min(0).max(65535).default(3000),
  dbPath: z.string().default('login-v2.db'),
  /** bcrypt 轮数：生产 10+；测试装配传 4 提速 */
  bcryptRounds: z.coerce.number().int().min(4).max(15).default(10),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
})
export type Config = z.infer<typeof ConfigSchema>

/** 从环境变量装载配置；任何非法值在此抛错（fail fast） */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse({
    port: env['PORT'],
    dbPath: env['DB_PATH'],
    bcryptRounds: env['BCRYPT_ROUNDS'],
    nodeEnv: env['NODE_ENV'],
  })
}
