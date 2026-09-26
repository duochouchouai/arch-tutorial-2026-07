/**
 * @file 忘记密码用例（前端侧）— 发重置码，成功后带邮箱去重置页
 * @author 教程组
 */
import { ref } from 'vue'
import { ApiError } from '../domain/errors'
import { ForgotPasswordInputSchema } from '../domain/schemas'
import { authApi } from '../infrastructure/auth-api'

export function useForgotPassword() {
  const loading = ref(false)
  const error = ref('')
  const sent = ref(false)

  async function forgotPassword(email: string): Promise<boolean> {
    loading.value = true
    error.value = ''

    const parsed = ForgotPasswordInputSchema.safeParse({ email })
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? '请输入正确的邮箱'
      loading.value = false
      return false
    }

    try {
      await authApi.forgotPassword(parsed.data)
      // 后端对「未注册邮箱」也返回成功（防枚举）：前端同样不区分，统一提示「若该邮箱已注册…」
      sent.value = true
      return true
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '网络异常，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, error, sent, forgotPassword }
}
