'use client';

import * as React from 'react';

import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      aria-label={theme === 'bright' ? 'Switch to dark theme' : 'Switch to bright theme'}
      title={theme === 'bright' ? 'Dark mode' : 'Bright mode'}
    >
      {/* Avoid hydration mismatch: render a neutral placeholder until mounted */}
      {!mounted ? (
        <span style={{ width: 20, height: 20, display: 'inline-block' }} aria-hidden />
      ) : theme === 'bright' ? (
        // Moon — click to go dark
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        // Sun — click to go bright
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
