/**
 * Registers all @easyeng/core platform adapters for the mobile (React Native)
 * app. Imported for its side effects at the top of the app entry (index.ts /
 * App.tsx) so core hooks/stores have their Supabase client, storage, and
 * platform adapters wired before first use.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  setSupabaseClientFactory,
  setStorage,
  setPlatform,
} from '@easyeng/core/adapters';

import { nativeStorage } from '../adapters/storage.native';
import { nativePlatform } from '../adapters/platform.native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

setSupabaseClientFactory(
  () =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL-based session detection on native (no browser redirect URL).
        detectSessionInUrl: false,
      },
    }) as unknown as SupabaseClient
);
setStorage(nativeStorage);
setPlatform(nativePlatform);
