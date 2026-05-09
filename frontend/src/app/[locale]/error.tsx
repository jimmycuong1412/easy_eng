'use client';

import { useEffect } from 'react';
import { ArrowRIcon } from '@/components/editorial/Icons';

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
    <div
      className="ed-frame"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <p className="ed-eyebrow">Something went wrong · 500</p>
        <h2
          className="ed-display"
          style={{
            fontSize: 'clamp(36px, 4.5vw, 52px)',
            marginTop: 8,
            color: 'var(--ed-coral-ink)',
            letterSpacing: '-0.025em',
          }}
        >
          We hit a snag.
        </h2>
        <p className="ed-body" style={{ marginTop: 14, maxWidth: 360, marginInline: 'auto' }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="ed-btn ed-btn-primary ed-btn-lg"
          style={{ marginTop: 22 }}
        >
          Try again <ArrowRIcon />
        </button>
      </div>
    </div>
  );
}
