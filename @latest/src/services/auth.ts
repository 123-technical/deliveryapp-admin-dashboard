
import type { LoginCredentials, AuthResponse, AuthUser } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class AuthService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Login failed');
            }

            const data: AuthResponse = await response.json();

            const mappedData = {
                ...data,
                user: {
                    ...data.user,
                    name: data.user.username
                }
            }
      
            // Store tokens in localStorage
            localStorage.setItem('auth_token', mappedData.accessToken);
            localStorage.setItem('user', JSON.stringify(mappedData.user));

            return mappedData;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout(): Promise<void> {
        try {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
  
    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    getRefreshToken(): string | null {
        return null;
    }

    getUser(): AuthUser | null {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
  
    isAuthenticated(): boolean {
        const token = this.getToken();
        const user = this.getUser();
        return !!(token && user);
    }
}

export const authService = new AuthService();
