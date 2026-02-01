'use client';

export function TeacherScheduleWidget() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        📅 Upcoming Schedule
      </h2>
      <div className="text-gray-600 dark:text-gray-400">
        <p>Your next classes will appear here.</p>
        <p className="mt-2 text-sm">No upcoming classes scheduled.</p>
      </div>
    </div>
  );
}
