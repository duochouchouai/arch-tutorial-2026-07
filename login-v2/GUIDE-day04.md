# GUIDE-day04 — Schema 单一真理源与「定义 / 校验」分离

预计时间：**110 分钟**（概念 25 + 手打 60 + 验收 25）

> 手打完再对照 `solution/day04/`。

---

## 📖 概念

### 1. 同一个形状，v1 写了三遍

| 位置 | v1 的写法 |
|------|-----------|
| 路由校验 | `auth-schema.ts` 里的 zod schema（带 `.min()`、`.email()` 等规则） |
| 用例入参 | `login-user.ts` 里的 `interface LoginInput` 手写类型 |
| 表现层 | controller 里再 `if (!username) ...` 补一遍 |

三处一旦不一致，类型系统不会报错 —— 只有线上用户会。

### 2. 定义与校验分离

**定义（形状）**：有哪些字段、什么类型、可空与否 → `domain/schemas/api/*.ts`，只描述形状：
```ts
export const RegisterSchema = z.object({
  username: z.string(), password: z.string(), email: z.string(),
  phone: z.string().optional(), code: z.string(),
})
export type Register = z.infer<typeof RegisterSchema>
```
注意：**`z.string()` 就是 `z.string()`** —— `.min(3)`、`.email()`、正则统统**不写在这里**。

**校验（规则）**：格式、强度、去重、可达性 → `domain/validators/*.validator.ts`：
```ts
export class RegisterValidator {
  validate(input: unknown): ValidatedRegister {
    const data = parseOrThrow(RegisterSchema, input)      // ① 形状
    const username = data.username.trim()
    if (!USERNAME_PATTERN.test(username)) {               // ② 业务规则
      throw new ValidationError({ username: ['用户名需为 3-20 位字母、数字或下划线'] })
    }
    return {                                              // ③ 值对象（Day 02 的复用）
      username, password: Password.create(data.password),
      email: Email.create(data.email),
      phone: data.phone === undefined ? undefined : Phone.create(data.phone),
      code: Code.create(data.code),
    }
  }
}
```

为什么值得分两层？
- **形状是跨端契约**（前端要镜像它），业务规则是服务端判据（前端只是提前提示）；
- 形状几乎不变，规则经常变 —— 让规则改动只落在 validator 一个文件；
- 「输入校验」与「业务规则」对错误码的要求不同：形状错误 → `_` 字段、规则错误 → 具体字段。

### 3. 校验输出也要是 Schema

`ValidatedRegister` 不写 interface，写成 `schemas/validator/validated-register.ts`：

```ts
export const ValidatedRegisterSchema = z.object({
  username: z.string(),
  password: z.custom<Password>(),      // 值对象用 z.custom<T>() 标注
  email: z.custom<Email>(),
  phone: z.custom<Phone>().optional(),
  code: z.custom<Code>(),
})
export type ValidatedRegister = z.infer<typeof ValidatedRegisterSchema>
```

**收益**：校验器返回的是「已归一化的值对象」，用例拿到的参数不可能再是裸字符串 ——
「校验过了吗」这个问题在类型层面消失了。

### 4. `parseOrThrow`：Zod 错误 → `ValidationError` 的唯一转换点

```ts
// schemas 的 issues 聚合成字段级错误：{ email: ['邮箱格式不正确'], ... }
throw new ValidationError(fieldErrors as FieldErrors)
```
从今天起，**任何**入口校验都从这里走；手写 if/else 收集错误字符串是 v1 的屎山形态。

---

## ✍️ 手打目标

### 1. `domain/schemas/api/`（形状，不带规则）

- `send-code.ts`：`SendCodeSchema { email: z.string() }` + `SendCodeResultSchema { email }`；
- `register.ts`：`RegisterSchema`（username/password/email/phone?/code）+ `RegisterResultSchema { user: PublicUserSchema }`；
- `login.ts`：`LoginSchema { username, password }` + `LoginResultSchema { token, user: PublicUserSchema }`；
- `index.ts` 汇总。

### 2. `domain/schemas/validator/`

`ValidatedSendCode` / `ValidatedRegister` / `ValidatedLogin` 三份 Schema + type。

### 3. `domain/validators/`

- `schema-parser.ts`：`parseOrThrow<T>(schema, input)`；
- `send-code.validator.ts`：只有 `Email.create`；
- `register.validator.ts`：`USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/` + 四个值对象；
- `login.validator.ts`：**故意宽松** —— 只校验非空，不校验强度。

> 想清楚「login 为什么不校验密码强度」再写：登录密码是**核对**不是**设定**。
> 若登录也要求「含字母数字」，老用户（早年注册的弱密码）将被永久拒之门外，且能从错误信息探测出密码规则。

### 4. 校验器测试（各一个文件）

断言：非法输入 → `ValidationError` 且 `fieldErrors` 键是**字段名**；合法输入 → 返回值是**值对象**（`instanceof Email`）且已归一化（`'  Alice@x.com  '` → 抛或规范化，行为要明确）。

---

## ✅ 验收点

```bash
cd solution/day04 && npm install && npm run gate
```

| 检查 | 期望 |
|------|------|
| `npm test` | **13 个文件 / 54 个测试**全过 |
| 形状 pure 自查 | `grep -n "min(\|max(\|email()\|regex" src/modules/auth/domain/schemas/api/` 无结果 |
| 类型自查 | 全项目 `grep -rn "interface .*Input" src/modules/auth` 无手写入参 interface |
| login 宽松 | `login.validator.test.ts` 里有「弱密码也能通过登录校验」的用例 |

---

## 🚨 违规 → 症状

| 违规 | 症状 |
|------|------|
| 规则写回 `api/*.ts`（`z.string().min(3)`） | 前端镜像的 Schema 与后端开始漂移；「前端说合法、后端说非法」的争论无解 |
| 用例入参手写 interface | 加字段只改一处，`tsc` 不报错，运行时 `${undefined}` 写进日志 |
| 每个入口自己写 if/else 收集错误 | 错误形状第三次分叉（有的 `fieldErrors` 是数组、有的是对象、有的是字符串） |
| 校验器直接抛 `new Error('参数错误')` | 前端拿不到字段级错误；`errorHandler` 兜成 500（本该 400） |
| 校验器里查数据库（如「用户名是否已存在」） | 「校验」和「业务」混层：校验器变得不可单测、调用顺序敏感；重复检查应属于用例的编排（Day 05） |

---

## 🔭 与真实仓库（NKDate）的对应

- 真实仓库的 `domain/schemas/` 就是 SSOT：`api/` 放形状、`validator/` 放校验输出、`deps/` 放用例依赖契约（Day 05 出场）；
- 「定义与校验分离」在真实仓库的收益是灰度发布：形状先行（先加后发），规则可回滚；
- 校验器的返回值永远是「值对象化」的：这是 v1 → v2 最直观的进步之一。
