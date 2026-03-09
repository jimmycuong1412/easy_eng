import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_LOCALES = ['vi', 'en'];

/**
 * POST /api/auth/set-locale
 *
 * Updates the user's preferred locale in the DB and clears the middleware
 * role-cache cookies (x-user-locale, x-user-id) so the next request forces
 * a fresh DB read instead of using the stale cached locale.
 *
 * Without this, switching language redirects straight back to the old locale
 * because the middleware reads the HttpOnly x-user-locale cookie (5 min TTL).
 */
export async function POST(request: NextRequest) {
  const { locale } = await request.json();

  if (!locale || !VALID_LOCALES.includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Best-effort DB update (don't fail if this errors)
    await supabase
      .from('profiles')
      .update({
        locale,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  const response = NextResponse.json({ success: true });

  // Clear the middleware locale/user cache so the next request re-reads from DB
  const cookieOpts = { path: '/', maxAge: 0 };
  response.cookies.set('x-user-locale', '', cookieOpts);
  response.cookies.set('x-user-id', '', cookieOpts);
  response.cookies.set('x-user-role', '', cookieOpts);

  return response;
}
