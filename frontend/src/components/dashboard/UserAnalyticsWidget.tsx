'use client';

export function UserAnalyticsWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        👥 User Analytics
      </h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Students</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Teachers</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-text-primary">0</div>
          <div className="text-sm text-text-secondary">Active</div>
        </div>
      </div>
    </div>
  );
}
