import { describe, expect, it } from 'vitest'
import { loadConfig } from './index'

describe('loadConfig', () => {
  it('零配置时给出可用默认值', () => {
    const config = loadConfig({})
    expect(config.port).toBe(3000)
    expect(config.dbPath).toBe('login-v2.db')
    expect(config.bcryptRounds).toBe(10)
  })

  it('字符串环境变量被强转为数字', () => {
    const config = loadConfig({ PORT: '8080', BCRYPT_ROUNDS: '4' })
    expect(config.port).toBe(8080)
    expect(config.bcryptRounds).toBe(4)
  })

  it('非法端口在启动时即抛错（fail fast）', () => {
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow()
    expect(() => loadConfig({ PORT: '70000' })).toThrow()
  })
})
