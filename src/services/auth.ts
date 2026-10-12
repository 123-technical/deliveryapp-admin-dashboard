import type { LoginCredentials, AuthResponse, AuthUser, SignupDto } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ─── Token storage with expiry ────────────────────────────────────────────────
// Tokens are stored in localStorage with an expiry timestamp.
// On every read we validate the expiry and clear if stale.
// localStorage is the single source of truth (no in-memory copy), so every tab
// sees logins/logouts made in other tabs immediately.
export const TOKEN_KEY = 'auth_token';
const USER_KEY    = 'auth_user';
const EXPIRY_KEY  = 'auth_expiry';
// Max session length: 12 hours (capped earlier if the JWT itself expires sooner)
const SESSION_MS  = 12 * 60 * 60 * 1000;

/** Reads the `exp` claim (ms) from a JWT without verifying it; null if absent/unparseable. */
function jwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// ─── 401 global handler registry ─────────────────────────────────────────────
type UnauthorizedHandler = () => void;
let _unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  _unauthorizedHandler = handler;
}

/** Ends the local session and lets the app react (redirect to login, notify). */
export function handleUnauthorized() {
  authService.clearSession();
  _unauthorizedHandler?.();
}

// ─── Fetch wrapper with 401 interception ──────────────────────────────────────
// Every authenticated API call must go through here: it attaches the bearer
// token and turns a 401 (expired/invalidated token) into an app-wide logout.
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = authService.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // FormData needs the browser-generated multipart boundary, so never override it.
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

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
    const expiry = Math.min(Date.now() + SESSION_MS, jwtExpiry(token) ?? Infinity);
    try {
      localStorage.setItem(TOKEN_KEY,  token);
      localStorage.setItem(USER_KEY,   JSON.stringify(user));
      localStorage.setItem(EXPIRY_KEY, String(expiry));
    } catch {
      // Silently handle private browsing / storage quota
    }
  }

  clearSession() {
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
    if (this.isSessionExpired()) {
      this.clearSession();
      return null;
    }
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /** Session expiry as epoch ms, or null when there is no session. */
  getExpiry(): number | null {
    try {
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
      return expiry > 0 ? expiry : null;
    } catch {
      return null;
    }
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
    const expiry = this.getExpiry();
    return expiry !== null && Date.now() > expiry;
  }
}

export const authService = new AuthService();
