import { ref } from 'vue';
import { authApi } from '../infrastructure/auth-api';

export function useResetPassword() {
  const loading = ref(false);
  const error = ref('');
  const done = ref(false);

  async function reset(token: string, newPassword: string) {
    loading.value = true;
    error.value = '';
    try {
      await authApi.resetPassword(token, newPassword);
      done.value = true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '重置失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, done, reset };
}
