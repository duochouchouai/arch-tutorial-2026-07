/**
 * @file 登录校验输出 Schema
 * @author 教程组
 *
 * 刻意**不**把密码转成 Password 值对象：Password.create 会跑复杂度规则，
 * 而登录只应校验「非空」。若登录也跑复杂度，规则一改（比如提高最小长度），
 * 所有老用户会当场登不进来 —— 规则只约束「设置密码」，不约束「使用密码」。
 */
import { z } from 'zod'

export const ValidatedLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
})
export type ValidatedLogin = z.infer<typeof ValidatedLoginSchema>
