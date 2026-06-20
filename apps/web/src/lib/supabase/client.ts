import {
  createClient as coreCreateClient,
  getSupabaseClient as coreGetSupabaseClient,
} from '@easyeng/core';

// Importing the bootstrap registers the Supabase client factory (and the
// storage/platform adapters) with @easyeng/core. Every client component that
// touches Supabase imports this module, so the factory is always registered
// before core's createClient()/getSupabaseClient() run.
import '@/lib/core-bootstrap';

/**
 * Creates a Supabase client for use in Client Components (cookie storage).
 * Kept as a named export for the 80+ existing call sites; delegates to core.
 */
export function createClient() {
  return coreCreateClient();
}

/**
 * Singleton instance for client-side usage. Delegates to core.
 */
export function getSupabaseClient() {
  return coreGetSupabaseClient();
}
