'use client';

import * as React from 'react';

import { THEME_STORAGE_KEY } from './theme-script';

export type Theme = 'bright' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.remove('bright', 'dark');
  el.classList.add(theme);
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'bright';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'bright';
  } catch (_) {
    return 'bright';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // The pre-hydration script (THEME_SCRIPT) already set the class on the
    // server-delivered HTML. In tests/CSR, ensure the class matches state.
    const initial = readStoredTheme();
    applyThemeClass(initial);
    return initial;
  });

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeClass(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch (_) {
      /* storage unavailable — theme still applies for this session */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'bright' ? 'dark' : 'bright';
      applyThemeClass(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (_) {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
