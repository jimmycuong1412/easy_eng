'use client';

export function TeacherEarningsWidget() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        💰 Earnings
      </h2>
      <div className="text-gray-600 dark:text-gray-400">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">$0.00</div>
        <p className="mt-2 text-sm">Total earnings this month</p>
      </div>
    </div>
  );
}
