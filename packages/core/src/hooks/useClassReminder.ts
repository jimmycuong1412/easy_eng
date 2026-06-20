'use client';
/**
 * useClassReminder
 *
 * Polls the current user's upcoming classes (student: confirmed bookings;
 * teacher: their booked classes) and surfaces a single reminder when:
 *   - a class starts within the next 5 minutes ("starting_soon"), or
 *   - a class is already live and the other party is waiting ("live_waiting").
 *
 * The hook is role-aware and de-duplicates: once a reminder for a class is
 * dismissed it won't reappear for that class in the same session.
 */


import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabaseClient } from '../adapters/supabase';

export type ReminderKind = 'starting_soon' | 'live_waiting';

export interface ClassReminder {
  classId: string;
  title: string;
  startTime: string;
  minutesUntilStart: number;
  kind: ReminderKind;
}

interface Options {
  userId: string | null | undefined;
  role: 'student' | 'teacher' | 'admin' | 'parent' | null | undefined;
  enabled?: boolean;
  pollMs?: number;
}

const REMIND_WINDOW_MIN = 5; // remind once class is ≤5 min away
const JOIN_GRACE_MIN = 15; // class is still joinable up to 15 min after start

export function useClassReminder({ userId, role, enabled = true, pollMs = 30000 }: Options) {
  const [reminder, setReminder] = useState<ClassReminder | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  const dismiss = useCallback((classId: string) => {
    dismissedRef.current.add(classId);
    setReminder((cur) => (cur?.classId === classId ? null : cur));
  }, []);

  const check = useCallback(async () => {
    if (!userId || !role || (role !== 'student' && role !== 'teacher')) return;
    const supabase = getSupabaseClient() as any;
    const now = Date.now();
    const windowStart = new Date(now - JOIN_GRACE_MIN * 60_000).toISOString();
    const windowEnd = new Date(now + REMIND_WINDOW_MIN * 60_000).toISOString();

    // Collect candidate classes starting within [-15min, +5min]
    let classes: { id: string; title: string; start_time: string }[] = [];

    if (role === 'student') {
      const { data } = await supabase
        .from('bookings')
        .select('class_id, status, classes(id, title, start_time)')
        .eq('user_id', userId)
        .eq('status', 'confirmed');
      classes = (data ?? [])
        .map((b: any) => b.classes)
        .filter((c: any) => c && c.start_time >= windowStart && c.start_time <= windowEnd);
    } else {
      const { data } = await supabase
        .from('classes')
        .select('id, title, start_time, current_enrollments, status')
        .eq('teacher_id', userId)
        .in('status', ['scheduled', 'full'])
        .gt('current_enrollments', 0)
        .gte('start_time', windowStart)
        .lte('start_time', windowEnd);
      classes = data ?? [];
    }

    if (classes.length === 0) {
      setReminder((cur) => (cur ? null : cur)); // clear stale reminder
      return;
    }

    // Pick the soonest non-dismissed class
    const sorted = classes
      .filter((c) => !dismissedRef.current.has(c.id))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (sorted.length === 0) return;
    const cls = sorted[0];

    const startMs = new Date(cls.start_time).getTime();
    const minutesUntilStart = Math.round((startMs - now) / 60_000);
    const hasStarted = startMs <= now;

    // Is there a live session with the other party already waiting?
    let liveWaiting = false;
    if (hasStarted) {
      const { data: sess } = await supabase
        .from('class_sessions')
        .select('id, status')
        .eq('class_id', cls.id)
        .maybeSingle();
      // session exists → someone opened the room; surface as "live_waiting"
      liveWaiting = !!sess && ['scheduled', 'waiting', 'live'].includes(sess.status);
    }

    setReminder({
      classId: cls.id,
      title: cls.title,
      startTime: cls.start_time,
      minutesUntilStart,
      kind: liveWaiting ? 'live_waiting' : 'starting_soon',
    });
  }, [userId, role]);

  useEffect(() => {
    if (!enabled || !userId) return;
    check();
    const interval = setInterval(check, pollMs);
    return () => clearInterval(interval);
  }, [enabled, userId, check, pollMs]);

  return { reminder, dismiss };
}
