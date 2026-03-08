'use client';

import { useState, useTransition } from 'react';
import { useAuth } from './useAuth';
import {
  updateUserPreferences,
  type UpdatePreferencesInput,
} from '@/app/[locale]/settings/preferences/actions';

export interface UserPreferences {
  locale: string;
  timezone: string;
  currency: string; // UI-only, not persisted to DB
}

export interface UsePreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (input: UpdatePreferencesInput) => Promise<boolean>;
  isPending: boolean;
}

export function usePreferences(): UsePreferencesReturn {
  const { profile, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preferences: UserPreferences | null = profile
    ? {
        locale: profile.locale || 'vi',
        timezone: profile.timezone || 'Asia/Ho_Chi_Minh',
        currency: 'VND',
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
          resolve(true);
        }
      });
    });
  };

  return {
    preferences,
    isLoading: authLoading,
    error,
    updatePreferences,
    isPending,
  };
}
