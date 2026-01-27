import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database, UserRole } from '@/types/database';

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

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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

  // Protected routes check
  const isAuthRoute = pathname.startsWith('/auth');
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/booking') ||
    pathname.startsWith('/class');

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    // Fetch user profile to get role for proper redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as UserRole) || 'student';
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_DASHBOARD[role];
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user && isProtectedRoute) {
    const routeConfig = getRouteConfig(pathname);

    if (routeConfig) {
      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = (profile?.role as UserRole) || 'student';

      // Check if user has permission for this route
      if (!routeConfig.allowedRoles.includes(userRole)) {
        // Redirect to unauthorized page or default dashboard
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
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
