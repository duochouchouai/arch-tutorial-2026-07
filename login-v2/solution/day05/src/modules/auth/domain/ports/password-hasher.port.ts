/**
 * @file 密码哈希端口
 * @author 教程组
 *
 * 领域只认识「能把明文变哈希、能核验」这个能力；
 * 用 bcrypt 还是 argon2、几轮迭代，是基础设施的实现细节。
 * 换算法 = 换 infrastructure 一个文件，用例与实体一行不动。
 */
export interface PasswordHasherPort {
  hash(plain: string): Promise<string>
  verify(plain: string, hash: string): Promise<boolean>
}
