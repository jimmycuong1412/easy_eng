import type { PlatformAdapter } from '@easyeng/core';

/**
 * Web PlatformAdapter — browser implementations of the auth-flow primitives
 * core's useAuth needs (origin for redirect URLs, cookie clearing, navigation).
 */
export const webPlatform: PlatformAdapter = {
  getOrigin: () =>
    typeof window !== 'undefined' ? window.location.origin : '',

  clearAuthCookies: () => {
    if (typeof document === 'undefined') return;
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (name && name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  },

  redirect: (path) => {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  },
};
