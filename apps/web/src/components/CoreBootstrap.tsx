'use client';

/**
 * Registers @easyeng/core platform adapters (Supabase factory, storage,
 * platform) for the web app. The registration runs at module evaluation of this
 * `'use client'` module via the side-effect import below, and again defensively
 * in the component body, so the Supabase factory is set before descendant client
 * hooks (useAuth, etc.) call getSupabaseClient() — during SSR and on the client.
 *
 * Renders nothing.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  setSupabaseClientFactory,
  setStorage,
  setPlatform,
} from '@easyeng/core/adapters';

import { env } from '@/lib/env';
import { webStorage } from '@/adapters/storage.web';
import { webPlatform } from '@/adapters/platform.web';

function registerAdapters() {
  setSupabaseClientFactory(
    () =>
      createBrowserClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) as unknown as SupabaseClient
  );
  setStorage(webStorage);
  setPlatform(webPlatform);
}

// Run at module load (covers the SSR render pass for this client subtree).
registerAdapters();

export function CoreBootstrap() {
  // Run once more during render as a defensive guarantee on the client.
  registerAdapters();
  return null;
}
