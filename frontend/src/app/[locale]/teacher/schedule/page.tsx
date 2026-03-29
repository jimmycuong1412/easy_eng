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
  Loader2,
  Settings,
  Save,
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
import { useScheduleDraft } from '@/hooks/useScheduleDraft';
import { useSlotSelection, type CellCoord } from '@/hooks/useSlotSelection';

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

// Extract day-of-week from a slot id
// Formats: "avail-{uuid}-{YYYY-MM-DD}-{HH:MM}" or "new-{YYYY-MM-DD}-{HH:MM}"
function dayOfWeekFromSlotId(slotId: string, slotTime: string): number {
  const withoutTime = slotId.slice(0, slotId.length - slotTime.length - 1);
  const dateKey = withoutTime.slice(withoutTime.length - 10); // YYYY-MM-DD
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Compact slot visual — dots for availability, bars for bookings
function CompactSlotContent({ status }: { status: string }) {
  if (status === 'available') return <span className="block w-1.5 h-1.5 rounded-full bg-white/40 mx-auto" />;
  if (status === 'disabled') return <span className="block w-1.5 h-1.5 rounded-full bg-red-500/50 mx-auto" />;
  if (status === 'upcoming' || status === 'booked') return <span className="block w-full h-1.5 rounded-sm bg-[#3B82F6]/70" />;
  if (status === 'completed') return <span className="block w-full h-1.5 rounded-sm bg-emerald-500/70" />;
  return null;
}

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

  const { draft, isDirty, saving, saveError, toggleDraft, saveDraft, discardDraft } = useScheduleDraft();
  const { selected, isDragging, isSelected, selectionCount, startSelect, extendSelect, endSelect, shiftSelect, clearSelection } = useSlotSelection();

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

      const localDateKey = (d: Date) => {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${dy}`;
      };

      sessions.forEach((session: Record<string, unknown>) => {
        const startTime = new Date(session.scheduled_start_time as string);
        const dateKey = localDateKey(startTime);
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

      // Expand every availability row into individual 25-min slots
      availability.forEach((avail: Record<string, unknown>) => {
        const dayOfWeek = avail.day_of_week as number;
        const slotTimes = expandAvailSlots(avail.start_time as string, avail.end_time as string);

        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(currentWeekStart.getDate() + i);
          if (date.getDay() !== dayOfWeek) continue;

          const dateKey = localDateKey(date);
          if (!scheduleMap[dateKey]) scheduleMap[dateKey] = [];
          const existingTimes = new Set(scheduleMap[dateKey].map(s => s.time));

          slotTimes.forEach((slotTime) => {
            const disableKey = `${dayOfWeek}:${slotTime}`;
            const isDisabled = disabledSlots?.has(disableKey);
            if (existingTimes.has(slotTime)) return; // skip if session already there
            scheduleMap[dateKey].push({
              id: `avail-${avail.id}-${dateKey}-${slotTime}`,
              time: slotTime,
              duration: 25,
              status: isDisabled ? 'disabled' : 'available',
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

  // Guard against accidental hard navigation when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // End drag-select on pointer release anywhere in the document
  useEffect(() => {
    document.addEventListener('pointerup', endSelect);
    return () => document.removeEventListener('pointerup', endSelect);
  }, [endSelect]);

  // Merge draft overrides on top of the persisted slot status for optimistic rendering
  const getEffectiveStatus = (slot: ScheduleSlot, dayOfWeek: number): string => {
    const key = `${dayOfWeek}:${slot.time}`;
    if (key in draft) return draft[key] ? 'available' : 'disabled';
    return slot.status;
  };

  // All grid cells as CellCoord — used for rectangle selection computation
  const allCells = React.useMemo<CellCoord[]>(() => {
    return timeSlots.flatMap((time, rowIdx) =>
      weekDays.map((day, colIdx) => ({
        dateKey: formatDate(day),
        time,
        rowIdx,
        colIdx,
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays]);

  // Stats derived from persisted schedule (no extra DB query)
  const stats = React.useMemo(() => {
    const slots = Object.values(schedule).flat();
    return {
      total: slots.length,
      available: slots.filter(s => s.status === 'available').length,
      booked: slots.filter(s => s.status === 'upcoming' || s.status === 'booked').length,
      disabled: slots.filter(s => s.status === 'disabled').length,
    };
  }, [schedule]);

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

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

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
      case 'disabled':
        return 'bg-red-500/5 border-red-500/20 text-red-400/50 border-dashed';
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
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {([
            { label: t('stats.total'),     value: stats.total,     color: 'text-white' },
            { label: t('stats.available'), value: stats.available, color: 'text-emerald-400' },
            { label: t('stats.booked'),    value: stats.booked,    color: 'text-[#3B82F6]' },
            { label: t('stats.disabled'),  value: stats.disabled,  color: 'text-red-400' },
          ] as const).map(({ label, value, color }) => (
            <Card key={label} className="bg-white/5 border-white/10">
              <CardContent className="p-2 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Unsaved changes banner */}
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5"
          >
            <span className="text-sm text-amber-300">{t('saveBar.unsavedChanges')}</span>
            {saveError && <span className="text-xs text-red-400">{saveError}</span>}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={discardDraft}
                disabled={saving}
                className="text-slate-400 hover:text-white"
              >
                {t('saveBar.discard')}
              </Button>
              <Button
                size="sm"
                onClick={() => user?.id && saveDraft(user.id)}
                disabled={saving}
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
              >
                {saving ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('saveBar.saving')}</>
                ) : (
                  <><Save className="mr-1.5 h-3.5 w-3.5" />{t('saveBar.save')}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

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
              <table
                className={`w-full min-w-[900px]${isDragging ? ' select-none' : ''}`}
                style={isDragging ? { touchAction: 'none' } : undefined}
              >
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-1 py-1.5 text-left text-slate-400 font-medium w-14 text-[10px]">{t('timeCol')}</th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`w-[12.5%] px-2 py-1.5 text-center font-medium ${isToday(day) ? 'bg-[#3B82F6]/10' : ''}`}
                      >
                        <span className={isToday(day) ? 'text-[#3B82F6]' : 'text-slate-400'}>
                          {formatDisplayDate(day)}
                        </span>
                        {isToday(day) && (
                          <Badge className="block mx-auto mt-0.5 w-fit bg-[#3B82F6] text-white border-0 text-xs">
                            {t('today')}
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time, rowIdx) => (
                    <tr key={time} className="border-b border-white/5 h-5">
                      <td className="px-1 py-0 text-slate-400 text-[10px] font-medium w-14 leading-none">{time}</td>
                      {weekDays.map((day, colIdx) => {
                        const dateKey = formatDate(day);
                        const slot = getSlotForTime(day, time);
                        const effectiveStatus = slot ? getEffectiveStatus(slot, day.getDay()) : null;
                        const cellSelected = isSelected(dateKey, time);
                        return (
                          <td
                            key={`${day.toISOString()}-${time}`}
                            className={`px-0.5 py-0 ${isToday(day) ? 'bg-[#3B82F6]/5' : ''}`}
                            onPointerDown={(e) => {
                              if (e.shiftKey) return;
                              e.preventDefault();
                              startSelect({ dateKey, time, rowIdx, colIdx });
                            }}
                            onPointerEnter={() => {
                              if (isDragging) extendSelect({ dateKey, time, rowIdx, colIdx });
                            }}
                          >
                            {slot ? (
                              <button
                                onClick={(e) => {
                                  if (e.shiftKey) {
                                    shiftSelect({ dateKey, time, rowIdx, colIdx }, allCells);
                                    return;
                                  }
                                  if (selectionCount > 0) {
                                    // In selection mode: clicking resets to single selection on this cell
                                    startSelect({ dateKey, time, rowIdx, colIdx });
                                    return;
                                  }
                                  setSelectedSlot(slot);
                                }}
                                className={`w-full h-3.5 rounded border text-left transition-all hover:opacity-80 ${getStatusColor(effectiveStatus!)}${cellSelected ? ' ring-2 ring-white/60 ring-offset-1 ring-offset-[#0A1628]' : ''}`}
                              >
                                <CompactSlotContent status={effectiveStatus!} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (selectionCount > 0) { clearSelection(); return; }
                                  setSelectedSlot({ id: `new-${dateKey}-${time}`, time, duration: 25, status: 'empty', student: null, topic: null });
                                }}
                                className={`w-full h-3.5 rounded border border-white/10 hover:border-white/30 transition-all${cellSelected ? ' ring-2 ring-white/60 ring-offset-1 ring-offset-[#0A1628]' : ''}`}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Batch Action Bar — shown when cells are selected */}
            {selectionCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-white/10 bg-white/5"
              >
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t('batchAction.clear')}
                </button>
                <span className="text-xs text-slate-400">
                  {t(selectionCount === 1 ? 'batchAction.label' : 'batchAction.label_plural', { count: selectionCount })}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      selected.forEach((key) => {
                        const dk = key.slice(0, 10);
                        const tm = key.slice(11);
                        const dow = new Date(dk).getDay();
                        const s = getSlotForTime(weekDays.find(d => formatDate(d) === dk)!, tm);
                        if (s && ['available', 'disabled'].includes(getEffectiveStatus(s, dow))) {
                          toggleDraft(dow, tm, false);
                        }
                      });
                      clearSelection();
                    }}
                  >
                    {t('batchAction.disableSelected')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                    onClick={() => {
                      selected.forEach((key) => {
                        const dk = key.slice(0, 10);
                        const tm = key.slice(11);
                        const dow = new Date(dk).getDay();
                        const s = getSlotForTime(weekDays.find(d => formatDate(d) === dk)!, tm);
                        if (s && ['available', 'disabled'].includes(getEffectiveStatus(s, dow))) {
                          toggleDraft(dow, tm, true);
                        }
                      });
                      clearSelection();
                    }}
                  >
                    {t('batchAction.enableSelected')}
                  </Button>
                </div>
              </motion.div>
            )}
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/5 border border-dashed border-red-500/20" />
            <span className="text-sm text-slate-400">{t('legend.disabled')}</span>
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
                    {(() => {
                      const effectiveStatus = getEffectiveStatus(selectedSlot, dayOfWeekFromSlotId(selectedSlot.id, selectedSlot.time));
                      if (effectiveStatus === 'available') {
                        return (
                          <>
                            <p className="text-white font-medium mb-1">Available Slot</p>
                            <p className="text-sm text-slate-400 mb-4">{selectedSlot.time} · {selectedSlot.duration} min · Students can book</p>
                            <Button
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                              onClick={() => {
                                const dow = dayOfWeekFromSlotId(selectedSlot.id, selectedSlot.time);
                                toggleDraft(dow, selectedSlot.time, false);
                                setSelectedSlot(null);
                              }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Disable Slot
                            </Button>
                          </>
                        );
                      }
                      if (effectiveStatus === 'disabled') {
                        return (
                          <>
                            <p className="text-white font-medium mb-1">Disabled Slot</p>
                            <p className="text-sm text-slate-400 mb-4">{selectedSlot.time} · Hidden from students</p>
                            <Button
                              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                              onClick={() => {
                                const dow = dayOfWeekFromSlotId(selectedSlot.id, selectedSlot.time);
                                toggleDraft(dow, selectedSlot.time, true);
                                setSelectedSlot(null);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Enable Slot
                            </Button>
                          </>
                        );
                      }
                      return (
                        <>
                          <p className="text-white font-medium mb-1">Empty Slot</p>
                          <p className="text-sm text-slate-400 mb-3">{selectedSlot.time} · Outside your availability hours</p>
                          <button
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            onClick={() => { setSelectedSlot(null); setShowAvailabilityDialog(true); }}
                          >
                            <Settings className="w-3 h-3" />
                            {t('settingsHint')}
                          </button>
                        </>
                      );
                    })()}
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
            <AvailabilityCalendar
              locale={locale}
              onSaved={() => {
                setShowAvailabilityDialog(false);
                fetchSchedule();
              }}
            />
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
