# GUIDE-day01 — 搭建 4 层清洁架构，实现注册 + 登录

预计时间：**50 分钟**（概念 5 分钟 + 手打代码 40 分钟 + 验证 5 分钟）

---

## 📖 今天做什么

在 `login-v2/` 从零搭建一个 4 层清洁架构的登录系统：
- 用户注册（用户名 + 密码 + 邮箱）
- 用户登录（验证密码）
- 密码用 **bcrypt 哈希**存储（对比 v1 的明文）
- 数据库使用 **参数化查询**（对比 v1 的字符串拼接）
- 使用 **Zod** 做请求校验（对比 v1 的 `if/else` 四处散落）

**不使用任何 ORM，不引入任何重量级框架。** 每一步都手动写出依赖注入，感受关注点分离。

---

## 🗑️ v1 回顾：Day01 有哪些问题

v1/day01 只有 2 个文件，52 行代码，实现了注册和登录。但每一行都是债：

| 问题 | v1 写法 | 为什么危险 |
|------|---------|-----------|
| ❌ 明文密码 | `INSERT INTO users ... password = '${password}'` | 数据库泄露 = 所有密码泄露 |
| ❌ SQL 注入 | `SELECT * FROM users WHERE name = '${username}'` | 传 `' OR 1=1 --` 能直接登录 |
| ❌ 零校验 | 用户名密码不做任何检查 | 空字符串也能注册 |
| ❌ 零错误处理 | `db.prepare().run()` 没有 try/catch | 数据库崩了进程直接挂 |
| ❌ 200 万能状态码 | 成功失败都 `res.json({ success: false })` | 前端无法用状态码判断 |
| ❌ 调试接口没删 | `/users` 返回所有密码 | 生产环境灾难 |

今天 v2 的每一行代码，都在解决上面的某个问题。

---

## 🎯 清洁架构 4 层

```
┌──────────────────────────────────────────┐
│  presentation/     (路由 + 校验)           │
│  auth-controller.ts                       │
│  auth-schema.ts                           │
│  职责：解析请求 → 调 use case → 返回响应   │
├──────────────────────────────────────────┤
│  application/      (业务用例)              │
│  register-user.ts                         │
│  login-user.ts                            │
│  职责：编排业务逻辑，不关心 I/O            │
├──────────────────────────────────────────┤
│  domain/           (核心模型)              │
│  user.ts                                  │
│  user-repository.ts                       │
│  职责：定义实体 + 接口，不依赖外部         │
├──────────────────────────────────────────┤
│  infrastructure/   (技术实现)              │
│  database.ts                              │
│  user-repository-sqlite.ts                │
│  职责：实现接口，不包含业务逻辑            │
└──────────────────────────────────────────┘

依赖方向：presentation → application → domain ← infrastructure（依赖倒置）
```

**核心规则：**
- 外层依赖内层，内层**不依赖**外层
- domain 层定义接口（repository），infrastructure 层实现
- 通过构造函数注入依赖，不 `new` 在任何文件内部

---

## ✍️ 开始手打

### Step 1 — 创建 src/shared/errors.ts（统一错误类型）

创建文件 `login-v2/src/shared/errors.ts`，输入以下代码：

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '认证失败') {
    super(401, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
```

**📝 为什么这样写：**

所有业务错误都继承 `AppError`，controller 可以统一捕获并根据 `statusCode` 返回对应的 HTTP 状态码。

对比 v1：v1 的成功失败都返回 `200`，前端只能靠 `success: false` 来判断。这里每个错误都有自己的 HTTP 状态码（400、401、409），语义清晰。

---

### Step 2 — 创建 src/domain/user.ts（用户实体）

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
}
```

**📝 为什么这样写：**

`User` 是纯业务概念——**和数据库表结构无关，和 Express 请求无关**。这就是 domain 层的核心：不依赖任何外部框架。

注意这里**没有** `password` 字段。密码哈希是基础设施层的细节，domain 层不需要关心它。

---

### Step 3 — 创建 src/domain/user-repository.ts（仓库接口）

```typescript
import { User } from './user';

export interface CreateUserInput {
  username: string;
  email: string;
  hashedPassword: string;
}

export interface UserWithPassword extends User {
  hashedPassword: string;
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByUsername(username: string): Promise<UserWithPassword | null>;
  create(input: CreateUserInput): Promise<User>;
}
```

**📝 为什么这样写：**

这是**依赖倒置原则**的体现：

- domain 层定义接口 `UserRepository`，只说明「仓库能干什么」
- 具体实现（SQLite、PostgreSQL、甚至是内存）在 infrastructure 层
- domain 层**不 import 任何第三方库或数据库驱动**

`UserWithPassword` 是带密码哈希的用户类型，只在仓库层使用——登录用例需要验证密码，但验证通过后只返回 `User`（不含密码）。

`CreateUserInput` 的 `hashedPassword` 是已哈希的密码——用例层负责哈希，仓库只负责存。

---

### Step 4 — 创建 src/infrastructure/database.ts（数据库连接）

```typescript
import { DatabaseSync } from 'node:sqlite';

let db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync('login-v2.db');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        hashed_password TEXT NOT NULL
      )
    `);

    console.log('数据库已初始化');
  }
  return db;
}
```

**📝 为什么这样写：**

使用 Node.js 22+ 内置的 `node:sqlite` 模块，**零外部数据库依赖**。

关键设计：
- **单例模式**：所有 repository 共用一个数据库连接，不像 v1 每个文件各自 `new Database()`
- **集中建表**：表结构定义在一个地方，不散落
- 列名 `hashed_password` 使用下划线命名（SQL 惯例），domain 层的字段使用驼峰命名（TypeScript 惯例）——repository 负责这种命名转换

---

### Step 5 — 创建 src/infrastructure/user-repository-sqlite.ts（仓库实现）

```typescript
import { getDatabase } from './database';
import { User } from '../domain/user';
import { CreateUserInput, UserRepository, UserWithPassword } from '../domain/user-repository';

interface UserRow {
  id: number;
  username: string;
  email: string;
  hashed_password: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, username: row.username, email: row.email };
}

function toUserWithPassword(row: UserRow): UserWithPassword {
  return { id: row.id, username: row.username, email: row.email, hashedPassword: row.hashed_password };
}

export class SqliteUserRepository implements UserRepository {
  async findById(id: number): Promise<User | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async findByUsername(username: string): Promise<UserWithPassword | null> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    return row ? toUserWithPassword(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO users (username, email, hashed_password) VALUES (?, ?, ?)',
    ).run(input.username, input.email, input.hashedPassword);

    return { id: Number(result.lastInsertRowid), username: input.username, email: input.email };
  }
}
```

**📝 为什么这样写：**

核心改动：**参数化查询**

```sql
-- v1（SQL 注入）
VALUES ('${username}', '${password}')

-- v2（参数化）
VALUES (?, ?, ?)
```

`?` 占位符由数据库引擎安全处理，无论传什么值都不会被当作 SQL 指令执行。

另外注意：
- `select *` 查询返回的 `hashed_password`（下划线）通过 `toUserWithPassword` 映射为 `hashedPassword`（驼峰）
- `create` 方法返回的是 `User`（不含密码），不是数据库行——密码哈希永远不会泄露出去

---

### Step 6 — 创建 src/application/register-user.ts（注册用例）

```typescript
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { ValidationError, ConflictError } from '../shared/errors';

export interface RegisterUserInput {
  username: string;
  password: string;
  email?: string;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: RegisterUserInput) {
    if (!input.username || input.username.length < 3) {
      throw new ValidationError('用户名至少3个字符');
    }
    if (!input.password || input.password.length < 6) {
      throw new ValidationError('密码至少6个字符');
    }

    const existing = await this.userRepository.findByUsername(input.username);
    if (existing) {
      throw new ConflictError('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await this.userRepository.create({
      username: input.username,
      email: input.email || '',
      hashedPassword,
    });

    return user;
  }
}
```

**📝 为什么这样写：**

`RegisterUserUseCase` 是一个**用例**（Use Case）——它只做一件事：编排注册流程。

**它只关心「做什么」和「按什么顺序做」，不关心「怎么做」：**
- 校验输入（规则在用例层定义）
- 检查重复（调用仓库接口）
- 哈希密码（调用 bcrypt）
- 保存用户（调用仓库接口）

构造函数接收 `UserRepository` 接口，不是具体实现——**这就是依赖注入**。测试时可以传入 mock 仓库，不需要真的数据库。

对比 v1：v1 的注册逻辑直接写在 Express handler 里，和路由、数据库、错误处理全部耦合在一起。

---

### Step 7 — 创建 src/application/login-user.ts（登录用例）

```typescript
import bcrypt from 'bcryptjs';
import { UserRepository } from '../domain/user-repository';
import { UnauthorizedError } from '../shared/errors';

export interface LoginUserInput {
  username: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: LoginUserInput) {
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const isValid = await bcrypt.compare(input.password, user.hashedPassword);
    if (!isValid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const { hashedPassword, ...safeUser } = user;
    return safeUser;
  }
}
```

**📝 为什么这样写：**

关键设计点：

1. **不泄露「用户名是否存在」**：无论用户名不存在还是密码错误，都返回相同的「用户名或密码错误」。对比 v1，v1 的忘记密码接口会泄露邮箱是否注册。

2. **bcrypt.compare 验证密码**：对比 `user.hashedPassword`（库里的哈希）和 `input.password`（用户输入的明文）。bcrypt 会在 compare 内部进行哈希+盐值比较。

3. **返回用户信息前解构掉 hashedPassword**：`const { hashedPassword, ...safeUser } = user`。这个语法从 `user` 对象中取出 `hashedPassword`，剩下的就是 `safeUser`。密码哈希永远不会离开用例层。

---

### Step 8 — 创建 src/presentation/auth-schema.ts（Zod 校验）

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});
```

**📝 为什么这样写：**

对比 v1：v1 的校验逻辑是 `if (!email.includes('@'))` 散落在 handler 里。这里用 Zod schema 集中声明：

- 类型安全——Zod 推导出的 TypeScript 类型可以直接用
- 错误信息统一——所有校验错误由 Zod 生成，格式一致
- 可复用——schema 可以在不同 controller 之间共享

注意校验规则在 presentation 层定义，因为这是 I/O 边界——请求进来时的第一道防线。domain 层的校验（如密码长度）在 use case 里做，两者相互补充而不是重复。

---

### Step 9 — 创建 src/presentation/auth-controller.ts（Express 路由）

```typescript
import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';

import { registerSchema, loginSchema } from './auth-schema';
import { RegisterUserUseCase } from '../application/register-user';
import { LoginUserUseCase } from '../application/login-user';
import { AppError } from '../shared/errors';

export function createAuthController(
  registerUseCase: RegisterUserUseCase,
  loginUseCase: LoginUserUseCase,
): Router {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const input = registerSchema.parse(req.body);
      const user = await registerUseCase.execute(input);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const input = loginSchema.parse(req.body);
      const user = await loginUseCase.execute(input);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      handleError(res, error);
    }
  });

  return router;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    // 校验失败：400
    res.status(400).json({ success: false, message: error.errors[0].message });
    return;
  }

  if (error instanceof AppError) {
    // 业务错误：按 error.statusCode
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // 未知错误：500
  console.error('未处理的错误:', error);
  res.status(500).json({ success: false, message: '服务器内部错误' });
}
```

**📝 为什么这样写：**

Controller 的职责被严格限定在**三件事**：
1. **解析请求**：从 `req.body` 中拿数据，用 Zod schema 校验
2. **调用用例**：委托给 application 层的 use case
3. **统一响应**：成功返回 `200`/`201`，失败返回对应错误码

**`handleError` 统一处理三种错误：**
- `ZodError` → 400（校验失败）
- `AppError` → 对应 `statusCode`（业务错误）
- 其他错误 → 500（服务器内部错误，打印日志）

**依赖注入**：use case 通过参数传入，controller 不自己 `new`。

对比 v1：v1 的 `register` handler 里混了校验、SQL、错误处理、业务逻辑——整整 15 行一个函数搞定。这里 controller 只负责 I/O，业务逻辑在 use case，数据库在 repository。

---

### Step 10 — 创建 src/index.ts（组合根）

```typescript
import express from 'express';

import { getDatabase } from './infrastructure/database';
import { SqliteUserRepository } from './infrastructure/user-repository-sqlite';
import { RegisterUserUseCase } from './application/register-user';
import { LoginUserUseCase } from './application/login-user';
import { createAuthController } from './presentation/auth-controller';

// 1. 基础设施：数据库
getDatabase();
const userRepository = new SqliteUserRepository();

// 2. 业务用例：注入仓库实现
const registerUseCase = new RegisterUserUseCase(userRepository);
const loginUseCase = new LoginUserUseCase(userRepository);

// 3. Express 应用
const app = express();
app.use(express.json());

// 4. 路由：注入 use case
app.use('/auth', createAuthController(registerUseCase, loginUseCase));

// 5. 启动
app.listen(3000, () => {
  console.log('登录服务已启动：http://localhost:3000');
});
```

**📝 为什么这样写：**

这是**组合根（Composition Root）**——整个应用的组装点。

**「依赖沿着一条路径注入」：**
```
index.ts（组合根）
  → new SqliteUserRepository()
  → new RegisterUserUseCase(userRepository)
  → createAuthController(registerUseCase, loginUseCase)
  → app.use('/auth', router)
```

没有任何类在内部 `new` 自己的依赖。每一个组件只通过构造函数接收自己需要的接口。

这样设计带来的好处：
- **可测试**：测试时可以用 mock 仓库替换 SqliteUserRepository
- **可切换**：如果要换成 PostgreSQL，只需要新建一个仓库实现类
- **可见性**：所有依赖关系在组合根一目了然

---

## ✅ 验证

```bash
# 1. 安装依赖（如果还没装）
npm install

# 2. 启动服务
npm start

# 3. 打开另一个终端，测试注册
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456","email":"admin@example.com"}'
# 预期：{"success":true,"data":{"id":1,"username":"admin","email":"admin@example.com"}}

# 4. 测试登录
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}'
# 预期：{"success":true,"data":{"id":1,"username":"admin","email":"admin@example.com"}}

# 5. 测试密码错误
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"wrong"}'
# 预期：{"success":false,"message":"用户名或密码错误"}

# 6. 测试用户名重复
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"654321"}'
# 预期：{"success":false,"message":"用户名已存在"}
```

如果所有测试都通过，恭喜——你手打了一套完整的 4 层清洁架构！

---

## 💡 今天学到了什么

### 三个核心原则

1. **依赖倒置**：高层模块（domain）定义接口，低层模块（infrastructure）实现接口。两者都依赖抽象。

2. **单向依赖**：presentation → application → domain ← infrastructure。箭头不能反向。

3. **关注点分离**：
   - domain：只定义实体和接口
   - application：只编排业务逻辑
   - infrastructure：只实现技术细节
   - presentation：只处理 I/O

### 和 v1 的对比

| 对比项 | v1（屎山） | v2（清洁架构） |
|--------|-----------|--------------|
| 文件数 | 2 个 | 10 个 |
| main.js | 52 行手写所有逻辑 | index.ts 只负责组装 |
| 密码 | 明文存储 | bcrypt 哈希 |
| SQL 安全 | 字符串拼接 | 参数化查询 |
| 错误处理 | 无 | 统一错误类型 + 状态码 |
| 校验 | 无 | Zod schema |
| 依赖关系 | 无（一脸糊） | 清晰单向依赖 |
| 可测试性 | 不可测 | 每层可独立测试 |

### 延伸思考

- 如果要把 SQLite 换成 PostgreSQL，需要改哪几个文件？哪些文件不需要改？
- 如果要加一个「管理员才能注册」的规则，应该加在哪一层？
- 为什么 `Password` 字段在 domain 层的 `User` 接口中不存在？
- 如果有一天 `bcrypt` 被发现有漏洞需要换成 `argon2`，需要改几个文件？

---

## 📁 参考 solution

如果你卡住了，可以查看 `solution/day01/` 目录下的完整代码。

```
login-v2/solution/day01/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── shared/errors.ts
    ├── domain/user.ts
    ├── domain/user-repository.ts
    ├── application/register-user.ts
    ├── application/login-user.ts
    ├── infrastructure/database.ts
    ├── infrastructure/user-repository-sqlite.ts
    ├── presentation/auth-schema.ts
    └── presentation/auth-controller.ts
```

建议：**先手打，卡住再看答案。** 手打一遍的收获比读十遍架构书都大。
