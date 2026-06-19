/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CSRF Protection Utilities — Server-only (T237)
 *
 * These functions are safe to use in API Route Handlers, middleware, and
 * Edge Functions. They do NOT import React and carry no client bundle cost.
 *
 * Client-side utilities (useCsrfToken, CsrfTokenInput, csrfFetch, …) live
 * in `csrf.tsx` which is marked `'use client'`.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_READABLE_COOKIE = 'csrf_token_readable';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_MAX_AGE = 3600; // 1 hour in seconds

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random token (works in Node.js and
 * the Edge runtime).
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
    (globalThis as any).crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Public server-side API
// ---------------------------------------------------------------------------

/**
 * Verify CSRF token: compare header token against cookie token.
 */
export function verifyCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) return false;
  return constantTimeEqual(headerToken, cookieToken);
}

/**
 * Higher-order function that wraps a Next.js Route Handler with CSRF
 * validation. Reads X-CSRF-Token header and csrf_token cookie, rejects
 * mismatches with 403.
 *
 * Usage:
 *   async function handler(req: NextRequest) { ... }
 *   export const POST = withCsrfRouteProtection(handler);
 */
export function withCsrfRouteProtection<
  Req extends {
    headers: { get(name: string): string | null };
    cookies: { get(name: string): { value: string } | undefined };
  },
  Res
>(
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
 * Middleware for legacy Next.js API routes — validates CSRF on
 * state-changing requests.
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
 * Supabase Edge Function CSRF middleware.
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
