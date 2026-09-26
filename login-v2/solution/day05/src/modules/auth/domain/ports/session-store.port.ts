/**
 * @file 会话存储端口
 * @author 教程组
 *
 * 不透明 token + 服务端会话表（教程简化：不做 JWT —— 会话可随时吊销，
 * 且「token 里该放什么」这类决策不占用本教程课时）。
 */
import type { StoredSession } from '../schemas/index'

export interface SessionStorePort {
  save(token: string, userId: string, expiresAt: number): Promise<void>
  find(token: string): Promise<StoredSession | null>
  remove(token: string): Promise<void>
}
