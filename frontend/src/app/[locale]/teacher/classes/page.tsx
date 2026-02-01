/**
 * Teacher Classes Page
 * 
 * List of all classes created by the teacher
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const metadata: Metadata = {
  title: 'My Classes | Easy English',
  description: 'Manage your classes',
};

export default function TeacherClassesPage() {
  return (
    <ProtectedRoute requiredRoles={['teacher', 'admin']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Classes
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your scheduled classes
            </p>
          </div>
          <Link
            href="/teacher/classes/new"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            + Create New Class
          </Link>
        </div>

        <div className="grid gap-6">
          <ClassListPlaceholder />
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ClassListPlaceholder() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-6xl">📚</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          No classes yet
        </h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Create your first class to start teaching
        </p>
        <Link
          href="/teacher/classes/new"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Create Your First Class
        </Link>
      </div>
    </div>
  );
}
