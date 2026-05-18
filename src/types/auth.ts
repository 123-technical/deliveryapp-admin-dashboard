// Auth types — aligned with the actual API contract
export type LoginWithMobileDto = {
  mobile: string;
  password: string;
};

export type LoginWithUsernameDto = {
  username: string;
  password: string;
};

export type LoginCredentials = LoginWithMobileDto | LoginWithUsernameDto;

export type SignupDto = {
  email: string;
  mobile: string;
  name: string;
  username: string;
  password: string;
};

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email?: string;
  mobile?: string;
  role: string;
};

export type AuthResponse = {
  accessToken?: string;  // backend field
  token?: string;        // fallback field name
  user: AuthUser;
};

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};
