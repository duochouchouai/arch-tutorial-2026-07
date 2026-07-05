/**
 * 登录 Hook
 *
 * 职责：调 authApi.login()，处理 token 存储和错误。
 * 页面只调用这个 hook，不直接调 authApi。
 */

import { ref } from 'vue';
import { authApi } from '../infrastructure/auth-api';

export function useLogin() {
  const loading = ref(false);
  const error = ref('');
  const user = ref<{ id: number; username: string; email: string } | null>(null);

  async function login(username: string, password: string, rememberMe?: boolean) {
    loading.value = true;
    error.value = '';

    try {
      const result = await authApi.login({ username, password, rememberMe });

      if (result.token) {
        uni.setStorageSync('remember_token', result.token);
      }

      user.value = result.user;
      return result.user;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '登录失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, user, login };
}
