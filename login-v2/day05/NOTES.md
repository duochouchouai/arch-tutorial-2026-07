# Day 05 延伸思考

## 1. 如果要加「GitHub 登录」，需要改几个文件？改多少行代码？

**改 2 个文件，总共加 2 行代码：**

### `oauth-login.ts`（application 层）— PROVIDERS 数组加一个值
```typescript
const PROVIDERS = ['wechat', 'qq', 'github'] as const;  // +1 行
```

### `auth-schema.ts`（presentation 层）— Zod enum 加一个值
```typescript
provider: z.enum(['wechat', 'qq', 'github'], { ... }),  // +1 行
```

**不需要改的：** `database.ts`（`oauth_provider` 是 TEXT 列，存什么值都行）、`user-repository` 接口、`SqliteUserRepository` 实现、`auth-controller`、`index.ts` —— 全部零改动。

> **对比 v1 加第三方登录：复制粘贴整个接口，30+ 行重复代码。v2 只改 2 行。**

---

## 2. 如果每个 provider 的 openid 生成逻辑不一样（微信用 unionid、QQ 用 openid），应该在哪里处理这种差异？

在 **application 层**的 `oauth-login.ts` 里，抽取一个 provider → openid 的映射：

```typescript
function resolveOpenId(provider: string, code: string): string {
  switch (provider) {
    case 'wechat': return fetchWechatUnionId(code);   // 调微信 API
    case 'qq':     return `qq_openid_${code}`;        // 本地生成
    case 'github': return fetchGithubUserId(code);    // 调 GitHub API
    default: throw new ValidationError('不支持的 provider');
  }
}
```

**为什么在 use case 而不是 infrastructure？**

因为"哪个 provider 用哪种方式获取 openid"是**业务规则**，不是数据库操作。infrastructure 层只负责"存/查 OAuth 用户"，不知道也不该知道微信和 QQ 的区别。

如果每种 provider 的实现很复杂，可以进一步抽象：在 domain 定义 `OAuthProvider` 接口，infrastructure 实现 `WechatProvider`、`QQProvider`，use case 通过依赖注入获取。

---

## 3. 为什么 findByOAuth 返回 User 而 findByUsername 返回 UserWithPassword？

| 方法 | 返回类型 | 原因 |
|------|----------|------|
| `findByUsername` | `UserWithPassword` | 登录需要验证密码，必须拿到 `hashedPassword` |
| `findByOAuth` | `User` | OAuth 不涉及密码，不需要 `hashedPassword` |

`findByOAuth` 如果返回 `UserWithPassword`，OAuth 用户（没有密码）的 `hashedPassword` 字段会是空字符串——暴露这个信息没有意义，甚至可能造成误导。

> **接口返回什么，取决于调用方需要什么。不要为了"统一"把不相干的字段塞进去。**

---

## 4. OAuth 用户没有密码——如果以后想支持「OAuth 用户设置密码」，需要改哪些文件？

这是从"纯 OAuth 用户"变为"OAuth 用户 + 密码"的升级：

### `domain/user-repository.ts` — 接口已有 `updatePassword`，不需要改

### `application/` — 新增 `set-password.ts`
```typescript
export class SetPasswordUseCase {
  async execute(userId: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }
}
```

### `presentation/auth-controller.ts` — 新增 `POST /auth/set-password` 路由

### 不需要改的
- `database.ts` — `hashed_password` 列已存在，OAuth 用户存空字符串，设置密码后写入即可
- `oauth-login.ts` — 不受影响
- `login-user.ts` — 不受影响，登录时 `bcrypt.compare` 对空字符串密码自然会失败

---

## 总结

Day 05 的核心学习点：

1. **参数化代替复制粘贴** — 一份代码处理所有 provider
2. **业务差异在 use case** — openid 生成逻辑是业务规则，不是基础设施
3. **接口按需返回** — `findByOAuth` 不返回密码，因为调用方不需要
4. **扩展不改旧代码** — 加 GitHub 登录只改 provider 列表，不影响已有逻辑
