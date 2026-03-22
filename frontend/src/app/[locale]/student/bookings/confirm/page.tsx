'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GemImage } from '@/components/common/GemImage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { csrfFetch } from '@/lib/csrf';
import { useGemsBalance } from '@/hooks/useGemsBalance';

const GEMS_PER_SESSION = 200;

function formatDateViVN(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

export default function BookingConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const teacherId = searchParams.get('teacher') ?? '';
  const date      = searchParams.get('date') ?? '';
  const time      = searchParams.get('time') ?? '';

  const [teacherName, setTeacherName] = React.useState<string | null>(null);
  const [isBooking, setIsBooking]     = React.useState(false);
  const [error, setError]             = React.useState<string | null>(null);
  const [done, setDone]               = React.useState(false);
  const { balance: gemsBalance }      = useGemsBalance();

  // Fetch teacher name
  React.useEffect(() => {
    if (!teacherId) return;
    getSupabaseClient()
      .from('profiles')
      .select('full_name')
      .eq('id', teacherId)
      .single()
      .then(({ data }) => setTeacherName((data as { full_name: string } | null)?.full_name ?? 'Teacher'));
  }, [teacherId]);

  const handleConfirm = async () => {
    setIsBooking(true);
    setError(null);
    try {
      const res = await csrfFetch('/api/bookings/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, date, time }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Booking failed');
      }
      setDone(true);
      setTimeout(() => router.push('/student/bookings'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
      setIsBooking(false);
    }
  };

  const hasEnoughGems = gemsBalance >= GEMS_PER_SESSION;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-success" />
        <h2 className="text-2xl font-bold text-text-primary">Đặt lịch thành công!</h2>
        <p className="text-text-muted">Đang chuyển đến trang lịch học...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto py-10 px-4 space-y-6"
    >
      <h1 className="text-2xl font-bold text-text-primary">Xác nhận đặt lịch</h1>

      <Card>
        <CardHeader><CardTitle>Chi tiết buổi học</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Giáo viên</p>
              <p className="font-semibold text-text-primary">
                {teacherName ?? <span className="text-text-muted">Đang tải...</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Ngày học</p>
              <p className="font-semibold text-text-primary">{date ? formatDateViVN(date) : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Giờ học (25 phút)</p>
              <p className="font-semibold text-text-primary">
                {time} – {time ? addMinutes(time, 25) : '—'}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border-default flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Chi phí</p>
              <div className="flex items-center gap-2 text-2xl font-bold text-accent-gem">
                {GEMS_PER_SESSION} <GemImage size={24} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Số dư của bạn</p>
              <div className="flex items-center gap-1 text-sm font-medium text-text-primary">
                {gemsBalance} <GemImage size={14} />
              </div>
            </div>
          </div>

          {!hasEnoughGems && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              Bạn không đủ gems. Cần {GEMS_PER_SESSION} gems, hiện có {gemsBalance}.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => router.back()} disabled={isBooking}>
          Quay lại
        </Button>
        <Button
          className="flex-1"
          onClick={handleConfirm}
          disabled={isBooking || !hasEnoughGems || !teacherId || !date || !time}
        >
          {isBooking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang đặt...</>
          ) : (
            'Xác nhận & Đặt lịch'
          )}
        </Button>
      </div>
    </motion.div>
  );
}
