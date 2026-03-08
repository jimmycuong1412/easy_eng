'use client';

export function BookingAnalyticsWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        📚 Booking Analytics
      </h2>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Total Bookings</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">This Month</div>
        </div>
      </div>
    </div>
  );
}
