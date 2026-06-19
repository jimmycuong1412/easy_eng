/**
 * CSRF server-side utilities (Route Handler / Server Action use only).
 * Split from csrf.tsx to avoid pulling 'use client' into server bundles.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) return false;
  return constantTimeEqual(headerToken, cookieToken);
}

export function withCsrfRouteProtection<
  Req extends {
    headers: { get(name: string): string | null };
    cookies: { get(name: string): { value: string } | undefined };
  },
  Res
>(handler: (req: Req) => Promise<Res>): (req: Req) => Promise<Res | Response> {
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
