import { ref } from 'vue';
import { authApi } from '../infrastructure/auth-api';

export function useAutoLogin() {
  const loading = ref(true);
  const user = ref<{ id: number; username: string; email: string } | null>(null);

  async function check() {
    const token = uni.getStorageSync('remember_token');
    if (!token) {
      loading.value = false;
      return null;
    }
    try {
      const u = await authApi.autoLogin(token);
      user.value = u;
      return u;
    } catch {
      uni.removeStorageSync('remember_token');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, user, check };
}
