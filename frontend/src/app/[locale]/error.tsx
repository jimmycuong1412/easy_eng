'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
