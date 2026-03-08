'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold text-red-600">Dashboard Error</h2>
        <p className="mt-2 text-muted-foreground">
          Failed to load the dashboard. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
