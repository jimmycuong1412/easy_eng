'use client';

import { useState, useTransition } from 'react';
import { useAuth } from './useAuth';
import {
  updateUserPreferences,
  type UpdatePreferencesInput,
} from '@/app/[locale]/settings/preferences/actions';
import type { Profile } from '@easyeng/types';

export interface UserPreferences {
  locale: string;
  timezone: string;
  currency: string;
}

export interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (input: UpdatePreferencesInput) => Promise<boolean>;
  isPending: boolean;
}

/**
 * Derives preferences from an already-loaded profile, avoiding a second
 * useAuth() instantiation (which would contend on the Supabase auth lock).
 *
 * Pass `opts` to reuse auth state from the calling component's useAuth() call.
 * Without opts, falls back to calling useAuth() internally (convenient but
 * may create a second auth lock on Vercel).
 */
export function usePreferences(opts?: {
  profile: Profile | null;
  isLoading: boolean;
  refetchProfile: () => Promise<void>;
}): UsePreferencesReturn {
  // Always call useAuth() unconditionally (Rules of Hooks), but only USE
  // its values when no opts are provided.
  const fallback = useAuth();
  const profile = opts ? opts.profile : fallback.profile;
  const isLoading = opts ? opts.isLoading : fallback.isLoading;
  const refetchProfile = opts ? opts.refetchProfile : fallback.refetchProfile;

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preferences: UserPreferences | null = profile
    ? {
        locale: profile.locale || 'vi',
        timezone: profile.timezone || 'Asia/Ho_Chi_Minh',
        currency: profile.currency || 'VND',
      }
    : null;

  const updatePreferences = async (
    input: UpdatePreferencesInput
  ): Promise<boolean> => {
    setError(null);

    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await updateUserPreferences(input);

        if (!result.success) {
          setError(result.error || 'Failed to update preferences');
          resolve(false);
        } else {
          // Fire profile refresh without awaiting it — the transition completes
          // immediately (clearing "Saving..." state) while the profile reloads
          // in the background to update in-memory locale/timezone.
          refetchProfile().catch(console.error);
          resolve(true);
        }
      });
    });
  };

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    isPending,
  };
}
