'use client';

import { useSyncExternalStore } from 'react';

import {
  getServerTheme,
  getTheme,
  setTheme,
  subscribe,
  toggleTheme,
  type Theme,
} from './theme-store';

export function useTheme(): {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
} {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  return { theme, toggle: toggleTheme, setTheme };
}
