/**
 * API Client
 * 
 * HTTP client for backend API communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'teacher' | 'parent';
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Set access token in localStorage
 */
function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', token);
}

/**
 * Clear access token from localStorage
 */
function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
}

/**
 * Make HTTP request
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Auth API methods
 */
export const authApi = {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<ApiResponse<{ user: User; session: AuthTokens }>> {
    const response = await request<{ user: User; session: AuthTokens }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (response.success && response.data?.session) {
      setAccessToken(response.data.session.access_token);
    }

    return response;
  },

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<ApiResponse<{ user: User; session: AuthTokens }>> {
    const response = await request<{ user: User; session: AuthTokens }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    if (response.success && response.data?.session) {
      setAccessToken(response.data.session.access_token);
    }

    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    const response = await request('/api/auth/logout', {
      method: 'POST',
    });

    clearAccessToken();

    return response;
  },

  /**
   * Get current user profile
   */
  async getMe(): Promise<ApiResponse<User>> {
    return request<User>('/api/auth/me');
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

/**
 * Export utilities
 */
export { getAccessToken, setAccessToken, clearAccessToken };
