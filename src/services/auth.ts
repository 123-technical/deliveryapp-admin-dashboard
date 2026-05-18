import type { LoginCredentials, AuthResponse, AuthUser, SignupDto } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ─── Token storage with expiry ────────────────────────────────────────────────
// Tokens are stored in localStorage with an expiry timestamp.
// On every read we validate the expiry and clear if stale.
const TOKEN_KEY   = 'auth_token';
const USER_KEY    = 'auth_user';
const EXPIRY_KEY  = 'auth_expiry';
// Default session length: 12 hours
const SESSION_MS  = 12 * 60 * 60 * 1000;

// In-memory cache so the token survives tab focus without re-parsing localStorage
let _memToken: string | null = null;

// ─── 401 global handler registry ─────────────────────────────────────────────
type UnauthorizedHandler = () => void;
let _unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  _unauthorizedHandler = handler;
}

function handleUnauthorized() {
  authService.clearSession();
  _unauthorizedHandler?.();
}

// ─── Fetch wrapper with 401 interception ──────────────────────────────────────
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = authService.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    handleUnauthorized();
  }
  return response;
}

// ─── AuthService ──────────────────────────────────────────────────────────────
class AuthService {
  private baseURL = API_BASE_URL;

  // ── Login ──────────────────────────────────────────────────────────────────
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/signin-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      if (!navigator.onLine) {
        throw new Error('Unable to connect. Check your internet connection.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed. Please check your credentials.');
    }

    const responseData = await response.json();

    // Handle both response shapes: { data: { accessToken, user } } and { accessToken, user }
    const payload = responseData.data ?? responseData;
    const accessToken: string = payload.accessToken ?? payload.token ?? '';
    const rawUser = payload.user ?? {};
    const user: AuthUser = {
      id:       rawUser.id       ?? '',
      username: rawUser.username ?? '',
      name:     rawUser.name     ?? rawUser.username ?? '',
      email:    rawUser.email,
      mobile:   rawUser.mobile,
      role:     rawUser.role     ?? 'ADMIN',
    };

    this.storeSession(accessToken, user);
    return { accessToken, user };
  }

  // ── Signup ─────────────────────────────────────────────────────────────────
  async signup(dto: SignupDto): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      if (!navigator.onLine) {
        throw new Error('Unable to connect. Check your internet connection.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Signup failed. Please try again.');
    }
  }

  // ── Session storage ────────────────────────────────────────────────────────
  private storeSession(token: string, user: AuthUser) {
    _memToken = token;
    const expiry = Date.now() + SESSION_MS;
    try {
      localStorage.setItem(TOKEN_KEY,  token);
      localStorage.setItem(USER_KEY,   JSON.stringify(user));
      localStorage.setItem(EXPIRY_KEY, String(expiry));
    } catch {
      // Silently handle private browsing / storage quota
    }
  }

  clearSession() {
    _memToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    } catch { /* noop */ }
  }

  async logout(): Promise<void> {
    this.clearSession();
  }

  // ── Token getters ──────────────────────────────────────────────────────────
  getToken(): string | null {
    // Fast path: in-memory cache
    if (_memToken) return _memToken;

    try {
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
      if (expiry && Date.now() > expiry) {
        // Token has expired — clear everything
        this.clearSession();
        return null;
      }
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) _memToken = token;
      return token;
    } catch {
      return null;
    }
  }

  getRefreshToken(): string | null {
    return null; // No refresh token implementation on this backend
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!(this.getToken() && this.getUser());
  }

  isSessionExpired(): boolean {
    try {
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
      return expiry > 0 && Date.now() > expiry;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
