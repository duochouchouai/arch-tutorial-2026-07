# Day 01 延伸思考

## 1. 如果要把 SQLite 换成 PostgreSQL，需要改哪几个文件？哪些文件不需要改？

**需要改（infrastructure 层，2 个文件）：**
- `database.ts` — 换成 PostgreSQL 连接（`pg` 包）
- `user-repository-sqlite.ts` — SQL 语法微调（`$1` 替代 `?`），文件改名 `user-repository-pg.ts`

**不需要改：**
- `domain/user.ts`、`domain/user-repository.ts` — 接口不变
- `application/register-user.ts`、`login-user.ts` — use case 只依赖 `UserRepository` 接口，不关心底层数据库
- `presentation/` — 完全不感知数据库变更

> **核心价值：依赖倒置。换数据库只碰 infrastructure，业务逻辑纹丝不动。**

---

## 2. 如果要加一个「管理员才能注册」的规则，应该加在哪一层？

加在 **application 层**的 `register-user.ts`。

这不是 I/O 校验（presentation），也不是数据存储规则（infrastructure），而是**业务规则**——"谁能注册"是 use case 的职责。

---

## 3. 为什么 `Password` 字段在 domain 层的 `User` 接口中不存在？

`User` 是**对外暴露的安全视图**。一旦 `hashedPassword` 出现在 domain 实体上，任何拿到 `User` 对象的代码都有可能泄露它。

`login-user.ts` 中：

```typescript
const { hashedPassword, ...safeUser } = user;
return safeUser;
```

密码哈希在 use case 层就被解构掉，**永远不会离开 application 层**。domain 层从类型层面就杜绝了密码泄露的可能。

---

## 4. 如果 bcrypt 被发现有漏洞需要换成 argon2，需要改几个文件？

**只改 2 个文件（application 层）：**

- `register-user.ts` — `bcrypt.hash` → `argon2.hash`
- `login-user.ts` — `bcrypt.compare` → `argon2.verify`

domain、infrastructure、presentation 完全不受影响。

> **核心价值：加密细节封装在 use case 内部，变化隔离在最小范围。**

---

## 总结

四个问题都在验证同一个核心原则：

> **关注点分离** — 每层只做自己的事，变化被隔离在最小范围内。
