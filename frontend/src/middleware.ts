import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';

import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Define role-based route access
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin'],
  teacher: ['/teacher'],
  student: ['/student'],
  parent: ['/parent'],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export async function middleware(request: NextRequest) {
  // First, handle internationalization
  const intlResponse = intlMiddleware(request);

  // Then, update the Supabase session
  const sessionResponse = await updateSession(request);

  // If Supabase middleware returns a redirect, use that
  if (sessionResponse.headers.get('location')) {
    return sessionResponse;
  }

  // Otherwise, return the intl response with any session cookies
  let response = intlResponse || NextResponse.next();

  // Copy over any cookies set by the session update
  sessionResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  // Role-based access control
  const pathname = request.nextUrl.pathname;

  // Skip role checks for public routes
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.includes(route));
  if (isPublicRoute) {
    return response;
  }

  // Check if the route requires role-based access
  const roleRoute = Object.entries(ROLE_ROUTES).find(([_, routes]) =>
    routes.some((route) => pathname.includes(route))
  );

  if (roleRoute) {
    const [requiredRole] = roleRoute;

    // Create Supabase client to check user role
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated, redirect to login
      const locale = request.nextUrl.pathname.split('/')[1];
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.is_active) {
      // Profile not found or inactive
      const locale = request.nextUrl.pathname.split('/')[1];
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Check if user has the required role
    if (profile.role !== requiredRole && profile.role !== 'admin') {
      // User doesn't have access, redirect to their dashboard
      const locale = request.nextUrl.pathname.split('/')[1];
      const dashboardPath = `/${locale}/${profile.role}/dashboard`;
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

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
