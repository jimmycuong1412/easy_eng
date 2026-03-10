'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  Plus,
  X,
  Settings,
  Loader2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLocale, useTranslations } from 'next-intl';
import { getTeacherSchedule } from '@/lib/queries';
import AvailabilityCalendar from '@/components/teacher/AvailabilityCalendar';

interface ScheduleSlot {
  id: string;
  time: string;
  duration: number;
  status: string;
  student: { name: string; avatar: string; level: string } | null;
  topic: string | null;
}

type ScheduleData = Record<string, ScheduleSlot[]>;

// 25-minute class slots covering full 24 hours (00:00 to 23:35)
const timeSlots = (() => {
  const slots: string[] = [];
  let totalMinutes = 0; // 00:00
  while (totalMinutes < 24 * 60) {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    totalMinutes += 25;
  }
  return slots;
})();

export default function TeacherSchedulePage() {
  const { user, isLoading: authLoading } = useAuth();
  const t = useTranslations('teacherSchedule');
  const locale = useLocale();

  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const d = new Date(now);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = React.useState<ScheduleSlot | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = React.useState(false);

  // Return the subset of timeSlots that fall within [startTime, endTime)
  // Using timeSlots directly guarantees keys match the grid rows exactly.
  const expandAvailSlots = (startTime: string, endTime: string): string[] => {
    const startMins = parseInt(startTime.slice(0, 2)) * 60 + parseInt(startTime.slice(3, 5));
    const endMins   = parseInt(endTime.slice(0, 2))   * 60 + parseInt(endTime.slice(3, 5));
    return timeSlots.filter((slot) => {
      const slotMins = parseInt(slot.slice(0, 2)) * 60 + parseInt(slot.slice(3, 5));
      return slotMins >= startMins && slotMins + 25 <= endMins;
    });
  };

  const fetchSchedule = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await getTeacherSchedule(user.id);
      const sessions = data.sessions || [];
      const availability = data.availability || [];
      const disabledSlots = data.disabledSlots as Set<string>;

      const scheduleMap: ScheduleData = {};

      sessions.forEach((session: Record<string, unknown>) => {
        const startTime = new Date(session.scheduled_start_time as string);
        const dateKey = startTime.toISOString().split('T')[0];
        const timeStr = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const cls = session.classes as Record<string, unknown> | null;

        if (!scheduleMap[dateKey]) scheduleMap[dateKey] = [];

        const now = new Date();
        let status = 'upcoming';
        if (startTime < now) status = 'completed';
        if (session.status === 'cancelled') status = 'cancelled';

        scheduleMap[dateKey].push({
          id: session.id as string,
          time: timeStr,
          duration: (cls?.duration_minutes as number) || 25,
          status,
          student: null,
          topic: (cls?.title as string) || null,
        });
      });

      // Expand every availability row into individual 30-min slots
      availability.forEach((avail: Record<string, unknown>) => {
        const dayOfWeek = avail.day_of_week as number;
        const slotTimes = expandAvailSlots(avail.start_time as string, avail.end_time as string);

        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(currentWeekStart.getDate() + i);
          if (date.getDay() !== dayOfWeek) continue;

          const dateKey = date.toISOString().split('T')[0];
          if (!scheduleMap[dateKey]) scheduleMap[dateKey] = [];
          const existingTimes = new Set(scheduleMap[dateKey].map(s => s.time));

          slotTimes.forEach((slotTime) => {
            const disableKey = `${dayOfWeek}:${slotTime}`;
            if (disabledSlots?.has(disableKey)) return; // skip disabled overrides
            if (existingTimes.has(slotTime)) return;     // skip if session already there
            scheduleMap[dateKey].push({
              id: `avail-${avail.id}-${dateKey}-${slotTime}`,
              time: slotTime,
              duration: 25,
              status: 'available',
              student: null,
              topic: null,
            });
            existingTimes.add(slotTime);
          });
        }
      });

      setSchedule(scheduleMap);
    } catch (err) {
      console.error('Error fetching teacher schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentWeekStart]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Re-fetch when availability dialog closes (after saving settings)
  const prevDialogOpen = React.useRef(false);
  useEffect(() => {
    if (prevDialogOpen.current && !showAvailabilityDialog) {
      fetchSchedule();
    }
    prevDialogOpen.current = showAvailabilityDialog;
  }, [showAvailabilityDialog, fetchSchedule]);

  const getWeekDays = (startDate: Date) => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Day abbreviations from translations (index 0=Sun…6=Sat)
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  const formatDisplayDate = (date: Date) => {
    const dayKey = DAY_KEYS[date.getDay()];
    const dayLabel = t(`days.${dayKey}`);
    const dayNum = date.getDate();
    const month = date.getMonth() + 1;
    return `${dayLabel} ${dayNum}/${month}`;
  };

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

  const getSlotForTime = (date: Date, time: string) => {
    const dateStr = formatDate(date);
    const daySchedule = schedule[dateStr] || [];
    return daySchedule.find((slot) => slot.time === time);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      case 'upcoming':
        return 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6]';
      case 'booked':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
      case 'available':
        return 'bg-white/5 border-white/20 text-slate-400 border-dashed';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const isToday = (date: Date) => formatDate(date) === formatDate(new Date());

  const weekRangeLabel = () => {
    const fmt = (d: Date) =>
      d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: 'numeric',
        month: 'long',
      });
    const fmtEnd = (d: Date) =>
      d.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    return `${fmt(weekDays[0])} – ${fmtEnd(weekDays[6])}`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{t('title')}</h1>
            <p className="text-slate-400">{t('subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setShowAvailabilityDialog(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {t('settingsBtn')}
            </Button>
            <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90" onClick={() => setShowAvailabilityDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addSlotBtn')}
            </Button>
          </div>
        </motion.div>

        {/* Week Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousWeek}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {t('prevWeek')}
                </Button>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#3B82F6]" />
                  <span className="text-white font-semibold">{weekRangeLabel()}</span>
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

        {/* Schedule Grid — all 7 days (Mon–Sun) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-2 py-2 text-left text-slate-400 font-medium w-16">{t('timeCol')}</th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`px-2 py-2 text-center font-medium ${isToday(day) ? 'bg-[#3B82F6]/10' : ''}`}
                      >
                        <span className={isToday(day) ? 'text-[#3B82F6]' : 'text-slate-400'}>
                          {formatDisplayDate(day)}
                        </span>
                        {isToday(day) && (
                          <Badge className="ml-2 bg-[#3B82F6] text-white border-0 text-xs">
                            {t('today')}
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-b border-white/5 h-8">
                      <td className="px-2 py-0.5 text-slate-400 text-xs font-medium w-16 leading-none">{time}</td>
                      {weekDays.map((day) => {
                        const slot = getSlotForTime(day, time);
                        return (
                          <td
                            key={`${day.toISOString()}-${time}`}
                            className={`px-1 py-0.5 ${isToday(day) ? 'bg-[#3B82F6]/5' : ''}`}
                          >
                            {slot ? (
                              <button
                                onClick={() => setSelectedSlot(slot)}
                                className={`w-full px-1.5 py-0.5 rounded border text-left transition-all hover:scale-[1.02] ${getStatusColor(slot.status)}`}
                              >
                                {slot.student ? (
                                  <div>
                                    <p className="text-xs font-medium truncate leading-tight">{slot.topic}</p>
                                    <p className="text-xs opacity-70 truncate leading-tight">{slot.student.name}</p>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-5">
                                    <Plus className="w-3 h-3" />
                                  </div>
                                )}
                              </button>
                            ) : (
                              <div className="flex items-center justify-center h-7">
                                <Plus className="w-3 h-3 text-white/10" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#3B82F6]/20 border border-[#3B82F6]/50" />
            <span className="text-sm text-slate-400">{t('legend.upcoming')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/50" />
            <span className="text-sm text-slate-400">{t('legend.booked')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50" />
            <span className="text-sm text-slate-400">{t('legend.completed')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/5 border border-dashed border-white/20" />
            <span className="text-sm text-slate-400">{t('legend.available')}</span>
          </div>
        </motion.div>

        {/* Slot Detail Dialog */}
        <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
          <DialogContent className="bg-[#0A1628] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">{t('slotDetail.title')}</DialogTitle>
            </DialogHeader>
            {selectedSlot && (
              <div className="space-y-4">
                {selectedSlot.student ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-emerald-500/20 text-emerald-400">
                          {selectedSlot.student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{selectedSlot.student.name}</p>
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                          {selectedSlot.student.level}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">{t('slotDetail.topic')}</p>
                      <p className="text-white font-medium">{selectedSlot.topic}</p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 p-3 bg-white/5 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">{t('slotDetail.time')}</p>
                        <p className="text-white font-medium">{selectedSlot.time}</p>
                      </div>
                      <div className="flex-1 p-3 bg-white/5 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">{t('slotDetail.duration')}</p>
                        <p className="text-white font-medium">{selectedSlot.duration} {t('slotDetail.minutes')}</p>
                      </div>
                    </div>

                    {selectedSlot.status === 'upcoming' && (
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-500/90">
                        <Video className="w-4 h-4 mr-2" />
                        {t('slotDetail.joinClass')}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">{t('slotDetail.emptySlot')}</p>
                    <p className="text-sm text-slate-400 mb-4">{t('slotDetail.emptySlotDesc')}</p>
                    <Button variant="outline" className="border-red-500/50 text-red-400">
                      <X className="w-4 h-4 mr-2" />
                      {t('slotDetail.deleteSlot')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Availability Settings Dialog */}
        <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
          <DialogContent className="bg-[#0A1628] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{t('availSettings.title')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-400 -mt-2 mb-2">{t('availSettings.subtitle')}</p>
            <AvailabilityCalendar locale={locale} />
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={() => setShowAvailabilityDialog(false)}
              >
                {t('availSettings.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
