import type {
  ApiResponse,
  ForgotPasswordInput,
  LoginInput,
  LoginResult,
  RegisterInput,
  User,
} from '../domain/auth';

const BASE_URL = 'http://localhost:3000/auth';

function request<T>(url: string, data: unknown): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data,
      success: (res) => {
        resolve(res.data as ApiResponse<T>);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
}

export const authApi = {
  register(input: RegisterInput) {
    return request<User>('/register', input);
  },

  login(input: LoginInput) {
    return request<LoginResult>('/login', input);
  },

  forgotPassword(input: ForgotPasswordInput) {
    return request<null>('/forgot-password', input);
  },

  autoLogin(token: string) {
    return request<User>('/auto-login', { token });
  },

  oauth(provider: 'wechat' | 'qq', code: string) {
    return request<User>('/oauth', { provider, code });
  },

  logout(token: string) {
    return request<null>('/logout', { token });
  },
};
