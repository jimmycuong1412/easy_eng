import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Clears all auth + middleware-cache cookies so the user is fully logged out.
 *
 * Why not call supabase.auth.signOut() server-side:
 *   The server client uses next/headers cookies which cannot write back to the
 *   response in a Route Handler — so the Supabase sb-*-auth-token cookies are
 *   never actually deleted from the browser. We clear them manually here instead.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  const expired = { path: '/', maxAge: 0 };

  // Clear Supabase auth session cookies (sb-<project-ref>-auth-token[.0/.1/...])
  // The project ref is the subdomain of the Supabase URL.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  const authCookieBase = `sb-${projectRef}-auth-token`;

  // Clear the base cookie + chunked variants (.0, .1, .2)
  response.cookies.set(authCookieBase, '', expired);
  for (let i = 0; i < 5; i++) {
    response.cookies.set(`${authCookieBase}.${i}`, '', expired);
  }

  // Clear middleware role-cache cookies
  response.cookies.set('x-user-role', '', expired);
  response.cookies.set('x-user-locale', '', expired);
  response.cookies.set('x-user-id', '', expired);

  return response;
}
