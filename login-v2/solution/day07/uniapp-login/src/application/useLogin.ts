/**
 * 登录 Hook
 *
 * 职责：Zod 校验 → 调 authApi.login() → 处理 token/错误/锁定倒计时。
 * 页面只调用这个 hook，不直接调 authApi。
 */

import { ref } from 'vue';
import { loginSchema } from '../domain/schemas';
import { authApi } from '../infrastructure/auth-api';

export function useLogin() {
  const loading = ref(false);
  const error = ref('');
  const user = ref<{ id: number; username: string; email: string } | null>(null);
  const countdown = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  function startCountdown(lockedUntil: string) {
    countdown.value = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      if (countdown.value <= 0 && timer) {
        clearInterval(timer);
        timer = null;
        error.value = '';
      }
    }, 1000);
  }

  async function login(username: string, password: string, rememberMe?: boolean) {
    loading.value = true;
    error.value = '';

    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      error.value = result.error.errors[0].message;
      loading.value = false;
      throw new Error(result.error.errors[0].message);
    }

    try {
      const res = await authApi.login({ username, password, rememberMe });

      if (res.token) {
        uni.setStorageSync('remember_token', res.token);
      }

      user.value = res.user;
      countdown.value = 0;
      return res.user;
    } catch (e: unknown) {
      const err = e as Error & { lockedUntil?: string };
      error.value = err.message || '登录失败';
      if (err.lockedUntil) {
        startCountdown(err.lockedUntil);
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, user, countdown, login };
}
