/**
 * Admin Layout
 * 
 * Layout wrapper for all admin routes with role enforcement
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </ProtectedRoute>
  );
}
