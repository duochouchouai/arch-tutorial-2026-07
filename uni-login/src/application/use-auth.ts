import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
} from '../domain/auth';
import { authApi } from '../infrastructure/auth-api';

function showMessage(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  });
}

export function useAuth() {
  async function register(input: RegisterInput) {
    const res = await authApi.register(input);

    if (!res.success) {
      showMessage(res.message || '注册失败');
      return false;
    }

    showMessage('注册成功');
    return true;
  }

  async function login(input: LoginInput) {
    const res = await authApi.login(input);

    if (!res.success) {
      showMessage(res.message || '登录失败');
      return false;
    }

    if (res.data?.token) {
      uni.setStorageSync('rememberToken', res.data.token);
    }

    showMessage('登录成功');
    return true;
  }

  async function forgotPassword(input: ForgotPasswordInput) {
    const res = await authApi.forgotPassword(input);

    if (!res.success) {
      showMessage(res.message || '发送失败');
      return false;
    }

    showMessage(res.message || '重置链接已发送到您的邮箱');
    return true;
  }

  return {
    register,
    login,
    forgotPassword,
  };
}
