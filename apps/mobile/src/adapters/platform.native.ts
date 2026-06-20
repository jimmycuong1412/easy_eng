import * as Linking from 'expo-linking';
import type { PlatformAdapter } from '@easyeng/core/adapters';

/**
 * Native PlatformAdapter.
 *
 * - getOrigin(): the app's deep-link scheme base (easyeng://) used to build
 *   OAuth / password-reset redirect targets that return to the app.
 * - clearAuthCookies(): no-op on native — the Supabase session lives in
 *   AsyncStorage and signOut() already cleared it (there are no cookies).
 * - redirect(): open an in-app route via deep link.
 */
export const nativePlatform: PlatformAdapter = {
  getOrigin: () => Linking.createURL('/').replace(/\/$/, ''),
  clearAuthCookies: () => {
    // no-op: native sessions are in AsyncStorage, not cookies
  },
  redirect: (path) => {
    Linking.openURL(Linking.createURL(path));
  },
};
