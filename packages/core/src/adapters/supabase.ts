/**
 * Supabase client injection.
 *
 * Core hooks/stores must NOT import a platform-specific Supabase client:
 * - web uses `createBrowserClient` from `@supabase/ssr` (cookie storage)
 * - mobile uses `createClient` from `@supabase/supabase-js` (AsyncStorage)
 *
 * Each app registers a factory ONCE at startup via `setSupabaseClientFactory`.
 * Core then exposes `createClient()` / `getSupabaseClient()` with the same
 * call-site shape the web code already used, so hook bodies stay unchanged.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseClientFactory = () => SupabaseClient;

let factory: SupabaseClientFactory | null = null;
let singleton: SupabaseClient | null = null;

/**
 * Register the platform's Supabase client factory. Call once during app
 * bootstrap, before any core hook/store runs.
 */
export function setSupabaseClientFactory(fn: SupabaseClientFactory): void {
  factory = fn;
  // Reset the memoized singleton so a re-registration takes effect.
  singleton = null;
}

/**
 * Create a fresh Supabase client. Mirrors the previous web `createClient()`.
 */
export function createClient(): SupabaseClient {
  if (!factory) {
    throw new Error(
      '[@easyeng/core] Supabase client factory not set. Call setSupabaseClientFactory() during app startup.'
    );
  }
  return factory();
}

/**
 * Get a memoized singleton Supabase client. Mirrors the previous web
 * `getSupabaseClient()`.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!singleton) {
    singleton = createClient();
  }
  return singleton;
}
