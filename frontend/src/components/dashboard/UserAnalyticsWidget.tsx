'use client';

export function UserAnalyticsWidget() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        👥 User Analytics
      </h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Teachers</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
        </div>
      </div>
    </div>
  );
}
