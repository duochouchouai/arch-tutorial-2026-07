/**
 * @file id 生成端口
 * @author 教程组
 *
 * 实体 id 由应用层生成（而非数据库自增）：这样「创建」是纯内存动作，
 * 实体在落库前就拥有身份，测试里用假实现即可产出可断言的 id。
 *
 * 实现必须是密码学随机（CryptoIdGenerator）：
 * 旧教程的 Math.random() 会话 token 可以被猜中的教训，见 GUIDE-day06「违规 → 症状」。
 */
export interface IdGenerator {
  /** 生成全局唯一 id（不可猜测、不可枚举） */
  generate(): string
}
