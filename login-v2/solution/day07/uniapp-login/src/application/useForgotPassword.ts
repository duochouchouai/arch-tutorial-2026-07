/**
 * 忘记密码 Hook
 */

import { ref } from 'vue';
import { forgotPasswordSchema } from '../domain/schemas';
import { authApi } from '../infrastructure/auth-api';

export function useForgotPassword() {
  const loading = ref(false);
  const error = ref('');
  const sent = ref(false);

  async function forgotPassword(email: string) {
    loading.value = true;
    error.value = '';

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      error.value = result.error.errors[0].message;
      loading.value = false;
      return;
    }

    try {
      await authApi.forgotPassword(email);
      sent.value = true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '请求失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, sent, forgotPassword };
}
