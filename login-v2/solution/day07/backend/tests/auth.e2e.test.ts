/**
 * @file auth 全流程 e2e — HTTP 进、HTTP 出，中间全部是真实实现
 * @author 教程组
 *
 * 与用例单测互补：这里不换任何端口实现（除了 bcrypt 轮数走配置调低）。
 * 验证码通过白盒查库获取（注册码本来就只有"收邮件的人"能看到）。
 */
import request from 'supertest'
import type { Express } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/main'

const EMAIL = 'alice@example.com'
const PASSWORD = 'passw0rd'
const NEW_PASSWORD = 'brand-new-passw0rd'

let app: Express
let db: ReturnType<typeof createApp>['db']

beforeEach(() => {
  const bundle = createApp({ port: 0, dbPath: ':memory:', bcryptRounds: 4, nodeEnv: 'test' })
  app = bundle.app
  db = bundle.db
})

/** 白盒取验证码：注册码只会出现在邮件/库里 */
function codeFromDb(purpose: string, target: string): string {
  const row = db.prepare(`SELECT code FROM auth_codes WHERE purpose = ? AND target = ?`).get(purpose, target)
  if (row === undefined) {
    throw new Error(`库里没有 ${purpose}/${target} 的验证码`)
  }
  return String(row['code'])
}

async function registerAlice(): Promise<request.Response> {
  await request(app).post('/auth/send-code').send({ email: EMAIL }).expect(200)
  return request(app)
    .post('/auth/register')
    .send({ username: 'alice', password: PASSWORD, email: EMAIL, code: codeFromDb('register', EMAIL) })
}

describe('注册 → 登录 → 会话 → 退出', () => {
  it('happy path 全程跑通', async () => {
    const registered = await registerAlice()
    expect(registered.status).toBe(201)
    expect(registered.body).toMatchObject({ success: true, data: { user: { username: 'alice', email: EMAIL } } })
    // 响应绝不含内部字段
    expect(JSON.stringify(registered.body)).not.toContain('passwordHash')

    const loggedIn = await request(app).post('/auth/login').send({ username: 'alice', password: PASSWORD })
    expect(loggedIn.status).toBe(200)
    const token: string = loggedIn.body.data.token

    const session = await request(app).get('/auth/session').set('Authorization', `Bearer ${token}`)
    expect(session.status).toBe(200)
    expect(session.body.data.userId).toBe(registered.body.data.user.id)

    await request(app).delete('/auth/session').set('Authorization', `Bearer ${token}`).expect(200)
    await request(app).get('/auth/session').set('Authorization', `Bearer ${token}`).expect(401)
  })
})

describe('注册的失败面', () => {
  it('验证码错误 → 400 字段级错误，且账号未创建', async () => {
    await request(app).post('/auth/send-code').send({ email: EMAIL }).expect(200)
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: PASSWORD, email: EMAIL, code: '000000' })
    expect(res.status).toBe(400)
    expect(res.body.fieldErrors).toHaveProperty('code')

    await request(app).post('/auth/login').send({ username: 'alice', password: PASSWORD }).expect(401)
  })

  it('弱密码 → 400，字段错误指向 password', async () => {
    await request(app).post('/auth/send-code').send({ email: EMAIL }).expect(200)
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'alice', password: '123', email: EMAIL, code: codeFromDb('register', EMAIL) })
    expect(res.status).toBe(400)
    expect(res.body.fieldErrors).toHaveProperty('password')
  })

  it('缺字段 → 400（形状解析先于一切）', async () => {
    const res = await request(app).post('/auth/register').send({ username: 'alice' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('重复注册 → 409，字段错误指向 username', async () => {
    await registerAlice()
    await request(app).post('/auth/send-code').send({ email: 'bob@example.com' }).expect(200)
    const res = await request(app)
      .post('/auth/register')
      .send({
        username: 'alice',
        password: PASSWORD,
        email: 'bob@example.com',
        code: codeFromDb('register', 'bob@example.com'),
      })
    expect(res.status).toBe(409)
    expect(res.body.fieldErrors).toHaveProperty('username')
  })
})

describe('登录的失败面与锁定', () => {
  it('密码错误 → 401，与账号不存在不可区分', async () => {
    await registerAlice()
    const wrong = await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong-pass' })
    const missing = await request(app).post('/auth/login').send({ username: 'nobody', password: 'wrong-pass' })
    expect(wrong.status).toBe(401)
    expect(missing.status).toBe(401)
    expect(wrong.body.message).toBe(missing.body.message)
  })

  it('连续 5 次失败 → 423 锁定；锁定期间正确密码也被拒', async () => {
    await registerAlice()
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong-pass' }).expect(401)
    }
    const locked = await request(app).post('/auth/login').send({ username: 'alice', password: PASSWORD })
    expect(locked.status).toBe(423)
    expect(locked.body.message).toContain('锁定')
  })
})

describe('忘记密码 → 重置密码（Day 07）', () => {
  it('happy path：发重置码 → 重置 → 新密码可登录、旧密码不行、旧会话失效', async () => {
    await registerAlice()
    const loggedIn = await request(app).post('/auth/login').send({ username: 'alice', password: PASSWORD })
    const oldToken: string = loggedIn.body.data.token

    await request(app).post('/auth/forgot-password').send({ email: EMAIL }).expect(200)
    const reset = await request(app)
      .post('/auth/reset-password')
      .send({ email: EMAIL, code: codeFromDb('reset', EMAIL), password: NEW_PASSWORD })
    expect(reset.status).toBe(200)
    expect(reset.body.data.user.username).toBe('alice')

    // 旧密码作废、旧 token 失效、新密码可登录
    await request(app).post('/auth/login').send({ username: 'alice', password: PASSWORD }).expect(401)
    await request(app).get('/auth/session').set('Authorization', `Bearer ${oldToken}`).expect(401)
    await request(app).post('/auth/login').send({ username: 'alice', password: NEW_PASSWORD }).expect(200)
  })

  it('防枚举：未注册邮箱与已注册邮箱响应完全一致（都没有邮件/码）', async () => {
    const unknown = await request(app).post('/auth/forgot-password').send({ email: 'ghost@example.com' })
    expect(unknown.status).toBe(200)
    expect(unknown.body).toEqual({ success: true, data: { email: 'ghost@example.com' } })
    expect(db.prepare(`SELECT COUNT(*) AS n FROM auth_codes WHERE purpose = 'reset'`).get()?.['n']).toBe(0)
  })

  it('重置码一次性 + 用途隔离：注册用途的码不能用来重置密码', async () => {
    await registerAlice()
    await request(app).post('/auth/forgot-password').send({ email: EMAIL }).expect(200)
    const code = codeFromDb('reset', EMAIL)

    // 复用同一枚码的第二次提交必然失败
    await request(app).post('/auth/reset-password').send({ email: EMAIL, code, password: NEW_PASSWORD }).expect(200)
    await request(app).post('/auth/reset-password').send({ email: EMAIL, code, password: NEW_PASSWORD }).expect(400)

    // 注册码（purpose=register）拿去重置 → 无效
    await request(app).post('/auth/send-code').send({ email: 'bob@example.com' }).expect(200)
    const bobRegisterCode = codeFromDb('register', 'bob@example.com')
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'bob@example.com', code: bobRegisterCode, password: NEW_PASSWORD })
    expect(res.status).toBe(400)
  })

  it('弱密码重置 → 400：重置入口不是弱密码后门', async () => {
    await registerAlice()
    await request(app).post('/auth/forgot-password').send({ email: EMAIL }).expect(200)
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ email: EMAIL, code: codeFromDb('reset', EMAIL), password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.fieldErrors).toHaveProperty('password')
  })
})

describe('递进式锁定（Day 07）', () => {
  it('第一轮锁 5 分钟；白盒把锁定时间拨回过去后，第二轮升档锁 15 分钟', async () => {
    await registerAlice()

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong-pass' }).expect(401)
    }

    type LockRow = { lockCount: number; lockedUntil: number; lockedAt: number }
    const readLock = (): LockRow => {
      const row = db.prepare('SELECT lock_count AS lockCount, locked_until AS lockedUntil FROM users').get()
      return { lockCount: Number(row?.['lockCount']), lockedUntil: Number(row?.['lockedUntil']), lockedAt: Date.now() }
    }

    const first = readLock()
    expect(first.lockCount).toBe(1)
    expect(first.lockedUntil - first.lockedAt).toBeGreaterThan(4 * 60_000)

    // 白盒：把锁定截止时间拨回过去 = 时间快进（e2e 用真实时钟，没法 advance）
    db.prepare('UPDATE users SET locked_until = ?').run(Date.now() - 1)
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/auth/login').send({ username: 'alice', password: 'wrong-pass' }).expect(401)
    }

    const second = readLock()
    expect(second.lockCount).toBe(2)
    expect(second.lockedUntil - second.lockedAt).toBeGreaterThan(14 * 60_000)
    expect(second.lockedUntil - second.lockedAt).toBeLessThan(16 * 60_000)
  })
})
