/**
 * Auth API 封装
 *
 * 这是整个前端项目中唯一出现 uni.request 的地方。
 * 所有页面都应该通过 application 层的 hooks 间接调用这里的函数，
 * 绝不直接调用 uni.request。
 */

import type { User } from '../domain/user';

const BASE_URL = 'http://localhost:3000/auth';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await uni.request({
    url: `${BASE_URL}${path}`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: body,
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error('网络请求失败');
  }

  const result = (res.data as ApiResponse<T> & { lockedUntil?: string });
  if (!result.success) {
    const err = new Error(result.message || '请求失败') as Error & { lockedUntil?: string };
    if (result.lockedUntil) err.lockedUntil = result.lockedUntil;
    throw err;
  }
  return result.data as T;
}

export interface RegisterInput {
  username: string;
  password: string;
  email?: string;
}

export interface LoginInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  user: { id: number; username: string; email: string };
  token?: string;
}

export const authApi = {
  register(input: RegisterInput): Promise<User> {
    return request<User>('/register', input as unknown as Record<string, unknown>);
  },

  login(input: LoginInput): Promise<LoginResult> {
    return request<LoginResult>('/login', input as unknown as Record<string, unknown>);
  },

  forgotPassword(email: string): Promise<void> {
    return request('/forgot-password', { email });
  },

  autoLogin(token: string): Promise<User> {
    return request<User>('/auto-login', { token });
  },

  resetPassword(token: string, newPassword: string): Promise<void> {
    return request('/reset-password', { token, newPassword });
  },

  oauthLogin(provider: string, code: string): Promise<User> {
    return request<User>('/oauth', { provider, code });
  },

  logout(token: string): Promise<void> {
    return request('/logout', { token });
  },
};
