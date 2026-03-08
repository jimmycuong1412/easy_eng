import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // First, handle internationalization
  const intlResponse = intlMiddleware(request);

  // Then, update the Supabase session (handles auth + role-based redirects)
  const sessionResponse = await updateSession(request);

  // If Supabase middleware returns a redirect, use that
  if (sessionResponse.headers.get('location')) {
    return sessionResponse;
  }

  // Otherwise, return the intl response with any session cookies
  const response = intlResponse || NextResponse.next();

  // Copy over any cookies set by the session update
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
