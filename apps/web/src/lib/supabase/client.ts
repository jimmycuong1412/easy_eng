import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * Creates a Supabase client for use in Client Components.
 * This client is configured with the browser's cookie storage.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Singleton instance for client-side usage.
 * Use this in components that need a persistent client.
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
