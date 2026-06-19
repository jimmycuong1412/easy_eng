'use client';

export function StudentRosterWidget() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-text-primary">
        👨‍🎓 Student Roster
      </h2>
      <div className="text-text-secondary">
        <p>Your enrolled students will appear here.</p>
        <p className="mt-2 text-sm">No students enrolled yet.</p>
      </div>
    </div>
  );
}
