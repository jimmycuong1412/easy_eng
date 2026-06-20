import type { StorageAdapter } from '@easyeng/core';

/**
 * Web StorageAdapter backed by localStorage. Guards against SSR (no window) by
 * returning a no-op until the browser is available; Zustand `persist` rehydrates
 * on the client where localStorage exists.
 */
export const webStorage: StorageAdapter = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
};
