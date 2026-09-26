/**
 * @file 会话 token 的本地存储 — uni 存储 API 的第二处（也是最后一处）落点
 * @author 教程组
 *
 * 存储策略（真实项目要权衡，教程给最保守的一条）：
 * - token 存本地，页面重进时用 /auth/session 验证一次（有撤销即失效）；
 * - 不存用户资料：用户形状可能变，缓存 = 第二份真理源。
 */
const TOKEN_KEY = 'auth_token'

export const sessionStorage = {
  save(token: string): void {
    uni.setStorageSync(TOKEN_KEY, token)
  },

  load(): string {
    return uni.getStorageSync(TOKEN_KEY)
  },

  clear(): void {
    uni.removeStorageSync(TOKEN_KEY)
  },
}
