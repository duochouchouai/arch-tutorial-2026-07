/**
 * 登录 Hook
 *
 * 职责：Zod 校验输入 → 调 authApi.login() → 处理 token 和错误。
 * 页面只调用这个 hook，不直接调 authApi。
 */

import { ref } from 'vue';
import { loginSchema } from '../domain/schemas';
import { authApi } from '../infrastructure/auth-api';

export function useLogin() {
  const loading = ref(false);
  const error = ref('');
  const user = ref<{ id: number; username: string; email: string } | null>(null);

  async function login(username: string, password: string, rememberMe?: boolean) {
    loading.value = true;
    error.value = '';

    // Zod 校验 — 不通过则不发起网络请求
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      error.value = result.error.errors[0].message;
      loading.value = false;
      return;
    }

    try {
      const res = await authApi.login({ username, password, rememberMe });

      if (res.token) {
        uni.setStorageSync('remember_token', res.token);
      }

      user.value = res.user;
      return res.user;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '登录失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, user, login };
}
