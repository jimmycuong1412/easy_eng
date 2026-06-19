'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Client-side role guard component.
 * Use this for additional protection on top of middleware.
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  redirectTo = '/unauthorized',
}: RoleGuardProps) {
  const router = useRouter();
  const { profile, isLoading, isAuthenticated } = useAuthStore();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!profile || !allowedRoles.includes(profile.role)) {
      router.push(redirectTo);
      return;
    }

    setIsChecking(false);
  }, [isLoading, isAuthenticated, profile, allowedRoles, redirectTo, router]);

  if (isLoading || isChecking) {
    return fallback || <RoleGuardSkeleton />;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * HOC version of RoleGuard for wrapping pages
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: UserRole[],
  options?: {
    fallback?: React.ReactNode;
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <RoleGuard
        allowedRoles={allowedRoles}
        fallback={options?.fallback}
        redirectTo={options?.redirectTo}
      >
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}

/**
 * Loading skeleton for role guard
 */
function RoleGuardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A1628] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-64 bg-white/5" />
      </div>
    </div>
  );
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useRoleCheck(allowedRoles: UserRole[]): {
  hasAccess: boolean;
  isLoading: boolean;
  role: UserRole | null;
} {
  const { profile, isLoading } = useAuthStore();

  return {
    hasAccess: profile ? allowedRoles.includes(profile.role) : false,
    isLoading,
    role: profile?.role || null,
  };
}
