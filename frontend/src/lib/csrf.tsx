'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
/**
 * CSRF Protection Utilities — Client-side (T237)
 *
 * Implements double-submit cookie pattern:
 * - Server sets an HttpOnly cookie with the CSRF token
 * - Client reads a non-HttpOnly "mirror" cookie to get the token value
 * - Client sends the token in the X-CSRF-Token header
 * - Server compares the header token against the HttpOnly cookie token
 *
 * This is more secure than sessionStorage because:
 * - The canonical token is in an HttpOnly cookie (not readable by XSS)
 * - An attacker cannot forge both the cookie and header from a different origin
 *
 * Server-only utilities (verifyCsrfToken, withCsrfRouteProtection, …) live
 * in `csrf.server.ts` and must be imported from there in API routes and
 * middleware.
 */

import { useEffect, useState } from 'react';

// Re-export server-safe functions so existing imports from '@/lib/csrf' that
// only use these functions continue to work (e.g., in API routes that are
// bundled separately by Next.js and are never included in client chunks).
export {
  verifyCsrfToken,
  withCsrfRouteProtection,
  csrfMiddleware,
  edgeFunctionCsrfMiddleware,
  setCsrfCookies,
  generateToken,
  constantTimeEqual,
} from './csrf.server';

const CSRF_READABLE_COOKIE = 'csrf_token_readable';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

// ---------------------------------------------------------------------------
// Client-side helpers
// ---------------------------------------------------------------------------

/**
 * Read the CSRF token from the readable cookie (client-side).
 * Returns empty string on server or if not set.
 */
function readTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_READABLE_COOKIE}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Get the CSRF token for client-side use.
 * Reads from the readable cookie set by the server/middleware.
 */
export function getCsrfToken(): string {
  if (typeof window === 'undefined') return '';
  return readTokenFromCookie();
}

/**
 * Clear CSRF tokens (e.g., on logout)
 */
export function clearCsrfToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CSRF_READABLE_COOKIE}=; path=/; max-age=0`;
}

/**
 * Refresh CSRF token by requesting a new one from the server
 */
export function refreshCsrfToken(): string {
  // Trigger a fetch to /api/csrf to get a fresh token
  fetch('/api/csrf', { credentials: 'same-origin' }).catch(() => {});
  return getCsrfToken();
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCsrfToken();
  if (!token) return headers;

  const headersObj = new Headers(headers);
  headersObj.set(CSRF_HEADER_NAME, token);
  return Object.fromEntries(headersObj.entries());
}

/**
 * CSRF-protected fetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = addCsrfHeader(options.headers);
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}

/**
 * React hook for CSRF token
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(getCsrfToken());

    const interval = setInterval(() => {
      setToken(getCsrfToken());
    }, 30_000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return {
    token,
    refreshToken: refreshCsrfToken,
    clearToken: clearCsrfToken,
  };
}

/**
 * Hidden CSRF token input for forms
 */
export function CsrfTokenInput(): JSX.Element {
  const { token } = useCsrfToken();
  return (
    <input
      type="hidden"
      name="csrf_token"
      value={token}
      aria-hidden="true"
    />
  );
}

/**
 * HOC for CSRF protection
 */
export function withCsrfProtection<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    useEffect(() => {
      getCsrfToken();
    }, []);
    return <Component {...props} />;
  };
}

/**
 * API client with CSRF protection
 */
export class CsrfProtectedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = addCsrfHeader(options.headers);
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    return response.json();
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
