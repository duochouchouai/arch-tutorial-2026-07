/**
 * @file 会话用例（前端侧）— 进首页时验证 token；退出即吊销
 * @author 教程组
 */
import { ref } from 'vue'
import { ApiError } from '../domain/errors'
import { authApi } from '../infrastructure/auth-api'
import { sessionStorage } from '../infrastructure/session-storage'

export function useSession() {
  const checking = ref(true)
  const userId = ref<string | null>(null)

  /** 页面 onShow 调用：有 token 才验证，验证失败即清掉（过期/被吊销） */
  async function check(): Promise<string | null> {
    checking.value = true
    const token = sessionStorage.load()
    if (token === '') {
      checking.value = false
      return null
    }
    try {
      const result = await authApi.session(token)
      userId.value = result.userId
      return result.userId
    } catch (e) {
      // 401 = token 已失效：清掉本地缓存，回登录页
      if (e instanceof ApiError && e.statusCode === 401) {
        sessionStorage.clear()
      }
      return null
    } finally {
      checking.value = false
    }
  }

  /** 退出：先请后端吊销（失败也要清本地 —— 本地状态不能被网络绑架） */
  async function logout(): Promise<void> {
    const token = sessionStorage.load()
    try {
      if (token !== '') {
        await authApi.logout(token)
      }
    } catch {
      // 忽略：本地清理是底线
    } finally {
      sessionStorage.clear()
      userId.value = null
    }
  }

  return { checking, userId, check, logout }
}
