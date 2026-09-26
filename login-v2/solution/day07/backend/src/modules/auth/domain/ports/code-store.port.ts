/**
 * @file 验证码存储端口
 * @author 教程组
 *
 * 按「用途 + 目标」两个维度存：注册码与重置码共用一套存储但互不干扰
 * （不做用途隔离的话，攻击者用注册接口的码就能去重置别人的密码）。
 *
 * 存储本身是「哑」的：只存、取、删；「什么算有效」的规则在
 * domain/services/code-verification.service.ts —— 判据不落在基础设施里。
 */
import type { StoredCode } from '../schemas/index'

export interface CodeStorePort {
  save(purpose: string, target: string, code: string, expiresAt: number): Promise<void>
  find(purpose: string, target: string): Promise<StoredCode | null>
  remove(purpose: string, target: string): Promise<void>
}
