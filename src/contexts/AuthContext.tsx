import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { AuthState, LoginCredentials, SignupDto } from "../types/auth";
import { authService, registerUnauthorizedHandler } from "../services/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (dto: SignupDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const clearAuthState = useCallback(() => {
    setAuthState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // ── Initialize from persisted session ─────────────────────────────────────
  useEffect(() => {
    const init = () => {
      try {
        // Check expiry before trusting stored token
        if (authService.isSessionExpired()) {
          authService.clearSession();
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }
        const token = authService.getToken();
        const user  = authService.getUser();
        if (token && user) {
          setAuthState({ user, token, refreshToken: null, isAuthenticated: true, isLoading: false });
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    init();
  }, []);

  // ── Register 401 handler so all fetch calls trigger logout ────────────────
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearAuthState();
      // Navigation is handled by ProtectedRoute redirect
    });
  }, [clearAuthState]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (credentials: LoginCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authService.login(credentials);
      setAuthState({
        user:            response.user,
        token:           response.accessToken ?? null,
        refreshToken:    null,
        isAuthenticated: true,
        isLoading:       false,
      });
    } catch (error) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = async (dto: SignupDto) => {
    await authService.signup(dto);
    // Do NOT auto-login after signup; user must sign in explicitly
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await authService.logout();
    clearAuthState();
  };

  // ── Refresh from storage (for page focus sync) ────────────────────────────
  const refreshAuth = () => {
    const token = authService.getToken();
    const user  = authService.getUser();
    if (token && user) {
      setAuthState({ user, token, refreshToken: null, isAuthenticated: true, isLoading: false });
    } else {
      clearAuthState();
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
