/**
 * Role Checking Utilities
 *
 * Client-side utilities for checking user roles and permissions
 */

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserProfile | null, role: UserRole): boolean {
  if (!user || !user.is_active) return false;
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: UserProfile | null, roles: UserRole[]): boolean {
  if (!user || !user.is_active) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: UserProfile | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user is a teacher
 */
export function isTeacher(user: UserProfile | null): boolean {
  return hasRole(user, 'teacher');
}

/**
 * Check if user is a student
 */
export function isStudent(user: UserProfile | null): boolean {
  return hasRole(user, 'student');
}

/**
 * Check if user is a parent
 */
export function isParent(user: UserProfile | null): boolean {
  return hasRole(user, 'parent');
}

/**
 * Get the dashboard path for a user based on their role
 */
export function getDashboardPath(user: UserProfile | null): string {
  if (!user) return '/auth/login';

  switch (user.role) {
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
    case 'student':
    case 'parent':
    default:
      return '/dashboard';
  }
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  user: UserProfile | null,
  requiredRoles: UserRole[]
): boolean {
  if (!user || !user.is_active) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
  };

  return roleNames[role] || role;
}

/**
 * Check if user can manage other users (admin only)
 */
export function canManageUsers(user: UserProfile | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can manage gems (admin only)
 */
export function canManageGems(user: UserProfile | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can create classes (teacher or admin)
 */
export function canCreateClasses(user: UserProfile | null): boolean {
  return hasAnyRole(user, ['teacher', 'admin']);
}

/**
 * Check if user can book classes (student or parent)
 */
export function canBookClasses(user: UserProfile | null): boolean {
  return hasAnyRole(user, ['student', 'parent']);
}

/**
 * Check if user can view analytics (admin only)
 */
export function canViewAnalytics(user: UserProfile | null): boolean {
  return isAdmin(user);
}

/**
 * Check if user can view teacher earnings (teacher or admin)
 */
export function canViewEarnings(user: UserProfile | null): boolean {
  return hasAnyRole(user, ['teacher', 'admin']);
}

/**
 * Validate role transition (for role updates)
 */
export function canTransitionRole(
  fromRole: UserRole,
  toRole: UserRole
): { allowed: boolean; reason?: string } {
  // Admin can become any role
  if (fromRole === 'admin') {
    return { allowed: true };
  }

  // Can't transition to admin (must be granted by another admin)
  if (toRole === 'admin') {
    return {
      allowed: false,
      reason: 'Admin role must be granted by an administrator',
    };
  }

  // Student can become teacher
  if (fromRole === 'student' && toRole === 'teacher') {
    return { allowed: true };
  }

  // Teacher can become student (downgrade)
  if (fromRole === 'teacher' && toRole === 'student') {
    return { allowed: true };
  }

  // Parent/student transitions
  if (
    (fromRole === 'parent' && toRole === 'student') ||
    (fromRole === 'student' && toRole === 'parent')
  ) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Cannot transition from ${fromRole} to ${toRole}`,
  };
}

/**
 * Get allowed routes for a role
 */
export function getAllowedRoutes(role: UserRole): string[] {
  const commonRoutes = ['/profile', '/settings'];

  const roleRoutes: Record<UserRole, string[]> = {
    admin: [
      '/admin/dashboard',
      '/admin/users',
      '/admin/analytics',
      '/admin/gems-rules',
      '/admin/reconciliation',
      ...commonRoutes,
    ],
    teacher: [
      '/teacher/dashboard',
      '/teacher/classes',
      '/teacher/schedule',
      '/teacher/earnings',
      ...commonRoutes,
    ],
    student: [
      '/student/dashboard',
      '/student/classes',
      '/student/bookings',
      '/student/gems',
      '/student/character',
      '/student/marketplace',
      ...commonRoutes,
    ],
    parent: [
      '/parent/dashboard',
      '/parent/children',
      '/parent/bookings',
      ...commonRoutes,
    ],
  };

  return roleRoutes[role] || commonRoutes;
}

/**
 * Check if a route is allowed for a role
 */
export function isRouteAllowed(route: string, role: UserRole): boolean {
  const allowedRoutes = getAllowedRoutes(role);

  // Check exact match
  if (allowedRoutes.includes(route)) return true;

  // Check prefix match (e.g., /admin/users/123 matches /admin/users)
  return allowedRoutes.some((allowedRoute) =>
    route.startsWith(allowedRoute + '/')
  );
}
