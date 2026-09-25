import { ref } from 'vue';
import { authApi } from '../infrastructure/auth-api';

export function useOAuth() {
  const loading = ref(false);
  const error = ref('');

  async function login(provider: string) {
    loading.value = true;
    error.value = '';
    try {
      return await authApi.oauthLogin(provider, 'demo-code');
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'OAuth 登录失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, login };
}
