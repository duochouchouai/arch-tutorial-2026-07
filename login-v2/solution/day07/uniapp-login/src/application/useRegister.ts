/**
 * @file 注册用例（前端侧）— 两步：先发验证码，再提交注册
 * @author 教程组
 */
import { ref } from 'vue'
import { ApiError } from '../domain/errors'
import { RegisterInputSchema, SendCodeInputSchema } from '../domain/schemas'
import { authApi } from '../infrastructure/auth-api'

export function useRegister() {
  const loading = ref(false)
  const error = ref('')
  const codeSent = ref(false)
  const sending = ref(false)

  /** 第一步：发验证码（后端把码发到邮箱） */
  async function sendCode(email: string): Promise<boolean> {
    sending.value = true
    error.value = ''

    const parsed = SendCodeInputSchema.safeParse({ email })
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? '请输入正确的邮箱'
      sending.value = false
      return false
    }

    try {
      await authApi.sendCode(parsed.data)
      codeSent.value = true
      return true
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '网络异常，请稍后重试'
      return false
    } finally {
      sending.value = false
    }
  }

  /** 第二步：提交注册（username / password / email / code） */
  async function register(username: string, password: string, email: string, code: string): Promise<boolean> {
    loading.value = true
    error.value = ''

    const parsed = RegisterInputSchema.safeParse({ username, password, email, code })
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? '输入不合法'
      loading.value = false
      return false
    }

    try {
      await authApi.register(parsed.data)
      return true
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : '网络异常，请稍后重试'
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, sending, error, codeSent, sendCode, register }
}
