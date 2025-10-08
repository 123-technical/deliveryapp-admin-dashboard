export interface LoginCredentials {
  mobile?: string;
  username?: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// export interface AuthState {
//   user: AuthUser | null;
//   token: string | null;
//   refreshToken: string | null;
//   isAuthenticated: boolean;
//   isLoading: boolean;
// }
