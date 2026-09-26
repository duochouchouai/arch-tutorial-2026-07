/**
 * @file uni 全局 API 的最小类型声明（教程简化版）
 * @author 教程组
 *
 * 真实项目用官方类型包（@dcloudio/types 等）覆盖几百个 API；
 * 教程只声明用到的这几个，好处是：`npm install && npm run gate` 零额外依赖，
 * 且能看到「页面/用例依赖的 uni 能力」到底是哪几个（契约显式化）。
 *
 * 注意：只有 infrastructure 层允许直接触碰 uni（见 GUIDE-day07 前端部分）。
 */
export {}

declare global {
  interface UniRequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    header?: Record<string, string>
    data?: unknown
  }

  interface UniResponse {
    statusCode: number
    data: unknown
  }

  const uni: {
    request(options: UniRequestOptions): Promise<UniResponse>
    getStorageSync(key: string): string
    setStorageSync(key: string, value: string): void
    removeStorageSync(key: string): void
    navigateTo(options: { url: string }): void
    redirectTo(options: { url: string }): void
  }
}
