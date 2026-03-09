import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/logout
 *
 * Signs out the user server-side and clears the middleware role-cache cookies
 * (x-user-role, x-user-locale, x-user-id) so the middleware doesn't redirect
 * back to the dashboard on the next request.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });

  // Clear the middleware role-cache cookies
  const cookieOpts = { path: '/', maxAge: 0 };
  response.cookies.set('x-user-role', '', cookieOpts);
  response.cookies.set('x-user-locale', '', cookieOpts);
  response.cookies.set('x-user-id', '', cookieOpts);

  return response;
}
