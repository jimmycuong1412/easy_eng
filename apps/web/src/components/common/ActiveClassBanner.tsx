'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Video, Wifi } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface ActiveClass {
  classId: string;
  title: string;
}

interface ActiveClassBannerProps {
  userId?: string;
  role: 'student' | 'teacher';
}

/**
 * Shows a prominent "Rejoin Class" banner when the user has an ongoing live class.
 * Polls every 30 seconds to detect newly-started sessions.
 */
export function ActiveClassBanner({ userId: userIdProp, role }: ActiveClassBannerProps) {
  const router = useRouter();
  const [activeClass, setActiveClass] = React.useState<ActiveClass | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [resolvedUserId, setResolvedUserId] = React.useState<string | null>(userIdProp ?? null);

  // Resolve userId from Supabase session if not provided via props
  React.useEffect(() => {
    if (userIdProp) { setResolvedUserId(userIdProp); return; }
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.id) setResolvedUserId(data.user.id);
    });
  }, [userIdProp]);

  const checkActiveClass = React.useCallback(async () => {
    const userId = resolvedUserId;
    if (!userId) return;
    const supabase = createClient();

    if (role === 'teacher') {
      // Teacher: look for a live or waiting session they are teaching
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('class_sessions')
        .select('id, class_id, status, classes(title)')
        .eq('teacher_id', userId)
        .in('status', ['in_progress', 'scheduled'])
        .gte('scheduled_start_time', twoHoursAgo)
        .order('scheduled_start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const cls = data.classes as { title?: string } | null;
        setActiveClass({
          classId: data.class_id,
          title: cls?.title || 'Lớp học',
        });
      } else {
        setActiveClass(null);
      }
    } else {
      // Student: look for a confirmed booking whose class is currently live
      // Window: started up to 30 min ago and ends up to 25 min from now
      const { data } = await supabase
        .from('bookings')
        .select('id, class_id, classes(id, title, start_time, end_time)')
        .eq('user_id', userId)
        .in('status', ['confirmed', 'attended'])
        .limit(20);

      if (data && data.length > 0) {
        // Find a class that is currently in progress
        // Parse dates properly — Supabase returns "2026-03-02 17:23:03+00" (space-separated)
        const now = Date.now();
        const windowStartMs = now - 30 * 60 * 1000;
        const windowEndMs = now + 25 * 60 * 1000;
        const live = data.find((b) => {
          const cls = b.classes as { id?: string; title?: string; start_time?: string; end_time?: string } | null;
          if (!cls?.start_time) return false;
          const startMs = new Date(cls.start_time).getTime();
          const endMs = cls.end_time ? new Date(cls.end_time).getTime() : windowEndMs;
          return startMs >= windowStartMs && startMs <= windowEndMs && endMs >= now;
        });

        if (live) {
          const cls = live.classes as { id?: string; title?: string } | null;
          setActiveClass({
            classId: live.class_id,
            title: cls?.title || 'Lớp học',
          });
        } else {
          setActiveClass(null);
        }
      } else {
        setActiveClass(null);
      }
    }
  }, [resolvedUserId, role]);

  React.useEffect(() => {
    checkActiveClass();
    // Poll every 30 seconds
    const interval = setInterval(checkActiveClass, 30_000);
    return () => clearInterval(interval);
  }, [checkActiveClass]);

  // Reset dismissed state when a new active class appears
  React.useEffect(() => {
    if (activeClass) setDismissed(false);
  }, [activeClass?.classId]);

  if (!activeClass || dismissed) return null;

  return (
    <div className="relative flex items-center justify-between gap-4 rounded-xl border border-blue-500/50 bg-blue-500/10 px-4 py-3 shadow-lg animate-pulse-slow">
      {/* Pulsing live indicator */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
        </span>
        <div>
          <p className="font-semibold text-blue-100 text-sm leading-tight">
            Lớp học đang diễn ra
          </p>
          <p className="text-blue-300 text-xs">
            {activeClass.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
          onClick={() => router.push(`/class/${activeClass.classId}/live`)}
        >
          <Wifi className="w-3.5 h-3.5" />
          Kết nối lại
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-200 text-lg leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Video icon decoration */}
      <Video className="absolute right-24 top-1/2 -translate-y-1/2 w-16 h-16 text-blue-500/10 pointer-events-none" />
    </div>
  );
}
