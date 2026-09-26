/**
 * @file 登录用例（前端侧）— 校验 → 调 api → 存 token → 处理 ApiError
 * @author 教程组
 */
import { ref } from 'vue'
import { ApiError } from '../domain/errors'
import { LoginInputSchema } from '../domain/schemas'
import { authApi } from '../infrastructure/auth-api'
import { sessionStorage } from '../infrastructure/session-storage'

export function useLogin() {
  const loading = ref(false)
  const error = ref('')
  const fieldErrors = ref<Record<string, string>>({})

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    fieldErrors.value = {}

    const parsed = LoginInputSchema.safeParse({ username, password })
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? '输入不合法'
      loading.value = false
      return false
    }

    try {
      const result = await authApi.login(parsed.data)
      sessionStorage.save(result.token)
      return true
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message
        // 423 = 锁定中：message 由后端给（含解锁提示），页面原样展示
      } else {
        error.value = '网络异常，请稍后重试'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fieldErrors, login }
}
