/**
 * Teacher Dashboard Page
 *
 * Main dashboard for teachers showing schedule, students, and earnings
 */

import { Metadata } from 'next';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { TeacherScheduleWidget } from '@/components/dashboard/TeacherScheduleWidget';
import { StudentRosterWidget } from '@/components/dashboard/StudentRosterWidget';
import { TeacherEarningsWidget } from '@/components/dashboard/TeacherEarningsWidget';

export const metadata: Metadata = {
  title: 'Teacher Dashboard | Easy English',
  description: 'Manage your classes, students, and earnings',
};

export default function TeacherDashboardPage() {
  return (
    <ProtectedRoute requiredRoles={['teacher', 'admin']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Teacher Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your classes, view your schedule, and track your earnings
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TeacherScheduleWidget />
          </div>
          <div>
            <TeacherEarningsWidget />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <StudentRosterWidget />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
