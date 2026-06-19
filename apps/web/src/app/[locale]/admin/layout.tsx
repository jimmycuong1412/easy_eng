'use client';

/**
 * Admin Layout
 *
 * Layout wrapper for all admin routes with role enforcement
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BackToDashboard } from '@/components/common';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <BackToDashboard />
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
