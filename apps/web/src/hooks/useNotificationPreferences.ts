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

    console.log('[useNotificationPreferences] Fetching for user:', user.id);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('settings')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[useNotificationPreferences] FETCH error:', error.message, error.code);
        } else if (data) {
          console.log('[useNotificationPreferences] Fetched settings:', data.settings);
          // Merge with defaults so new types always have a value
          setPreferences({ ...DEFAULT_PREFERENCES, ...(data.settings as NotificationPreferences) });
        } else {
          console.log('[useNotificationPreferences] No settings row found, using defaults.');
        }
      } catch (err) {
        console.error('[useNotificationPreferences] FETCH exception:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, supabase]);

  const updatePreference = useCallback(
    async (type: string, channel: NotificationChannel, value: boolean) => {
      if (!user?.id) {
        console.warn('[useNotificationPreferences] No user ID, blocking update.');
        return;
      }

      const previousPreferences = { ...preferences };
      const updated: NotificationPreferences = {
        ...preferences,
        [type]: {
          ...((preferences[type] as PreferenceEntry) ?? DEFAULT_PREFERENCES[type] ?? { in_app: true, email: false }),
          [channel]: value,
        },
      };

      // Optimistic update
      setPreferences(updated);

      try {
        console.log(`[useNotificationPreferences] Upserting preference for ${type}.${channel} -> ${value}`);
        const { error } = await supabase.from('notification_preferences').upsert(
          { user_id: user.id, settings: updated, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.error('[useNotificationPreferences] UPSERT error:', error.message, error.code);
          // Rollback on error
          setPreferences(previousPreferences);
        } else {
          console.log('[useNotificationPreferences] UPSERT successful.');
        }
      } catch (err) {
        console.error('[useNotificationPreferences] UPSERT exception:', err);
        setPreferences(previousPreferences);
      }
    },
    [user?.id, preferences, supabase]
  );

  return { preferences, loading, updatePreference };
}
