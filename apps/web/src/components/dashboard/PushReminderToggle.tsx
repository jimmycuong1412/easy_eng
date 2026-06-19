'use client';

/**
 * PushReminderToggle — opt-in to browser reminders ("Bật nhắc học").
 * Wraps setup/teardown from utils/pushNotifications (Growth 1.3).
 */

import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  isPushSupported,
  getNotificationPermission,
  setupPushNotifications,
  teardownPushNotifications,
  getCurrentPushSubscription,
} from '@/utils/pushNotifications';

export default function PushReminderToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isPushSupported()) return;
      setSupported(true);
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const sub = await getCurrentPushSubscription();
      setEnabled(!!sub && getNotificationPermission() === 'granted');
    })();
  }, []);

  const toggle = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await teardownPushNotifications(userId);
        setEnabled(false);
      } else {
        const res = await setupPushNotifications(userId);
        setEnabled(!!res.success);
        if (!res.success && res.error) console.warn('Push setup:', res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60"
      style={{
        background: enabled ? 'var(--et-coral)' : 'var(--et-bg-3)',
        color: enabled ? '#fff' : 'var(--et-fg-2)',
        border: '1px solid var(--et-line)',
      }}
      title={enabled ? 'Tắt nhắc học' : 'Bật nhắc học mỗi ngày'}
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {enabled ? 'Đang nhắc học' : 'Bật nhắc học'}
    </button>
  );
}
