'use client';

export function TeacherEarningsWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        💰 Earnings
      </h2>
      <div className="text-text-secondary">
        <div className="text-3xl font-bold text-text-primary">$0.00</div>
        <p className="mt-2 text-sm">Total earnings this month</p>
      </div>
    </div>
  );
}
