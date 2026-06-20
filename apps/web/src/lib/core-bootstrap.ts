/**
 * Registers all @easyeng/core platform adapters for the web app.
 *
 * Imported for its side effects from BOTH:
 *  - the web Supabase client module (@/lib/supabase/client), and
 *  - the root layout,
 * so the Supabase factory / storage / platform adapters are registered before
 * any core hook or store runs — on the server (SSR) and the client. Registration
 * is idempotent, so importing from multiple entry points is safe.
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

setSupabaseClientFactory(
  () =>
    createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) as unknown as SupabaseClient
);
setStorage(webStorage);
setPlatform(webPlatform);
