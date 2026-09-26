/**
 * @file 验证码生成端口
 * @author 教程组
 *
 * 随机源属于基础设施（必须密码学随机）；「6 位数字」的约束由 Code 值对象持有。
 * 旧教程用 Math.random() 生成重置码 → 可预测 → 账号被爆破，见 GUIDE-day02。
 */
import type { Code } from '../value-objects/index'

export interface CodeGeneratorPort {
  generate(): Code
}
