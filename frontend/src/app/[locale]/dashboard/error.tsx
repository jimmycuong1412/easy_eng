'use client';

import { useEffect } from 'react';
import { ArrowRIcon } from '@/components/editorial/Icons';

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
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'var(--ed-paper)',
      }}
    >
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <p className="ed-eyebrow">Dashboard error</p>
        <h2
          className="ed-display"
          style={{
            fontSize: 'clamp(28px, 3.6vw, 40px)',
            marginTop: 8,
            color: 'var(--ed-coral-ink)',
            letterSpacing: '-0.022em',
          }}
        >
          Couldn’t load your dashboard.
        </h2>
        <p className="ed-body" style={{ marginTop: 12 }}>
          Failed to load the dashboard. Please try again.
        </p>
        <button onClick={reset} className="ed-btn ed-btn-primary" style={{ marginTop: 16 }}>
          Try again <ArrowRIcon />
        </button>
      </div>
    </div>
  );
}
