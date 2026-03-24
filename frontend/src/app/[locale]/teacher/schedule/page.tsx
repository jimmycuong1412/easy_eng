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

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { getTeacherSchedule } from '@/lib/queries';
import { formatTime, getTimezoneLabel } from '@/lib/timezone';
import AvailabilityCalendar from '@/components/teacher/AvailabilityCalendar';

export default function TeacherSchedulePage() {
  const t = useTranslations('teacherSchedule');
  const locale = useLocale();
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const { user, profile, isLoading: authLoading, refetchProfile } = useAuth();
  const { preferences } = usePreferences({ profile, isLoading: authLoading, refetchProfile });
  const userTimezone = preferences?.timezone || 'Asia/Ho_Chi_Minh';

  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

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
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
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

        {/* Week Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Inline Availability Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 md:p-6">
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
