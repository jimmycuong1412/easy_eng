/**
 * Admin User Management Page
 * 
 * Manage platform users and roles
 */

'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import type { UserRole } from '@/utils/roleCheck';

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage users, roles, and permissions
          </p>
        </div>

        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="parent">Parents</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="p-8 text-center">
            <div className="mb-4 text-6xl">👥</div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              User list will appear here
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Connect to database to load users
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
