/**
 * useNotificationPreferences hook
 *
 * Fetches and persists per-user notification preferences server-side
 * via the notification_preferences table (replaces localStorage toggles).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'in_app' | 'email';

export type PreferenceEntry = {
  in_app: boolean;
  email: boolean;
};

export type NotificationPreferences = Record<string, PreferenceEntry>;

// ============================================================================
// Defaults (used when no DB row exists yet)
// ============================================================================

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  booking_confirmed:   { in_app: true,  email: true  },
  booking_cancelled:   { in_app: true,  email: true  },
  class_reminder:      { in_app: true,  email: true  },
  slot_opened:         { in_app: true,  email: false },
  teacher_favorited:   { in_app: true,  email: false },
  gems_earned:         { in_app: true,  email: false },
  payment_received:    { in_app: true,  email: true  },
  booking_payment:     { in_app: true,  email: true  },
  system_announcement: { in_app: true,  email: false },
  new_booking:         { in_app: true,  email: true  },
};

// ============================================================================
// Hook
// ============================================================================

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  loading: boolean;
  updatePreference: (type: string, channel: NotificationChannel, value: boolean) => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  // Stabilize supabase client to prevent stale instances on re-render
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Fetch preferences from DB on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    supabase
      .from('notification_preferences')
      .select('settings')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[useNotificationPreferences] SELECT error:', error.message, error.code);
        }
        if (!error && data?.settings) {
          // Merge with defaults so new types always have a value
          setPreferences({ ...DEFAULT_PREFERENCES, ...(data.settings as NotificationPreferences) });
        }
        setLoading(false);
      });
  }, [user?.id, supabase]);

  const updatePreference = useCallback(
    async (type: string, channel: NotificationChannel, value: boolean) => {
      if (!user?.id) return;

      const updated: NotificationPreferences = {
        ...preferences,
        [type]: {
          ...((preferences[type] as PreferenceEntry) ?? DEFAULT_PREFERENCES[type] ?? { in_app: true, email: false }),
          [channel]: value,
        },
      };

      // Optimistic update
      setPreferences(updated);

      const { error } = await supabase.from('notification_preferences').upsert(
        { user_id: user.id, settings: updated, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('[useNotificationPreferences] UPSERT error:', error.message, error.code);
      }
    },
    [user?.id, preferences, supabase]
  );

  return { preferences, loading, updatePreference };
}
