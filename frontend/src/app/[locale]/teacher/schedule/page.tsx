'use client';

export const dynamic = 'force-dynamic';

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
import { usePreferences } from '@/hooks/usePreferences';
import { getTeacherSchedule } from '@/lib/queries';
import { formatTime, getTimezoneLabel } from '@/lib/timezone';
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

// 30-minute slot grid (00:00 – 23:30): each slot = 25 min teaching + 5 min rest
const timeSlots = (() => {
  const slots: string[] = [];
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 30) {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
})();

export default function TeacherSchedulePage() {
  // Single useAuth() call shared with usePreferences to avoid a second auth lock.
  const { user, profile, isLoading: authLoading, refetchProfile } = useAuth();
  const { preferences } = usePreferences({ profile, isLoading: authLoading, refetchProfile });
  const userTimezone = preferences?.timezone || 'Asia/Ho_Chi_Minh';
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(now.setDate(diff));
  });
  const [selectedSlot, setSelectedSlot] = React.useState<ScheduleSlot | null>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = React.useState(false);
  const [_availableSlots, _setAvailableSlots] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const data = await getTeacherSchedule(user.id) as Record<string, unknown>;
        const sessions = (data.sessions as Record<string, unknown>[]) || [];
        const availability = (data.availability as Record<string, unknown>[]) || [];

        const scheduleMap: ScheduleData = {};

        // Map sessions to schedule slots
        sessions.forEach((session) => {
          const startTime = new Date(session.scheduled_start_time as string);
          const dateKey = startTime.toISOString().split('T')[0];
          const timeStr = formatTime(startTime, userTimezone);
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
            student: null, // Session data does not include student info directly
            topic: (cls?.title as string) || null,
          });
        });

        // Map availability to available slots
        availability.forEach((avail) => {
          const dayOfWeek = avail.day_of_week as number;
          const startTimeStr = avail.start_time as string;

          // Generate dates for this availability within visible range
          const weekStart = new Date(currentWeekStart);
          for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            if (date.getDay() === dayOfWeek) {
              const dateKey = date.toISOString().split('T')[0];
              if (!scheduleMap[dateKey]) scheduleMap[dateKey] = [];
              // Only add if no session at this time
              const existingTimes = scheduleMap[dateKey].map(s => s.time);
              if (!existingTimes.includes(startTimeStr.slice(0, 5))) {
                scheduleMap[dateKey].push({
                  id: `avail-${avail.id}-${dateKey}`,
                  time: startTimeStr.slice(0, 5),
                  duration: 25,
                  status: 'available',
                  student: null,
                  topic: null,
                });
              }
            }
          }
        });

        setSchedule(scheduleMap);
      } catch (err) {
        console.error('Error fetching teacher schedule:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [user?.id, currentWeekStart]);

  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays(currentWeekStart);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
    });
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

  const isToday = (date: Date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
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
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Lịch dạy</h1>
            <p className="text-slate-400">
              Quản lý lịch trình và thời gian dạy của bạn
              {preferences && (
                <span className="ml-2 text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                  {getTimezoneLabel(userTimezone)}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setShowAvailabilityDialog(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt khung giờ
            </Button>
            <Button className="bg-[#3B82F6] hover:bg-[#3B82F6]/90">
              <Plus className="w-4 h-4 mr-2" />
              Thêm khung giờ
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
                  Tuần trước
                </Button>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#3B82F6]" />
                  <span className="text-white font-semibold">
                    {weekDays[0].toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}
                    {' - '}
                    {weekDays[6].toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextWeek}
                  className="text-slate-400 hover:text-white"
                >
                  Tuần sau
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left text-slate-400 font-medium w-20">Giờ</th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={`p-3 text-center font-medium ${
                          isToday(day) ? 'bg-[#3B82F6]/10' : ''
                        }`}
                      >
                        <span
                          className={isToday(day) ? 'text-[#3B82F6]' : 'text-slate-400'}
                        >
                          {formatDisplayDate(day)}
                        </span>
                        {isToday(day) && (
                          <Badge className="ml-2 bg-[#3B82F6] text-white border-0 text-xs">
                            Hôm nay
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="border-b border-white/5">
                      <td className="p-3 text-slate-400 text-sm font-medium">{time}</td>
                      {weekDays.map((day) => {
                        const slot = getSlotForTime(day, time);
                        return (
                          <td
                            key={`${day.toISOString()}-${time}`}
                            className={`p-2 ${isToday(day) ? 'bg-[#3B82F6]/5' : ''}`}
                          >
                            {slot ? (
                              <button
                                onClick={() => setSelectedSlot(slot)}
                                className={`w-full p-2 rounded-lg border text-left transition-all hover:scale-[1.02] ${getStatusColor(
                                  slot.status
                                )}`}
                              >
                                {slot.student ? (
                                  <div>
                                    <p className="text-xs font-medium truncate">
                                      {slot.topic}
                                    </p>
                                    <p className="text-xs opacity-70 truncate">
                                      {slot.student.name}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-8">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                )}
                              </button>
                            ) : (
                              <div className="h-12" />
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
            <span className="text-sm text-slate-400">Sắp tới</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/50" />
            <span className="text-sm text-slate-400">Đã đặt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50" />
            <span className="text-sm text-slate-400">Hoàn thành</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white/5 border border-dashed border-white/20" />
            <span className="text-sm text-slate-400">Còn trống</span>
          </div>
        </motion.div>

        {/* Slot Detail Dialog */}
        <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
          <DialogContent className="bg-[#0A1628] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                Chi tiết buổi học
              </DialogTitle>
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
                        <p className="font-semibold text-white">
                          {selectedSlot.student.name}
                        </p>
                        <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                          {selectedSlot.student.level}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-slate-400 text-sm mb-1">Chủ đề</p>
                      <p className="text-white font-medium">{selectedSlot.topic}</p>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 p-3 bg-white/5 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Thời gian</p>
                        <p className="text-white font-medium">{selectedSlot.time}</p>
                      </div>
                      <div className="flex-1 p-3 bg-white/5 rounded-lg">
                        <p className="text-slate-400 text-sm mb-1">Thời lượng</p>
                        <p className="text-white font-medium">{selectedSlot.duration} phút</p>
                      </div>
                    </div>

                    {selectedSlot.status === 'upcoming' && (
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-500/90">
                        <Video className="w-4 h-4 mr-2" />
                        Vào lớp
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-white font-medium mb-1">Khung giờ trống</p>
                    <p className="text-sm text-slate-400 mb-4">
                      Học viên có thể đặt lịch học vào khung giờ này
                    </p>
                    <Button variant="outline" className="border-red-500/50 text-red-400">
                      <X className="w-4 h-4 mr-2" />
                      Xóa khung giờ
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
              <DialogTitle className="text-white">
                Cài đặt khung giờ dạy
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-400 -mt-2 mb-2">
              Bật/tắt từng khung giờ 30 phút. Học viên chỉ thấy các slot đang bật.
            </p>
            <AvailabilityCalendar />
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={() => setShowAvailabilityDialog(false)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
