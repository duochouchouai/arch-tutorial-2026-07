# Day 06 延伸思考

## 1. 如果要在 CI 中加入测试，package.json 里需要加什么？

当前 `package.json` 已经有 `"test": "vitest run"`，但 CI 还需要一个 CI 专用命令：

```json
"scripts": {
  "start": "ts-node src/index.ts",
  "test": "vitest run",
  "test:ci": "vitest run --coverage"    // ← CI 用，输出覆盖率报告
}
```

`vitest run`（不是 `vitest`）是关键——`run` 模式只执行一轮然后退出，不会进入 watch 模式，CI 环境必须用这个。

另外 CI 流程通常还需要：

- `.github/workflows/test.yml` — GitHub Actions 配置
- `vitest.config.ts` — 配置 `reporter: 'junit'` 等 CI 兼容格式

> **`vitest run` vs `vitest`：差一个 `run`，CI 会永远挂在那里等文件变更。**

---

## 2. 为什么 createMockRepo 要写 16 个 vi.fn()？有没有更简洁的方式？

因为 `UserRepository` 接口有 16 个方法，TypeScript 要求 mock 对象实现全部。每次写测试都要写 16 行，确实烦。

### 方案 1：抽公共工厂

```typescript
// tests/helpers.ts
export function createMockRepo(overrides?: Partial<UserRepository>): UserRepository {
  const defaults: UserRepository = {
    findById: vi.fn(), findByUsername: vi.fn(), findByEmail: vi.fn(),
    create: vi.fn(), findByOAuth: vi.fn(), createOAuthUser: vi.fn(),
    updateResetToken: vi.fn(), findByResetToken: vi.fn(), updatePassword: vi.fn(),
    createRememberToken: vi.fn(), findUserIdByRememberToken: vi.fn(), deleteRememberToken: vi.fn(),
    getLockStatus: vi.fn().mockResolvedValue({ failedAttempts: 0, lockedUntil: null }),
    incrementFailedAttempts: vi.fn().mockResolvedValue(1),
    resetLockStatus: vi.fn(), lockAccount: vi.fn(),
  };
  return { ...defaults, ...overrides };
}
```

每个测试文件一行搞定：

```typescript
const repo = createMockRepo({
  findByUsername: vi.fn().mockResolvedValue(mockUser),
});
```

### 方案 2：`vi.mock` 模块级 mock

```typescript
vi.mock('../../src/infrastructure/user-repository-sqlite', () => ({
  SqliteUserRepository: class MockRepo implements UserRepository {
    // 只实现需要的方法，其余 stubbed
  }
}));
```

但这种方式耦合了文件路径，mock 不够灵活。推荐方案 1。

> **重复代码不只是 DRY 问题——它让测试意图被噪音淹没。抽工厂后，一眼能看出这个测试 mock 了哪个方法。**

---

## 3. 如果要测试 SqliteUserRepository（需要真实数据库），应该怎么设计？

这是**集成测试**，不是单元测试。需要改测试策略：

### 文件结构
```
tests/
├── application/         ← 单元测试（mock，快，每次提交跑）
│   ├── register-user.test.ts
│   ├── login-user.test.ts
│   └── logout.test.ts
│
└── infrastructure/      ← 集成测试（真实 SQLite，慢，合并前跑）
    └── user-repository-sqlite.test.ts
```

### 集成测试的注意事项

1. **用临时数据库** — 每次测试前 `:memory:` 模式创建，测试后自动销毁，不污染本地 `.db` 文件
2. **每个测试独立** — `beforeEach` 建表 + 插入种子数据，`afterEach` 清空
3. **测试真实 SQL 行为** — 比如验证 `findByResetToken` 确实能过滤过期 token
4. **CI 中跳过或单独触发** — 集成测试慢，可以 `vitest run --exclude tests/infrastructure`

> **单元测试测"业务规则对不对"，集成测试测"SQL 对不对"。两者缺一不可，但不要混在一起。**

---

## 4. 今天的测试覆盖了正常路径和错误路径。还有哪些边界情况没有覆盖？

| 缺失的边界 | 测试用例示例 |
|-----------|------------|
| 空字符串用户名 | `useCase.execute({ username: '', password: '123456' })` → 应抛 ValidationError |
| 超长字符串（1000 字符） | `useCase.execute({ username: 'a'.repeat(1000), ... })` → 应该怎么处理？ |
| 特殊字符 / XSS | `username: '<script>alert(1)</script>'` → Zod 应该无意见放行，但领域层是否要做白名单？ |
| 用户名前后空格 | `username: '  alice  '` → 应 trim 掉吗？谁来做 trim？ |
| 邮箱大小写 | `email: 'ALICE@EXAMPLE.COM'` → 应该转为小写再存吗？ |
| 密码为只含空格 | `password: '      '`（6 个空格）→ Zod 会通过，是否该拒绝？ |
| 并发注册同一用户名 | 两个请求同时注册 `alice` → 谁先 touch 数据库谁赢，但另一个应该看到干净的错误 |

### 谁来做这些处理？

| 问题 | 在哪一层 |
|------|---------|
| trim 空格、lowercase 邮箱 | **presentation 层**（Zod `.transform()`）或 **application 层**（use case 先处理再调 repository） |
| 拒绝纯空格密码 | **application 层** — 这是业务规则 |
| XSS 防御 | **presentation 层** — 输出编码，不是入库时的职责 |
| 并发冲突 | **infrastructure 层** — 数据库 UNIQUE 约束兜底 |

> **测试不是追求 100% 覆盖，而是保证核心业务逻辑不会被意外破坏。边界情况要挑"有实战风险的"去测，而不是为覆盖而覆盖。**

---

## 总结

Day 06 的核心学习点：

1. **单元测试测业务逻辑** — mock 替换依赖，不启动服务不连数据库
2. **mock 工厂化** — 抽公共工厂，让测试文件只表达意图
3. **集成测试分开管** — 真实数据库的测试用 `:memory:`，不和单元测试混跑
4. **边界情况选着测** — 优先覆盖有实战风险的，分层处理
