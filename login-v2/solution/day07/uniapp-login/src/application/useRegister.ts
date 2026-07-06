/**
 * 注册 Hook
 *
 * 职责：Zod 校验输入 → 调 authApi.register() → 处理错误。
 */

import { ref } from 'vue';
import { registerSchema } from '../domain/schemas';
import { authApi } from '../infrastructure/auth-api';

export function useRegister() {
  const loading = ref(false);
  const error = ref('');

  async function register(username: string, password: string, email?: string) {
    loading.value = true;
    error.value = '';

    const result = registerSchema.safeParse({ username, password, email });
    if (!result.success) {
      error.value = result.error.errors[0].message;
      loading.value = false;
      return;
    }

    try {
      const user = await authApi.register({ username, password, email });
      return user;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '注册失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, register };
}
