export interface LoginCredentials {
  mobile: string;
  otp: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string; // This will be populated with username from backend
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
