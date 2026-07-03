# Day 02 延伸思考

## 1. forgot-password 返回的 message 写死了，不区分邮箱是否存在。如果产品经理要求「已注册的邮箱返回已发送，未注册的提示先去注册」，改哪一层？

改 **application 层**的 `forgot-password.ts`。

当前逻辑是找不到用户直接跳过、永远返回成功：

```typescript
if (user) { /* 生成 token */ }
// 找不到用户就什么都不做
```

改成产品经理的要求，只需要在 `else` 分支抛一个 `NotFoundError`：

```typescript
if (user) { /* 生成 token */ }
else { throw new NotFoundError('该邮箱未注册，请先去注册'); }
```

**需要改的地方：**
- `forgot-password.ts` — 加 else 分支抛错
- `errors.ts` — 确认有 `NotFoundError`（已经有了）

controller 层不需要动，`handleError` 会自动把 `NotFoundError` 转成 404。

---

## 2. 如果要把 token 过期时间从 1 小时改成 30 分钟，改哪个文件？

只改 **`forgot-password.ts`** 第 12 行：

```typescript
// 1 小时
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

// 30 分钟
const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
```

**只改 1 个文件，1 个数字。** domain、infrastructure、presentation 全部不受影响。

这就是把"令牌多久过期"这种业务规则放在 use case 层的好处——清晰、好找、好改。

---

## 3. 如果要把 console.log 模拟发邮件换成真实的邮件服务，改哪一层？

改 **application 层**的 `forgot-password.ts`。

虽然发邮件涉及 I/O，但这个 I/O 是"发邮件"这个**业务行为的一部分**。正确做法：

- 在 `infrastructure/` 下新建 `email-service.ts`（实现发邮件）
- 在 `domain/` 下定义 `EmailService` 接口（依赖倒置）
- 在 `forgot-password.ts` 里通过构造函数注入 `EmailService`
- 用 `this.emailService.send(email, resetLink)` 替换 `console.log`

这样 presentation 和 controller 完全不知道发邮件的存在。

---

## 4. 对比 v1 day03 的 Math.random() 和这里的 crypto.randomBytes(32)——谁会在意这点区别？v1 的开发者知道 Math.random() 不安全吗？

**攻击者在意。**

`Math.random()` 是伪随机数生成器，种子可预测。在一个活跃的网站上：

1. 攻击者注册一个账号，触发忘记密码，拿到自己的 token
2. 分析几次 token 的规律，推算出 Math.random 的种子
3. 预测下一个 token，接管任意用户

`crypto.randomBytes(32)` 是密码学安全随机，32 字节 = 256 位，暴力破解需要的时间比宇宙年龄还长。

**v1 的开发者知不知道？**

大概率是两种心态之一：
- "反正是内部项目，没人攻击"——低估了安全风险
- "能跑就行，出了问题再说"——典型的 vibe coding 思维

但攻击者不关心你的项目大不大——脚本一跑，全部自动扫描。`Math.random()` 生成的 token 在自动化攻击面前就是裸奔。

> **安全不是"有没有人攻击你"的问题，而是"你的防御有多深"的问题。**
