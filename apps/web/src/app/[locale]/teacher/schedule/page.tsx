'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import Link from 'next/link';
import { Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { getTeacherSchedule } from '@/lib/queries';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatTime, getTimezoneLabel } from '@/lib/timezone';
import AvailabilityCalendar from '@/components/teacher/AvailabilityCalendar';

interface UpcomingClass {
  id: string;
  title: string;
  start_time: string;
  current_enrollments: number;
  max_students: number;
}

export default function TeacherSchedulePage() {
  const t = useTranslations('teacherSchedule');
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const { user, profile, isLoading: authLoading, refetchProfile } = useAuth();
  const { preferences } = usePreferences({ profile, isLoading: authLoading, refetchProfile });
  const userTimezone = preferences?.timezone || 'Asia/Ho_Chi_Minh';

  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);

  // Booked upcoming classes — the teacher starts a class from here
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async (attempt: number) => {
      try {
        const supabase = getSupabaseClient();
        const since = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // still joinable 30 min in
        const { data, error } = await (supabase as any)
          .from('classes')
          .select('id, title, start_time, current_enrollments, max_students')
          .eq('teacher_id', user.id)
          .in('status', ['scheduled', 'full'])
          .gt('current_enrollments', 0)
          .gte('start_time', since)
          .order('start_time', { ascending: true })
          .limit(10);
        if (error) throw error;
        if (!cancelled) setUpcomingClasses((data as UpcomingClass[]) ?? []);
      } catch (err) {
        if (!cancelled && attempt < 3) { setTimeout(() => load(attempt + 1), 1500 * (attempt + 1)); return; }
        console.error('Failed to load upcoming classes:', err);
      }
    };
    load(0);
    return () => { cancelled = true; };
  }, [user?.id]);

  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Compute this week's Monday (normalised to midnight) for prev-week guard
  const thisMonday = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);

  const isCurrentWeek = currentWeekStart.getTime() <= thisMonday.getTime();

  const weekDays = React.useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  // Fetch schedule and derive bookedSlots from confirmed/pending bookings
  useEffect(() => {
    if (!user?.id) return;

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const data = await getTeacherSchedule(user.id) as Record<string, unknown>;
        const sessions = (data.sessions as Record<string, unknown>[]) || [];

        // Derive bookedSlots: "dayOfWeek:HH:MM" keys from session start times
        const booked = new Set<string>();
        sessions.forEach((session) => {
          const startTime = new Date(session.scheduled_start_time as string);
          const status = session.status as string;
          if (status === 'cancelled') return;

          // Format the slot key matching AvailabilityCalendar convention
          const formatted = formatTime(startTime, userTimezone);
          const timeKey = formatted.slice(0, 5); // "HH:MM"
          const dayOfWeek = startTime.getDay();
          booked.add(`${dayOfWeek}:${timeKey}`);
        });

        setBookedSlots(booked);
      } catch (err) {
        console.error('Error fetching teacher schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [user?.id, currentWeekStart, userTimezone]);

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
          <p className="text-slate-400">
            {t('subtitle')}
            {preferences && (
              <span className="ml-2 text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                {getTimezoneLabel(userTimezone)}
              </span>
            )}
          </p>
        </motion.div>

        {/* Upcoming booked classes — start/join the live room from here */}
        {upcomingClasses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-lg font-semibold text-white">Lớp sắp tới</h2>
                {upcomingClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between gap-4 rounded-lg bg-white/5 border border-white/10 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{cls.title}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(cls.start_time).toLocaleString(dateLocale, {
                          weekday: 'short', day: 'numeric', month: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}{cls.current_enrollments}/{cls.max_students} học viên
                      </p>
                    </div>
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-600/90 shrink-0">
                      <Link href={`/${locale}/class/${cls.id}/live`}>
                        <Video className="w-4 h-4 mr-2" />
                        Vào lớp
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Week Navigation + Availability Calendar — single unified card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 border-white/10">
            {/* Week nav header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousWeek}
                disabled={isCurrentWeek}
                className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                {t('prevWeek')}
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#3B82F6]" />
                <span className="text-white font-semibold">
                  {weekDays[0].toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}
                  {' – '}
                  {weekDays[6].toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextWeek}
                className="text-slate-400 hover:text-white"
              >
                {t('nextWeek')}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Calendar grid */}
            <CardContent className="p-3 md:p-4">
              <AvailabilityCalendar
                bookedSlots={bookedSlots}
                weekStart={currentWeekStart}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
