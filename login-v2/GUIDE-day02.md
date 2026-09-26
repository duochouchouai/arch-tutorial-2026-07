# GUIDE-day02 — 值对象与共享错误体系

预计时间：**120 分钟**（概念 25 + 手打 70 + 验收 25）

> 手打完再对照 `solution/day02/`。

---

## 📖 概念

### 1. 「一段字符串」和「一个邮箱」不是同一种东西

v1 的注册校验长这样（`presentation/auth-schema.ts` 里的 zod schema + `auth-controller.ts` 里的 if/else）：

```ts
// v1：形状、格式、强度全糊在一起；错误用手拼字符串
if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
  errors.push('邮箱格式不正确')
}
```

三个后果：邮箱这个「概念」在系统里不存在，只有裸 `string`；
`Email` 的规则（小写、长度、只有一个 @）散落多处；
一旦 `Email` 在某个角落被赋成 `'  '`，没有任何机制拦住它。

**值对象（Value Object）**把「一个合法的邮箱」变成类型系统里的一等公民：

```ts
const email = Email.create('Alice@Example.com')   // 不合法就抛 ValidationError
email.value                                        // 'alice@example.com'（归一化后）
```

同一天引入的还有 `Phone`（`/^1[3-9]\d{9}$/`）、`Password`（8-64 位、含字母和数字）、`Code`（6 位数字）。

### 2. 值对象的两条硬纪律

```ts
export class Email {
  readonly value: string
  private constructor(value: string) { this.value = value; Object.freeze(this) }
  static create(raw: string): Email { /* 校验 → ValidationError 或 fromTrusted */ }
  static fromTrusted(value: string): Email { return new Email(value) }  // 数据源可信时用
  toString(): string { return this.value }
}
```

- `private constructor`：**不给**「绕过校验构造一个邮箱」的机会；
- `Object.freeze(this)`：已构造的值不可变（值对象的定义）；
- `fromTrusted` 的命名即文档：只在「数据源可信」时用（DB 行、已校验的输入）。

### 3. 错误是领域概念，不是 HTTP 概念

```ts
export class AppError extends Error {
  readonly code: string          // 稳定错误码：前端按码分支，不按文案
  readonly statusCode: number    // 建议状态码（由表现层采纳，不是强制）
  readonly fieldErrors?: FieldErrors   // 字段级错误：{ email: ['邮箱格式不正确'] }
}
```

- 家族：`ValidationError`(400) / `UnauthorizedError`(401) / `ConflictError`(409) / `NotFoundError`(404)；
- **预期外错误不要包装**：程序 bug 就让 `errorHandler` 兜成 500 —— 把未知错误包装成 `AppError`，等于把「程序有 bug」伪装成「用户输入不对」；
- `errorHandler` 是**唯一**把错误翻译成 HTTP 的地方（写在 `shared/infrastructure/error-handler.ts`）。

### 4. 响应信封：前后端的共同契约

```ts
成功：{ success: true,  data: ... }
失败：{ success: false, message: '...', fieldErrors?: { field: ['...'] } }
```
`fail()` 永远带上 `fieldErrors` 键（值为 `undefined`），JSON 序列化时自动消失 —— 前端只需认一种形状。

---

## ✍️ 手打目标

### 1. `src/modules/shared/domain/errors/`

- `app-error.ts`：`FieldErrors` 类型、`AppErrorOptions`、`AppError`（注意 `this.name = new.target.name`）；
- `validation-error.ts`：`constructor(fieldErrors: FieldErrors, message = '输入校验未通过')`；
- `conflict-error.ts` / `not-found-error.ts` / `unauthorized-error.ts`：各自默认文案与状态码；
- `index.ts`：barrel。

### 2. `src/modules/shared/schemas/envelope.ts`

`EnvelopeSchema`（zod union）+ `ok<T>(data)` + `fail(message, fieldErrors?)`。

### 3. `src/modules/shared/infrastructure/error-handler.ts`

```ts
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.message, err.fieldErrors))
    return
  }
  console.error('[unexpected error]', err)      // 全量现场进日志
  res.status(500).json(fail('服务器内部错误'))   // 响应只给一句话
}
```
（`_next` 不能省略：Express 靠参数个数识别错误中间件。）

### 4. `src/modules/auth/domain/value-objects/`（四个值对象）

| 值对象 | 规则 |
|--------|------|
| `Email` | 至少一个小写 `@` 恰好一个、域名含点、≤254、无空白；**不静默 trim/小写**，非法就抛 |
| `Phone` | `/^1[3-9]\d{9}$/` |
| `Password` | 8-64 位、至少一个字母 + 一个数字（`create` 带可选参数 `{ minLength, maxLength, requireComplexity }`，Login 用宽松档，Day 04 你会用到） |
| `Code` | `/^\d{6}$/` |

每个值对象配一个 `xxx.test.ts`（边界：空串、超长、非法字符、合法值归一化）。

### 5. 共享测试

- `src/modules/shared/infrastructure/error-handler.test.ts`：AppError → 400 + fieldErrors；`ConflictError` → 409；未知错误 → 500 且**不含**内部信息（如 SQL 片段）。

### 6. `src/main.ts` 挂上 `errorHandler`

```ts
app.use('/auth', auth.createRouter())
app.use(errorHandler)     // 必须在所有路由之后
```

---

## ✅ 验收点

```bash
cd solution/day02 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **9 个文件 / 37 个测试**全过 |
| `Email.create('abc')` | 抛 `ValidationError`，`fieldErrors` 指向 `email` |
| `errorHandler` 测试 | 未知错误的响应体**不含** `SQLITE` / 堆栈 |
| 纪律自查 | `grep -rn "statusCode = 400" src/modules/auth` 应无结果（状态码只在 shared 错误类里声明） |

---

## 🚨 违规 → 症状

| 违规 | 症状 |
|------|------|
| 用 `type Email = string` 代替值对象 | 每个入口都要重新校验邮箱；`'  '` 也能一路进 DB |
| 值对象 `public constructor` | 有人 `new Email('乱写')` 绕过校验，规则形同虚设 |
| 在 controller 里 `res.status(400).json(...)` 手写错误 | 错误响应形状开始漂移（有人带 `fieldErrors`、有人不带）；前端只能靠猜 |
| 把未知错误包装成 `AppError('服务器错误', 500)` | 真 bug 被伪装成「业务错误」，日志里看不到堆栈，排查靠猜 |
| 错误文案当契约（前端 `if (message === '密码错误')`） | 改一句文案就崩前端；正确姿势是认 `code` / `statusCode` |

---

## 🔭 与真实仓库（NKDate）的对应

- 真实仓库的 `domain/value-objects/` 同构：`private constructor` + `Object.freeze` + `create` / `fromTrusted` 三件套；
- 错误基类同样是 `code + statusCode + fieldErrors`，但**每模块的错误类放自己模块**（如 `auth/domain/errors/auth.errors.ts`，Day 05 出现）；
- `errorHandler` 在真实仓库里还接 Sentry 之类的上报 —— 但「响应不泄露内部信息」这条永远不变。
