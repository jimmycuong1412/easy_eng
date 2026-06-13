'use client';

/**
 * Teacher Layout
 *
 * Layout wrapper for all teacher routes with role enforcement
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BackToDashboard } from '@/components/common';
import ClassReminderProvider from '@/components/class/ClassReminderProvider';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['teacher', 'admin']}>
      <div className="min-h-screen bg-bg-primary">
        <div className="w-full px-4 py-6">
          <BackToDashboard />
          {children}
        </div>
      </div>
      <ClassReminderProvider />
    </ProtectedRoute>
  );
}
