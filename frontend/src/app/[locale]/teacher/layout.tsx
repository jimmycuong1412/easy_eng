/**
 * Teacher Layout
 * 
 * Layout wrapper for all teacher routes with role enforcement
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['teacher', 'admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </ProtectedRoute>
  );
}
