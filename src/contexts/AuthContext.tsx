import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthState, LoginCredentials, SignupDto } from "../types/auth";
import { authService, registerUnauthorizedHandler, handleUnauthorized, TOKEN_KEY } from "../services/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (dto: SignupDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// setTimeout overflows above ~24.8 days and fires immediately
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Builds auth state from whatever session is currently persisted. */
function readStoredAuth(): AuthState {
  const token = authService.getToken();
  const user  = authService.getUser();
  return token && user
    ? { user, token, refreshToken: null, isAuthenticated: true, isLoading: false }
    : { user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState<AuthState>(readStoredAuth);

  // Mirrors isAuthenticated for the 401 handler, which runs outside React's render cycle
  const isAuthenticatedRef = useRef(authState.isAuthenticated);
  isAuthenticatedRef.current = authState.isAuthenticated;

  const clearAuthState = useCallback(() => {
    isAuthenticatedRef.current = false;
    queryClient.clear(); // never show the previous session's cached data
    setAuthState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [queryClient]);

  // ── Session ended by the server (401) or by local expiry ──────────────────
  // Navigation is handled by ProtectedRoute redirecting to /login.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      // Several in-flight requests can 401 together — react only once
      if (!isAuthenticatedRef.current) return;
      clearAuthState();
      message.warning("Your session has expired. Please sign in again.");
    });
    return () => registerUnauthorizedHandler(null);
  }, [clearAuthState, message]);

  // ── Log out at expiry even if the tab is idle ─────────────────────────────
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    const expiry = authService.getExpiry();
    if (expiry === null) return;
    const timer = setTimeout(handleUnauthorized, Math.min(Math.max(expiry - Date.now(), 0), MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [authState.isAuthenticated, authState.token]);

  // ── Refresh from storage ──────────────────────────────────────────────────
  const refreshAuth = useCallback(() => {
    const next = readStoredAuth();
    if (next.isAuthenticated) setAuthState(next);
    else clearAuthState();
  }, [clearAuthState]);

  // ── Keep tabs in sync: login/logout in one tab applies to all ─────────────
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === null) refreshAuth();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshAuth]);

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
