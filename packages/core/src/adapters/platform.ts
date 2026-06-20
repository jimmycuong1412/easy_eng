/**
 * Platform adapter.
 *
 * Wraps web-only browser APIs that core hooks (notably useAuth) need:
 * - getOrigin(): base URL for OAuth / password-reset redirect targets
 *   (web: window.location.origin; mobile: a configured deep-link / app URL)
 * - clearAuthCookies(): clear Supabase `sb-*` cookies on sign-out
 *   (web: document.cookie; mobile: no-op — session lives in AsyncStorage)
 * - redirect(path): navigate after sign-out
 *   (web: window.location.href; mobile: router navigation)
 *
 * Each app registers its implementation ONCE at startup via `setPlatform`.
 */

export interface PlatformAdapter {
  /** Base origin used to build OAuth / reset-password redirect URLs. */
  getOrigin: () => string;
  /** Clear persisted auth credentials on sign-out. */
  clearAuthCookies: () => void;
  /** Navigate to an absolute path (e.g. the login screen) after sign-out. */
  redirect: (path: string) => void;
}

let platform: PlatformAdapter | null = null;

export function setPlatform(adapter: PlatformAdapter): void {
  platform = adapter;
}

export function getPlatform(): PlatformAdapter {
  if (!platform) {
    throw new Error(
      '[@easyeng/core] Platform adapter not set. Call setPlatform() during app startup.'
    );
  }
  return platform;
}
