/**
 * ProtectedRoute Component
 *
 * Wrapper component for routes that require authentication and specific roles
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient as createClientComponentClient } from '@/lib/supabase/client';
import type { UserRole, UserProfile } from '@/utils/roleCheck';
import { canAccessRoute, getDashboardPath } from '@/utils/roleCheck';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  fallback = <LoadingSpinner />,
  redirectTo,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuthorization();
  }, [pathname]);

  async function checkAuthorization() {
    try {
      // Check if user is authenticated
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        // Not authenticated, redirect to login
        const loginUrl = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`;
        router.push(loginUrl);
        setIsAuthorized(false);
        return;
      }

      // Get user profile
      const { data: profile, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile:', error);
        router.push('/auth/login');
        setIsAuthorized(false);
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as UserRole,
        is_active: profile.is_active,
      };

      setUser(userProfile);

      // Check if user is active
      if (!userProfile.is_active) {
        router.push('/auth/inactive');
        setIsAuthorized(false);
        return;
      }

      // Check role-based access if required
      if (requiredRoles && requiredRoles.length > 0) {
        const hasAccess = canAccessRoute(userProfile, requiredRoles);

        if (!hasAccess) {
          // User doesn't have required role, redirect to their dashboard
          const dashboardPath = redirectTo || getDashboardPath(userProfile);
          router.push(dashboardPath);
          setIsAuthorized(false);
          return;
        }
      }

      // User is authorized
      setIsAuthorized(true);
    } catch (error) {
      console.error('Authorization check failed:', error);
      router.push('/auth/login');
      setIsAuthorized(false);
    }
  }

  // Show loading state while checking authorization
  if (isAuthorized === null) {
    return <>{fallback}</>;
  }

  // Show nothing if not authorized (redirect is in progress)
  if (!isAuthorized) {
    return null;
  }

  // Render children if authorized
  return <>{children}</>;
}

/**
 * Default loading spinner
 */
function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p className="text-sm text-gray-600">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * Higher-order component for protecting pages
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRoles={requiredRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook to check if user has specific role
 */
export function useRequireRole(requiredRoles: UserRole[]) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  async function checkRole() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        router.push('/auth/login');
        return;
      }

      const userProfile: UserProfile = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as UserRole,
        is_active: profile.is_active,
      };

      if (!canAccessRoute(userProfile, requiredRoles)) {
        router.push(getDashboardPath(userProfile));
        return;
      }

      setUser(userProfile);
    } catch (error) {
      console.error('Role check failed:', error);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  }

  return { user, isLoading };
}
