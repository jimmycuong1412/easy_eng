'use client';

import * as React from 'react';

import { toggleTheme } from './theme-store';

/**
 * Toggle button. Renders identical markup on server and client (both icons
 * always present; CSS picks which is visible via html[data-theme]), so there
 * is no hydration mismatch and no mounted guard is needed. The anti-flash
 * script has already set the correct data-theme before paint, so the right
 * icon shows immediately.
 */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={className}
      aria-label="Toggle bright/dark theme"
      title="Toggle theme"
    >
      {/* Moon — visible in bright mode (CSS). Click to go dark. */}
      <svg
        className="theme-icon theme-icon-moon"
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
      {/* Sun — visible in dark mode (CSS). Click to go bright. */}
      <svg
        className="theme-icon theme-icon-sun"
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
    </button>
  );
}
