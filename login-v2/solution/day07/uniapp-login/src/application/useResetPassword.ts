/**
 * @file 重置密码用例（前端侧）
 * @author 教程组
 */
import { ref } from 'vue'
import { ApiError } from '../domain/errors'
import { ResetPasswordInputSchema } from '../domain/schemas'
import { authApi } from '../infrastructure/auth-api'

export function useResetPassword() {
  const loading = ref(false)
  const error = ref('')
  const done = ref(false)

  async function resetPassword(email: string, code: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = ''

    const parsed = ResetPasswordInputSchema.safeParse({ email, code, password })
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? '输入不合法'
      loading.value = false
      return false
    }

    try {
      await authApi.resetPassword(parsed.data)
      done.value = true
      return true
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '网络异常，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, error, done, resetPassword }
}
