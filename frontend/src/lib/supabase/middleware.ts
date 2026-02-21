import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { UserRole } from '@/types/database';

const locales = ['vi', 'en'];

// Route protection configuration
interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

// Define role-based route access
const ROLE_ROUTES: RouteConfig[] = [
  // Student-only routes
  { path: '/dashboard/student', allowedRoles: ['student', 'admin'] },
  { path: '/dashboard/my-classes', allowedRoles: ['student', 'admin'] },
  { path: '/dashboard/my-teachers', allowedRoles: ['student', 'admin'] },
  { path: '/dashboard/progress', allowedRoles: ['student', 'admin'] },

  // Teacher-only routes
  { path: '/dashboard/teacher', allowedRoles: ['teacher', 'admin'] },
  { path: '/dashboard/my-students', allowedRoles: ['teacher', 'admin'] },
  { path: '/dashboard/earnings', allowedRoles: ['teacher', 'admin'] },
  { path: '/dashboard/schedule', allowedRoles: ['teacher', 'admin'] },

  // Parent-only routes
  { path: '/dashboard/parent', allowedRoles: ['parent', 'admin'] },
  { path: '/dashboard/children', allowedRoles: ['parent', 'admin'] },

  // Admin-only routes
  { path: '/dashboard/admin', allowedRoles: ['admin'] },
  { path: '/dashboard/users', allowedRoles: ['admin'] },
  { path: '/dashboard/analytics', allowedRoles: ['admin'] },
  { path: '/dashboard/settings/platform', allowedRoles: ['admin'] },
];

// Default dashboard routes by role
const DEFAULT_DASHBOARD: Record<UserRole, string> = {
  student: '/dashboard',
  teacher: '/dashboard/teacher',
  parent: '/dashboard/parent',
  admin: '/dashboard/admin',
};

/**
 * Check if a path matches a route config
 */
function matchesRoute(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

/**
 * Get the route config for a given path
 */
function getRouteConfig(pathname: string): RouteConfig | undefined {
  return ROLE_ROUTES.find((route) => matchesRoute(pathname, route.path));
}

/**
 * Updates the Supabase session in middleware.
 * This ensures the session is refreshed on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Strip locale prefix (e.g. /vi/dashboard -> /dashboard) for route matching
  const segments = pathname.split('/');
  const hasLocale = segments.length > 1 && locales.includes(segments[1]);
  const pathnameWithoutLocale = hasLocale
    ? '/' + segments.slice(2).join('/')
    : pathname;

  // Protected routes check
  const isAuthRoute = pathnameWithoutLocale.startsWith('/auth');
  const isProtectedRoute =
    pathnameWithoutLocale.startsWith('/dashboard') ||
    pathnameWithoutLocale.startsWith('/settings') ||
    pathnameWithoutLocale.startsWith('/booking') ||
    pathnameWithoutLocale.startsWith('/class') ||
    pathnameWithoutLocale.startsWith('/student') ||
    pathnameWithoutLocale.startsWith('/teacher') ||
    pathnameWithoutLocale.startsWith('/admin');

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = hasLocale
      ? `/${segments[1]}/auth/login`
      : '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Helper: get user role and locale with cookie caching (avoids DB call on every request)
  const ROLE_COOKIE = 'x-user-role';
  const LOCALE_COOKIE = 'x-user-locale';
  const USER_ID_COOKIE = 'x-user-id';
  const PROFILE_COOKIE_MAX_AGE = 300; // 5 minutes

  const getUserProfile = async (): Promise<{ role: UserRole; locale: string }> => {
    // Check cookie cache — only valid if the cached user ID matches the current user
    const cachedUserId = request.cookies.get(USER_ID_COOKIE)?.value;
    const cachedRole = request.cookies.get(ROLE_COOKIE)?.value as UserRole | undefined;
    const cachedLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    if (
      cachedUserId === user!.id &&
      cachedRole && ['student', 'teacher', 'parent', 'admin'].includes(cachedRole) &&
      cachedLocale && locales.includes(cachedLocale)
    ) {
      return { role: cachedRole, locale: cachedLocale };
    }

    // Fetch from DB (single query)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, locale')
      .eq('id', user!.id)
      .single();

    const role = (profile?.role as UserRole) || 'student';
    const locale = (profile?.locale && locales.includes(profile.locale))
      ? profile.locale
      : 'vi';

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: PROFILE_COOKIE_MAX_AGE,
      path: '/',
    };

    // Cache in cookies for subsequent requests (keyed by user ID)
    supabaseResponse.cookies.set(USER_ID_COOKIE, user!.id, cookieOpts);
    supabaseResponse.cookies.set(ROLE_COOKIE, role, cookieOpts);
    supabaseResponse.cookies.set(LOCALE_COOKIE, locale, cookieOpts);

    return { role, locale };
  };

  // Keep getUserRole as a convenience wrapper
  const getUserRole = async (): Promise<UserRole> => {
    return (await getUserProfile()).role;
  };

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const { role, locale: preferredLocale } = await getUserProfile();
    const url = request.nextUrl.clone();
    const dashboardPath = DEFAULT_DASHBOARD[role];
    // Use user's preferred locale when redirecting to dashboard
    const targetLocale = hasLocale ? segments[1] : preferredLocale;
    url.pathname = `/${targetLocale}${dashboardPath}`;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users to their preferred locale if the URL uses a different one
  if (user && hasLocale && isProtectedRoute) {
    const currentUrlLocale = segments[1];
    const { locale: preferredLocale } = await getUserProfile();
    if (preferredLocale !== currentUrlLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferredLocale}${pathnameWithoutLocale}`;
      return NextResponse.redirect(url);
    }
  }

  // Role-based route protection
  if (user && isProtectedRoute) {
    const routeConfig = getRouteConfig(pathnameWithoutLocale);

    if (routeConfig) {
      const userRole = await getUserRole();

      // Check if user has permission for this route
      if (!routeConfig.allowedRoles.includes(userRole)) {
        const url = request.nextUrl.clone();
        url.pathname = hasLocale
          ? `/${segments[1]}/unauthorized`
          : '/unauthorized';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

/**
 * Helper to check if a user has a specific role
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Get the default dashboard for a role
 */
export function getDefaultDashboard(role: UserRole): string {
  return DEFAULT_DASHBOARD[role] || '/dashboard';
}
