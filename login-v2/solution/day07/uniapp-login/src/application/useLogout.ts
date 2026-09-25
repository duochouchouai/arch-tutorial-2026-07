import { ref } from 'vue';
import { authApi } from '../infrastructure/auth-api';

export function useLogout() {
  const loading = ref(false);

  async function logout() {
    const token = uni.getStorageSync('remember_token');
    if (!token) return;
    loading.value = true;
    try {
      await authApi.logout(token);
    } catch {} finally {
      uni.removeStorageSync('remember_token');
      loading.value = false;
    }
  }

  return { loading, logout };
}
