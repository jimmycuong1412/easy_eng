'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  User,
  BookOpen,
  Plus,
  X,
  Settings,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Mock schedule data
const mockSchedule = {
  '2026-01-20': [
    {
      id: 'slot-1',
      time: '09:00',
      duration: 25,
      status: 'completed',
      student: { name: 'Trần Văn Nam', avatar: '', level: 'Intermediate' },
      topic: 'IELTS Speaking',
    },
    {
      id: 'slot-2',
      time: '10:00',
      duration: 25,
      status: 'completed',
      student: { name: 'Lê Thị Hoa', avatar: '', level: 'Advanced' },
      topic: 'Business English',
    },
  ],
  '2026-01-21': [
    {
      id: 'slot-3',
      time: '14:00',
      duration: 25,
      status: 'completed',
      student: { name: 'Nguyễn Hoàng Minh', avatar: '', level: 'Beginner' },
      topic: 'Grammar Review',
    },
  ],
  '2026-01-22': [],
  '2026-01-23': [
    {
      id: 'slot-4',
      time: '09:00',
      duration: 25,
      status: 'upcoming',
      student: { name: 'Trần Văn Nam', avatar: '', level: 'Intermediate' },
      topic: 'IELTS Speaking Part 1',
    },
    {
      id: 'slot-5',
      time: '10:00',
      duration: 25,
      status: 'upcoming',
      student: { name: 'Lê Thị Hoa', avatar: '', level: 'Advanced' },
      topic: 'Business Email Writing',
    },
    {
      id: 'slot-6',
      time: '14:00',
      duration: 25,
      status: 'upcoming',
      student: { name: 'Nguyễn Hoàng Minh', avatar: '', level: 'Beginner' },
      topic: 'Grammar: Tenses',
    },
  ],
  '2026-01-24': [
    {
      id: 'slot-7',
      time: '09:00',
      duration: 25,
      status: 'available',
      student: null,
      topic: null,
    },
    {
      id: 'slot-8',
      time: '11:00',
      duration: 25,
      status: 'available',
      student: null,
      topic: null,
    },
    {
      id: 'slot-9',
      time: '15:00',
      duration: 25,
      status: 'booked',
      student: { name: 'Phạm Thị Mai', avatar: '', level: 'Intermediate' },
      topic: 'Conversational English',
    },
  ],
  '2026-01-25': [
    {
      id: 'slot-10',
      time: '10:00',
      duration: 25,
      status: 'available',
      student: null,
      topic: null,
    },
    {
      id: 'slot-11',
      time: '14:00',
      duration: 25,
      status: 'available',
      student: null,
      topic: null,
    },
  ],
  '2026-01-26': [],
};

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

export default function TeacherSchedulePage() {
  const [currentWeekStart, setCurrentWeekStart] = React.useState(new Date('2026-01-20'));
  const [selectedSlot, setSelectedSlot] = React.useState<any>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = React.useState(false);
  const [availableSlots, setAvailableSlots] = React.useState<Record<string, boolean>>({});

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
    const daySchedule = mockSchedule[dateStr as keyof typeof mockSchedule] || [];
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
    const today = new Date('2026-01-23'); // Mock today
    return formatDate(date) === formatDate(today);
  };

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
            <p className="text-slate-400">Quản lý lịch trình và thời gian dạy của bạn</p>
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
          <DialogContent className="bg-[#0A1628] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                Cài đặt khung giờ dạy
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Chọn các khung giờ bạn có thể dạy trong tuần
              </p>

              <div className="space-y-3">
                {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(
                  (day, index) => (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <span className="text-white font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-slate-400 text-sm">
                          08:00 - 22:00
                        </Label>
                        <Switch defaultChecked={index < 5} />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="border-white/20 text-white"
                onClick={() => setShowAvailabilityDialog(false)}
              >
                Hủy
              </Button>
              <Button
                className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                onClick={() => setShowAvailabilityDialog(false)}
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
