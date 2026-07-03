# Day 03 延伸思考

## 1. v1 的 token 永不过期，v2 的 token 30 天自动过期。架构层面怎么保证 token 一定会被清理？

v2 用了 **SQL 层面的过期判断**，不需要任何定时任务：

```sql
SELECT user_id FROM remember_tokens WHERE token = ? AND expires_at > ?
```

每次自动登录时，如果 `expires_at` 小于当前时间，SQL 直接查不到，效果等同于"token 已失效"。不需要像 v1 那样手动清理。

但这样会留下僵尸数据（过期的 token 还在表里）。正式的清理策略可以加一个定时任务定期 `DELETE FROM remember_tokens WHERE expires_at < datetime('now')`，但**清理是优化，不是安全机制**——安全的保证靠的是查询时的过期判断。

> **核心原则：过期判断放在查询时，而不是依赖清理。** 即使清理漏了，安全性也不受影响。

---

## 2. login-user 返回结构从 `User` 变成了 `{ user, token? }`，这影响了哪些层？

| 层 | 是否改动 | 原因 |
|----|----------|------|
| **domain** | 不变 | `User` 实体不需要知道有没有 token |
| **application** (login-user.ts) | 改 | 新增 `LoginResult` 返回类型 |
| **application** (register-user.ts 等) | 不变 | 其他用例不受影响 |
| **presentation** (controller) | 微调 | 返回 `result` 而不是直接 `user` |
| **infrastructure** | 不变 | 数据库不关心返回值结构 |

变化被隔离在 `login-user.ts` 的返回类型和 controller 的响应格式上——这就是**每个用例独立输出**的好处。

---

## 3. 如果要把记住我 token 的有效期从 30 天改成 7 天，改哪个文件？

只改 **`login-user.ts`** 第 37 行，一个数字：

```typescript
// 30 天
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString();

// 7 天
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 1000).toISOString();
```

和 day02 的 reset token 一样——**业务策略集中在 use case 里，改一个数字即全局生效。**

---

## 4. `crypto.randomBytes(48)` vs `crypto.randomBytes(32)` — 为什么 remember me 用 48 字节，重置密码只用 32 字节？

| | 重置密码 token | 记住我 token |
|----|--------------|------------|
| 字节数 | 32 | 48 |
| 有效期 | 1 小时 | 30 天 |
| 使用场景 | 一次性链接 | 持久化持有 |

记住我 token **存活时间更长**，攻击窗口更大，所以用更长的随机字节（48 字节 = 384 位）。虽然 32 字节（256 位）已经远超出暴力破解的范畴，但 48 字节提供了额外的纵深防御——**成本几乎为零（只是多 16 字节的随机数），为什么不加？**

> **安全不需要"刚刚好"，多一点防御总比少一点好。**

---

## 5. auto-login 查了两次数据库（findUserIdByRememberToken + findById），能不能合并成一次 JOIN 查询？

技术上完全可以：

```sql
SELECT u.id, u.username, u.email 
FROM remember_tokens rt 
JOIN users u ON u.id = rt.user_id 
WHERE rt.token = ? AND rt.expires_at > ?
```

但教程选择拆成两次查询，原因是**保持 repository 接口的纯粹性**：

- `findUserIdByRememberToken` 只和 `remember_tokens` 表打交道
- `findById` 只和 `users` 表打交道

如果合并成一个 `findUserByRememberToken`，就会让 repository 接口暴露了"记住我功能需要跨表查询"这个实现细节。use case 不需要知道这些——它只需要说"给我用户 ID"然后"给我用户信息"。

> **接口应该表达业务意图，而不是 SQL 优化。** JOIN 查询是性能优化，等有性能瓶颈时再在 infrastructure 层内部优化，不影响接口定义。

---

## 总结

Day 03 的核心学习点：

1. **安全性靠查询而非清理** — 过期判断在每次查询时执行
2. **用例输出独立** — login-user 返回结构变了，其他用例不受影响
3. **业务策略在 use case** — 过期时间、token 长度改一行就行
4. **接口表达意图而非实现** — 两次查询没问题，别过早优化
