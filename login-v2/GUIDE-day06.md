# GUIDE-day06 — 退出登录 + 单元测试

预计时间：**50 分钟**（退出登录 15 分钟 + 测试 30 分钟 + 验证 5 分钟）

---

## 📖 今天做什么

两件事：

1. **退出登录** — `POST /auth/logout`，销毁记住我 token，让自动登录失效
2. **引入单元测试** — 用 vitest 为 application 层的 use case 写测试

---

## 🗑️ v1 回顾：Day 04 和 Day 06 的问题

| 问题 | v1 表现 | 后果 |
|------|---------|------|
| ❌ 无法退出 | 记住我 token 一旦生成就永远有效 | 用户不能主动销毁登录态 |
| ❌ 无测试 | 整个项目零测试 | 改一行不知道炸没炸 |
| ❌ `/tokens` 泄露所有 token | 调试接口暴露所有记住我 token | 在生产环境就是数据泄露 |

v2 今天解决前两个问题——加退出功能、加单元测试。第三个问题（泄露）只要我们不写 `/tokens` 接口，就不会发生。

---

## 🎯 架构变化

```
day05 → day06 改动分布：

src/
├── application/
│   └── logout.ts                         ← ★ 新增（简单的用例）
├── presentation/
│   ├── auth-schema.ts                    ← ＋logoutSchema
│   └── auth-controller.ts                ← ＋/auth/logout 路由
└── index.ts                              ← ＋LogoutUseCase

tests/                                   ← ★ 新增目录
└── application/
    ├── register-user.test.ts             ← 5 个测试
    ├── login-user.test.ts                ← 6 个测试
    └── logout.test.ts                    ← 2 个测试
```

**退出部分**改 3 个文件 + 新增 1 个文件。
**测试部分**新增 3 个文件。

---

## ✍️ 今天要改的文件

### Part 1 — 退出登录

#### Step 1 — 新建 application/logout.ts

```typescript
import { UserRepository } from '../domain/user-repository';

export class LogoutUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(token: string): Promise<void> {
    await this.userRepository.deleteRememberToken(token);
  }
}
```

这是目前**最简单的 use case**——只做一件事，一行核心逻辑。

`deleteRememberToken` 接口在 day03 就已经定义好了，`SqliteUserRepository` 也已经实现了。今天只是把这个能力暴露给用户。

**这就是接口定义先行带来的好处：** 功能做不做、什么时候做，不会影响架构设计。

---

#### Step 2 — presentation/auth-schema.ts（加 3 行）

```typescript
export const logoutSchema = z.object({
  token: z.string().min(1, 'token 不能为空'),
});
```

---

#### Step 3 — presentation/auth-controller.ts（加 import + 参数 + 路由）

**import 加两项：**
```typescript
import { ..., logoutSchema } from './auth-schema';
import { LogoutUseCase } from '../application/logout';
```

**函数签名加参数：**
```typescript
export function createAuthController(
  ...,
  logoutUseCase: LogoutUseCase,
): Router {
```

**新增路由（在 oauth 之后、return 之前）：**
```typescript
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const { token } = logoutSchema.parse(req.body);
      await logoutUseCase.execute(token);
      res.json({ success: true, message: '已退出登录' });
    } catch (error) {
      handleError(res, error);
    }
  });
```

---

#### Step 4 — src/index.ts（注册）

```typescript
import { LogoutUseCase } from './application/logout';
const logoutUseCase = new LogoutUseCase(userRepository);
// 在 createAuthController 参数末尾加上 logoutUseCase
```

---

### Part 2 — 单元测试

#### Step 5 — 安装 vitest

```bash
npm install --save-dev vitest
```

然后在 `package.json` 的 `scripts` 中加上：

```json
"test": "vitest run"
```

`vitest run` 会执行所有 `*.test.ts` 文件，输出结果后退出。

---

#### Step 6 — 理解「为什么清洁架构容易测试」

清洁架构 + 依赖注入 = **天然可测试**。

```
┌─────────────────────────────────────────┐
│         测试 RegisterUserUseCase         │
│                                         │
│  1. 创建一个 mock 仓库（不碰数据库）       │
│  2. 传入合法的输入                        │
│  3. 验证：返回了 User、抛出了正确的异常     │
│                                         │
│  不用启动服务器、不用建表、不用准备数据     │
└─────────────────────────────────────────┘
```

因为 use case 只依赖 `UserRepository` 接口（而不是具体的 `SqliteUserRepository`），测试时可以用 mock 替换。这就是**依赖注入的可测试性红利**。

#### Step 7 — 创建 tests/application/logout.test.ts

```typescript
import { describe, it, expect, vi } from 'vitest';
import { LogoutUseCase } from '../../src/application/logout';
import { UserRepository } from '../../src/domain/user-repository';

function createMockRepo(): UserRepository {
  return {
    deleteRememberToken: vi.fn(),
    // 其他方法用不到，但 TypeScript 要求实现全部接口
    findById: vi.fn(), findByUsername: vi.fn(), findByEmail: vi.fn(),
    create: vi.fn(), findByOAuth: vi.fn(), createOAuthUser: vi.fn(),
    updateResetToken: vi.fn(), findByResetToken: vi.fn(), updatePassword: vi.fn(),
    createRememberToken: vi.fn(), findUserIdByRememberToken: vi.fn(),
    getLockStatus: vi.fn(), incrementFailedAttempts: vi.fn(),
    resetLockStatus: vi.fn(), lockAccount: vi.fn(),
  };
}

describe('LogoutUseCase', () => {
  it('should delete the remember token', async () => {
    const repo = createMockRepo();
    const useCase = new LogoutUseCase(repo);

    await useCase.execute('some-token');

    expect(repo.deleteRememberToken).toHaveBeenCalledWith('some-token');
  });

  it('should not throw when token does not exist', async () => {
    const repo = createMockRepo();
    const useCase = new LogoutUseCase(repo);

    await expect(
      useCase.execute('non-existent'),
    ).resolves.not.toThrow();
  });
});
```

#### Step 8 — 创建 tests/application/register-user.test.ts

写 5 个测试覆盖注册用例的核心逻辑：

| 测试场景 | 验证什么 |
|---------|--------|
| 合法用户注册成功 | 返回了 User 对象 |
| 用户名太短 | 抛出 ValidationError |
| 密码太短 | 抛出 ValidationError |
| 用户名重复 | 抛出 ConflictError |
| 不存明文密码 | `hashedPassword` 是 bcrypt 格式，不是原文 |

关键代码——测试「不存明文密码」：

```typescript
it('should not store plain text password', async () => {
  const repo = createMockRepo();
  let savedHashedPassword = '';
  repo.create = vi.fn().mockImplementation(async (input) => {
    savedHashedPassword = input.hashedPassword;
    return { id: 1, username: input.username, email: input.email };
  });
  const useCase = new RegisterUserUseCase(repo);

  await useCase.execute({ username: 'test', password: 'mypassword' });

  expect(savedHashedPassword).not.toContain('mypassword');
  expect(savedHashedPassword).toMatch(/^\$2[ab]/); // bcrypt 格式
});
```

这个测试直接验证了 v1 day01 没有做到的事——密码不是明文存储。

#### Step 9 — 创建 tests/application/login-user.test.ts

写 6 个测试覆盖登录的核心路径：

| 测试场景 | 验证什么 |
|---------|--------|
| 正确凭证登录成功 | 返回用户信息（不含密码哈希） |
| 密码错误 | 抛出 UnauthorizedError |
| 用户名不存在 | 抛出 UnauthorizedError（和密码错误相同） |
| 记住我登录 | 返回 token |
| 不记住我 | 不返回 token |
| 账户被锁定 | 抛出「账户已锁定」 |

注意测试「账户被锁定」时，只需要 mock `getLockStatus` 返回一个未来的 `lockedUntil`：

```typescript
repo.getLockStatus = vi.fn().mockResolvedValue({
  failedAttempts: 5,
  lockedUntil: new Date(Date.now() + 3600000).toISOString(),
});
```

不需要真的输错 5 次。**mock 让我们能直接测试边界状态**，不需要建立前置条件。

#### ⚠️ Mock 的陷阱

写测试时容易遇到一个坑：`getLockStatus` 返回 `undefined`。

```typescript
// ❌ 这样写，getLockStatus 返回 undefined
getLockStatus: vi.fn(),

// ✅ 这样写，getLockStatus 返回一个合理的默认值
getLockStatus: vi.fn().mockResolvedValue({ failedAttempts: 0, lockedUntil: null }),
```

`vi.fn()` 默认返回 `undefined`。而我们的登录用例会访问 `lockStatus.lockedUntil`——如果是 `undefined`，程序会直接报 `TypeError`。

这就是为什么测试发现了一个**运行时空指针风险**——虽然生产环境不太容易出现（`getLockStatus` 总是会返回行数据），但类型安全上它确实不是完全安全的。一个 `if (!lockStatus) return` 可以防住，但这不在本教程范围内。

---

## ✅ 验证

### 退出登录验证

```bash
rm login-v2.db
npm start

# 1. 注册 + 记住我登录
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","email":"a@b.com"}'

RESP=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"123456","rememberMe":true}')
# 从 RESP 中提取 token（手动复制）

# 2. 自动登录验证 token 有效
curl -X POST http://localhost:3000/auth/auto-login \
  -H 'Content-Type: application/json' \
  -d '{"token":"<上面的TOKEN>"}'
# → {"success":true,"data":{"id":1,"username":"alice",...}}

# 3. 退出登录
curl -X POST http://localhost:3000/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"token":"<上面的TOKEN>"}'
# → {"success":true,"message":"已退出登录"}

# 4. 再次自动登录（应失败）
curl -X POST http://localhost:3000/auth/auto-login \
  -H 'Content-Type: application/json' \
  -d '{"token":"<上面的TOKEN>"}'
# → {"success":false,"message":"自动登录已过期，请重新登录"}
```

### 单元测试验证

```bash
npm test
# → 3 test files, 13 tests all passed ✓
```

---

## 💡 今天学到了什么

### 退出登录——最简单的功能，最完整的流程

LogoutUseCase 只有 8 行代码，但它经过了完整的 4 层架构：

```
Route  →  Schema  →  UseCase  →  Repository  →  SQL DELETE
/logout   校验       deleteToken 接口调用        parameterized
```

再简单的功能也走同样的架构路径。**一致性比「偷懒省几行」重要得多。**

### 测试——清洁架构的隐藏红利

清洁架构最大的优势不是代码漂亮，而是**可测试**。

| 架构 | 测试难度 |
|------|---------|
| v1：全部在 main.js | ❌ 几乎不可测——需要启动服务器、需要数据库、需要准备 HTTP 请求 |
| v2：依赖注入 + 接口抽象 | ✅ 纯逻辑测试——mock 仓库接口，跑测试不需要启动任何服务 |

对比测试执行时间：
- v1：启动 Express → 连接 SQLite → curl → 解析 JSON → 断言（~3 秒/次）
- v2：vitest + mock → 纯内存运行（~0.04 秒/测试）

**13 个测试，总执行时间不到 1 秒。** 这种反馈循环让你愿意频繁跑测试。

### 延伸思考

- 如果要在 CI 中加入测试，`package.json` 里需要加什么？
- 为什么 `createMockRepo` 要写 16 个 `vi.fn()`？有没有更简洁的方式？（提示：`vi.fn()` 的 `mockImplementation`、`beforeEach`）
- 如果要测试 `SqliteUserRepository`（需要真实数据库），应该怎么设计测试？
- 今天的测试覆盖了「正常路径」和「错误路径」。还有哪些边界情况没有覆盖？（比如空字符串、超长字符串、XSS 攻击向量）

---

## 📁 参考 solution

```
solution/day06/
├── package.json                          ← 加了 vitest 和 test 脚本
├── src/
│   ├── index.ts                          ← ＋LogoutUseCase
│   ├── application/logout.ts             ← ★ 新增
│   ├── presentation/auth-schema.ts       ← ＋logoutSchema
│   ├── presentation/auth-controller.ts   ← ＋/auth/logout
│   └── ...其他文件不变
└── tests/
    └── application/
        ├── register-user.test.ts         ← 5 tests
        ├── login-user.test.ts            ← 6 tests
        └── logout.test.ts                ← 2 tests
```
