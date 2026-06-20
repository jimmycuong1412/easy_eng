'use client';

/**
 * ClassReminderProvider
 *
 * Self-contained: reads auth, runs the class-join reminder hook, and renders
 * the popup. Drop into any layout (student dashboard, teacher area) to get the
 * app-wide "join your class" nudge without re-wiring the hook each place.
 */

import React from 'react';
import { useAuth } from '@easyeng/core';
import { useClassReminder } from '@easyeng/core';
import ClassReminderPopup from '@/components/class/ClassReminderPopup';

export default function ClassReminderProvider() {
  const { user, profile } = useAuth();
  const { reminder, dismiss } = useClassReminder({
    userId: user?.id,
    role: profile?.role,
  });
  return <ClassReminderPopup reminder={reminder} onDismiss={dismiss} />;
}
