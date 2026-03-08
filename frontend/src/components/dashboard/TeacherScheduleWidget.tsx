'use client';

export function TeacherScheduleWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        📅 Upcoming Schedule
      </h2>
      <div className="text-text-secondary">
        <p>Your next classes will appear here.</p>
        <p className="mt-2 text-sm">No upcoming classes scheduled.</p>
      </div>
    </div>
  );
}
