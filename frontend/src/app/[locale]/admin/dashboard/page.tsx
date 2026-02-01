/**
 * Admin Dashboard Page
 *
 * Main dashboard for administrators showing platform analytics
 */

import { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserAnalyticsWidget } from '@/components/dashboard/UserAnalyticsWidget';
import { BookingAnalyticsWidget } from '@/components/dashboard/BookingAnalyticsWidget';
import { GemAnalyticsWidget } from '@/components/dashboard/GemAnalyticsWidget';
import { RevenueWidget } from '@/components/dashboard/RevenueWidget';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Easy English',
  description: 'Platform analytics and management',
};

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Platform analytics and system management
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <UserAnalyticsWidget />
          <BookingAnalyticsWidget />
          <GemAnalyticsWidget />
          <RevenueWidget />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminActionCard
            title="User Management"
            description="Manage users and roles"
            href="/admin/users"
            icon="👥"
          />
          <AdminActionCard
            title="Gems Rules"
            description="Configure gem system"
            href="/admin/gems-rules"
            icon="💎"
          />
          <AdminActionCard
            title="Analytics"
            description="Detailed reports"
            href="/admin/analytics"
            icon="📊"
          />
          <AdminActionCard
            title="Reconciliation"
            description="Balance checks"
            href="/admin/reconciliation"
            icon="🔍"
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

interface AdminActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
}

function AdminActionCard({ title, description, href, icon }: AdminActionCardProps) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </a>
  );
}
