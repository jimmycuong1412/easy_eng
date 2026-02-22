/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CSRF Protection Utilities (T237)
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
 */

import { useEffect, useState } from 'react';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_READABLE_COOKIE = 'csrf_token_readable';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_MAX_AGE = 3600; // 1 hour in seconds

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
    (globalThis as any).crypto.getRandomValues(array);
  } else {
    // Fallback — should not happen in modern browsers/runtimes
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

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
 * Verify CSRF token: compare header token against cookie token
 */
export function verifyCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) return false;
  return constantTimeEqual(headerToken, cookieToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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

/**
 * Higher-order function that wraps a Next.js Route Handler with CSRF validation.
 * Reads X-CSRF-Token header and csrf_token cookie, rejects mismatches with 403.
 *
 * Usage:
 *   async function handler(req: NextRequest) { ... }
 *   export const POST = withCsrfRouteProtection(handler);
 */
export function withCsrfRouteProtection<Req extends { headers: { get(name: string): string | null }; cookies: { get(name: string): { value: string } | undefined } }, Res>(
  handler: (req: Req) => Promise<Res>
): (req: Req) => Promise<Res | Response> {
  return async (req: Req): Promise<Res | Response> => {
    const headerToken = req.headers.get(CSRF_HEADER_NAME);
    const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
    if (!verifyCsrfToken(headerToken, cookieToken)) {
      return new Response(
        JSON.stringify({ error: 'CSRF token validation failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return handler(req);
  };
}

/**
 * Middleware for Next.js API routes — validates CSRF on state-changing requests.
 * Compares X-CSRF-Token header against the HttpOnly csrf_token cookie.
 */
export function csrfMiddleware(handler: (req: any, res: any) => Promise<any>) {
  return async (req: any, res: any) => {
    const stateMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (stateMethods.includes(req.method)) {
      const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()];
      const cookieToken = req.cookies[CSRF_COOKIE_NAME];
      if (!verifyCsrfToken(headerToken, cookieToken)) {
        return res.status(403).json({
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token',
        });
      }
    }
    return handler(req, res);
  };
}

/**
 * Supabase Edge Function CSRF middleware
 */
export async function edgeFunctionCsrfMiddleware(req: Request): Promise<Response | null> {
  const stateMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (stateMethods.includes(req.method)) {
    const headerToken = req.headers.get(CSRF_HEADER_NAME);
    const cookies = req.headers.get('cookie') || '';
    const tokenMatch = cookies.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
    const cookieToken = tokenMatch ? tokenMatch[1] : null;
    if (!verifyCsrfToken(headerToken, cookieToken)) {
      return new Response(
        JSON.stringify({ error: 'CSRF token validation failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return null;
}

/**
 * Helper: set CSRF cookies on a response (use in middleware or API routes).
 * Sets both the HttpOnly token cookie and a readable mirror cookie.
 */
export function setCsrfCookies(
  response: { cookies: { set: (name: string, value: string, options: any) => void } }
): string {
  const token = generateToken();
  const isProduction = process.env.NODE_ENV === 'production';

  // HttpOnly cookie — the source of truth, not accessible to JS
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });

  // Readable cookie — JS reads this to put in the header
  response.cookies.set(CSRF_READABLE_COOKIE, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_MAX_AGE,
  });

  return token;
}
