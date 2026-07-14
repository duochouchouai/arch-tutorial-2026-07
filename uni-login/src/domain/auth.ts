export interface User {
  id: number;
  username: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  email: string;
}

export interface LoginInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface LoginResult {
  user: User;
  token?: string;
}
