'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { Link } from '@/i18n/routing';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';

import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PixelAvatar } from '@/components/features/PixelAvatar';
import { GemImage } from '@/components/common/GemImage';
import { getTeacherById } from '@/lib/queries';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailabilityEntry = { day: string; dayOfWeek: number; slots: string[] };

// Key format "YYYY-MM-DD:HH:mm" — inverse of the booking timestamp
// `${date}T${time}:00+07:00`, so lookups always match what book-slot stores.
function bookedSlotKey(startTimeIso: string): string {
  const shifted = new Date(new Date(startTimeIso).getTime() + 7 * 3600 * 1000);
  const iso = shifted.toISOString();
  return `${iso.split('T')[0]}:${iso.slice(11, 16)}`;
}

type TeacherData = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  specializations: string[];
  languages: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalClasses: number;
  totalStudents: number;
  isOnline: boolean;
  isVerified: boolean;
  responseTime: string;
  memberSince: string;
  education: Array<{ degree: string; school: string; year: string }>;
  certifications: string[];
  availability: AvailabilityEntry[];
  bookedSlots: string[];
  reviews: Array<{ id: string; studentName: string; rating: number; comment: string; date: string }>;
  ratingBreakdown: Record<number, number>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_NAMES_FULL  = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
// Display order: Mon(1)…Sat(6), Sun(0)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// ─── Helper: get the Monday of the week containing `date` ────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

function isToday(date: Date): boolean {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() &&
    date.getMonth() === t.getMonth() &&
    date.getDate() === t.getDate();
}

function isPast(date: Date): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return date < t;
}

// Returns true if the slot time has already passed on the given date.
// For past dates this is always true; for today it compares current time.
function isSlotPast(date: Date, time: string): boolean {
  if (isPast(date)) return true;
  if (!isToday(date)) return false;
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

// ─── WeeklyCalendar ───────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  availability: AvailabilityEntry[];
  bookedSlots: Set<string>; // "YYYY-MM-DD:HH:mm" keys of already-booked slots
  selectedDate: string | null; // "dayOfWeek:YYYY-MM-DD"
  selectedTime: string | null;
  onSelect: (dateKey: string, time: string) => void;
}

function WeeklyCalendar({ availability, bookedSlots, selectedDate, selectedTime, onSelect }: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = React.useState<Date>(() => getMondayOf(new Date()));

  // Build availability map: dayOfWeek -> slots[]
  const availMap: Record<number, string[]> = {};
  availability.forEach(({ dayOfWeek, slots }) => {
    availMap[dayOfWeek] = slots;
  });

  // Collect all unique slot times across all days, sorted
  const allTimes = Array.from(
    new Set(Object.values(availMap).flat())
  ).sort();

  // The 7 dates for the current week (Mon…Sun)
  const weekDates = WEEK_ORDER.map((_, i) => addDays(weekStart, i));
  // weekDates[0]=Mon, weekDates[6]=Sun; day-of-week for each:
  const weekDayOfWeek = weekDates.map((d) => d.getDay()); // 1,2,3,4,5,6,0

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));

  const todayWeekStart = getMondayOf(new Date());
  const isCurrentWeek = weekStart.toDateString() === todayWeekStart.toDateString();

  if (allTimes.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        Giáo viên chưa mở lịch dạy
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevWeek}
          disabled={isCurrentWeek}
          className="text-text-secondary"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Tuần trước
        </Button>
        <span className="text-sm font-medium text-text-primary">
          {fmtDate(weekDates[0])} – {fmtDate(weekDates[6])}
        </span>
        <Button variant="ghost" size="sm" onClick={nextWeek} className="text-text-secondary">
          Tuần sau
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="bg-bg-elevated">
              {/* Time label column */}
              <th className="w-14 p-2 text-center text-text-muted font-normal border-b border-border-default" />
              {weekDates.map((date, i) => {
                const dow = weekDayOfWeek[i];
                const hasSlots = (availMap[dow] ?? []).length > 0;
                return (
                  <th
                    key={i}
                    className={`p-2 text-center font-medium border-b border-border-default ${
                      isToday(date) ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary'
                    } ${!hasSlots ? 'opacity-40' : ''}`}
                  >
                    <div>{DAY_NAMES_SHORT[dow]}</div>
                    <div className={`text-xs mt-0.5 ${isToday(date) ? 'text-accent-primary' : 'text-text-muted'}`}>
                      {fmtDate(date)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allTimes.map((time) => (
              <tr key={time} className="border-b border-border-default last:border-0">
                {/* Time label */}
                <td className="p-1 text-center text-xs text-text-muted bg-bg-elevated border-r border-border-default whitespace-nowrap">
                  {time}
                </td>
                {weekDates.map((date, i) => {
                  const dow = weekDayOfWeek[i];
                  const hasSlot = (availMap[dow] ?? []).includes(time);
                  const past = isSlotPast(date, time);
                  // Local date parts — toISOString() shifts +07 local midnight
                  // to the previous UTC day, booking a different day than the
                  // column the user clicked.
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const dateKey = `${dow}:${dateStr}`;
                  const isSelected = selectedDate === dateKey && selectedTime === time;
                  const isBooked = bookedSlots.has(`${dateStr}:${time}`);

                  return (
                    <td key={i} className={`p-1 text-center ${isToday(date) ? 'bg-accent-primary/5' : ''}`}>
                      {hasSlot && isBooked && !past ? (
                        <div
                          title="Khung giờ đã được đặt"
                          className="w-full py-1.5 rounded-lg text-xs text-text-muted bg-bg-elevated/50 border border-border-default opacity-60 select-none"
                        >
                          Đã đặt
                        </div>
                      ) : hasSlot && !past ? (
                        <button
                          onClick={() => onSelect(dateKey, time)}
                          className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-accent-primary text-white border-accent-primary shadow-sm'
                              : 'bg-success/10 border-success/30 text-success hover:bg-success/20 hover:border-success/60'
                          }`}
                        >
                          {isSelected ? '✓' : time}
                        </button>
                      ) : hasSlot && past ? (
                        <div className="w-full py-1.5 rounded-lg text-xs text-text-muted bg-bg-elevated/50 border border-border-default opacity-40 select-none">
                          —
                        </div>
                      ) : (
                        <div className="py-1.5" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-success/20 border border-success/40" />
          Còn trống
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-accent-primary border border-accent-primary" />
          Đã chọn
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-bg-elevated border border-border-default opacity-40" />
          Đã qua / Không có
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const t = useTranslations('teachers');
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [isLoading, setIsLoading] = React.useState(true);
  const [teacher, setTeacher] = React.useState<TeacherData | null>(null);
  // dateKey = "dayOfWeek:YYYY-MM-DD"  e.g. "1:2026-02-24"
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [favoriteLoading, setFavoriteLoading] = React.useState(false);

  // Check if this teacher is already favorited on mount
  React.useEffect(() => {
    if (!user?.id || !teacherId) return;
    supabase
      .from('teacher_favorites')
      .select('id')
      .eq('student_id', user.id)
      .eq('teacher_id', teacherId)
      .maybeSingle()
      .then(({ data }) => setIsFavorited(!!data));
  }, [user?.id, teacherId]);

  const handleToggleFavorite = async () => {
    if (!user?.id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        await supabase
          .from('teacher_favorites')
          .delete()
          .eq('student_id', user.id)
          .eq('teacher_id', teacherId);
        setIsFavorited(false);
      } else {
        await supabase
          .from('teacher_favorites')
          .insert({ student_id: user.id, teacher_id: teacherId });
        setIsFavorited(true);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };
  React.useEffect(() => {
    getTeacherById(teacherId)
      .then((data: Record<string, unknown>) => {
        const reviews = ((data.reviews as Array<Record<string, unknown>>) || []).map((r) => {
          const student = r.profiles as Record<string, unknown> | undefined;
          return {
            id: r.id as string,
            studentName: r.is_anonymous ? 'Ẩn danh' : ((student?.full_name as string) || 'Student'),
            rating: (r.rating as number) || 5,
            comment: (r.comment as string) || '',
            date: new Date(r.created_at as string).toLocaleDateString('vi-VN'),
          };
        });

        const disabledSlots = new Set<string>((data.disabled_slots as string[]) || []);

        const availMap: Record<number, string[]> = {};
        ((data.teacher_availability as Array<Record<string, unknown>>) || [])
          .filter((a) => a.is_active)
          .forEach((a) => {
            const dayOfWeek = (a.day_of_week as number) || 0;
            if (!availMap[dayOfWeek]) availMap[dayOfWeek] = [];
            const startTime = (a.start_time as string)?.slice(0, 5) || '09:00';
            const endTime   = (a.end_time   as string)?.slice(0, 5) || '17:00';
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            let mins = sh * 60 + sm;
            const endMins = eh * 60 + em;
            while (mins + 25 <= endMins) {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const slotStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              if (!disabledSlots.has(`${dayOfWeek}:${slotStr}`)) {
                availMap[dayOfWeek].push(slotStr);
              }
              mins += 30;
            }
          });

        const availability: AvailabilityEntry[] = Object.entries(availMap).map(([dow, slots]) => ({
          day: DAY_NAMES_FULL[Number(dow)],
          dayOfWeek: Number(dow),
          slots,
        }));

        const createdAt = new Date(data.created_at as string);
        const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => { breakdown[r.rating] = (breakdown[r.rating] || 0) + 1; });
        const totalR = reviews.length || 1;
        Object.keys(breakdown).forEach((k) => {
          breakdown[Number(k)] = Math.round((breakdown[Number(k)] / totalR) * 100);
        });

        const classes = (data.classes as Array<Record<string, unknown>>) || [];

        setTeacher({
          id: data.id as string,
          name: (data.full_name as string) || 'Teacher',
          avatar: (data.avatar_url as string) || null,
          bio: (data.bio as string) || '',
          specializations: ['English'],
          languages: ['English', 'Vietnamese'],
          hourlyRate: 200000,
          rating: (data.average_rating as number) || 0,
          totalReviews: (data.total_reviews as number) || 0,
          totalClasses: classes.length,
          totalStudents: classes.reduce((sum, c) => sum + ((c.current_enrollments as number) || 0), 0),
          isOnline: true,
          isVerified: true,
          responseTime: '< 1 hour',
          memberSince: createdAt.getFullYear().toString(),
          education: [],
          certifications: [],
          availability,
          bookedSlots: classes
            .filter((c) => (c.status as string) === 'scheduled' && c.start_time)
            .map((c) => bookedSlotKey(c.start_time as string)),
          reviews,
          ratingBreakdown: breakdown,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [teacherId]);

  const mockTeacher = teacher || {
    id: teacherId, name: 'Loading...', avatar: null, bio: '',
    specializations: [], languages: [], hourlyRate: 0,
    rating: 0, totalReviews: 0, totalClasses: 0, totalStudents: 0,
    isOnline: false, isVerified: false, responseTime: '', memberSince: '',
    education: [], certifications: [], availability: [], bookedSlots: [], reviews: [],
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  const sessionPriceGems = Math.round(mockTeacher.hourlyRate / 1000);

  const bookedSlotsSet = React.useMemo(
    () => new Set(mockTeacher.bookedSlots),
    [mockTeacher.bookedSlots]
  );

  // Parse selectedDate "dayOfWeek:YYYY-MM-DD" for display
  const selectedDateLabel = React.useMemo(() => {
    if (!selectedDate) return null;
    const [, dateStr] = selectedDate.split(':');
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selectedDate]);

  const handleBook = () => {
    if (!selectedDate || !selectedTime) return;
    const [, dateStr] = selectedDate.split(':');
    router.push(
      `/student/bookings/confirm?teacher=${teacherId}&date=${encodeURIComponent(dateStr)}&time=${encodeURIComponent(selectedTime)}&gems=0`
    );
  };

  if (isLoading) return <TeacherDetailSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Back */}
      <Link href="/dashboard/teachers" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
        ← {t('backToList')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main content (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Teacher header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <PixelAvatar src={mockTeacher.avatar} fallbackEmoji="👨‍🏫" size="xl" showLevel={false} />
                    {mockTeacher.isOnline && (
                      <span className="absolute bottom-2 right-2 w-5 h-5 bg-success rounded-full border-2 border-bg-surface" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold text-text-primary">{mockTeacher.name}</h1>
                    {mockTeacher.isVerified && <Badge variant="success">✓ Verified</Badge>}
                    {mockTeacher.isOnline && <Badge variant="outline" className="text-success border-success">Online</Badge>}
                    {/* Favorite toggle — only visible to students */}
                    {profile?.role === 'student' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleFavorite}
                        disabled={favoriteLoading}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        className="ml-auto"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-text-muted'}`}
                        />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-accent-gold text-xl">⭐</span>
                      <span className="text-xl font-bold">{mockTeacher.rating}</span>
                      <span className="text-text-muted">({t('reviews_label', { count: mockTeacher.totalReviews })})</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">{t('classes_label', { count: mockTeacher.totalClasses })}</span>
                    <Separator orientation="vertical" className="h-5" />
                    <span className="text-text-secondary">{t('students_label', { count: mockTeacher.totalStudents })}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mockTeacher.specializations.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                    <span>🗣️ {mockTeacher.languages.join(', ')}</span>
                    <span>⏱️ {t('responseTime', { time: mockTeacher.responseTime })}</span>
                    <span>📅 {t('memberSince', { year: mockTeacher.memberSince })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Weekly Schedule Calendar ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('selectSchedule')}</CardTitle>
                {selectedDate && selectedTime && (
                  <Badge variant="success" className="text-sm px-3 py-1">
                    ✓ {selectedDateLabel} · {selectedTime}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <WeeklyCalendar
                availability={mockTeacher.availability}
                bookedSlots={bookedSlotsSet}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onSelect={(dateKey, time) => {
                  setSelectedDate(dateKey);
                  setSelectedTime(time);
                }}
              />
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader><CardTitle>{t('about')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-text-secondary whitespace-pre-line">{mockTeacher.bio || '—'}</p>
            </CardContent>
          </Card>

          {/* Education & Certifications */}
          <Card>
            <CardHeader><CardTitle>{t('educationAndCerts')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-text-primary mb-2">{t('education')}</h4>
                {mockTeacher.education.length > 0 ? (
                  <ul className="space-y-2">
                    {mockTeacher.education.map((edu, i) => (
                      <li key={i} className="flex items-start gap-2 text-text-secondary">
                        <span>🎓</span>
                        <span>{edu.degree} - {edu.school} ({edu.year})</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-text-muted text-sm">—</p>}
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-text-primary mb-2">{t('certifications')}</h4>
                {mockTeacher.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mockTeacher.certifications.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                  </div>
                ) : <p className="text-text-muted text-sm">—</p>}
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader><CardTitle>{t('studentReviews')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="text-sm w-8">{stars}⭐</span>
                    <Progress value={mockTeacher.ratingBreakdown[stars as keyof typeof mockTeacher.ratingBreakdown]} className="flex-1" />
                    <span className="text-sm text-text-muted w-12">
                      {mockTeacher.ratingBreakdown[stars as keyof typeof mockTeacher.ratingBreakdown]}%
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-4">
                {mockTeacher.reviews.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-4">Chưa có đánh giá</p>
                )}
                {mockTeacher.reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-xl bg-bg-elevated">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{review.studentName}</span>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <span key={i} className="text-accent-gold text-sm">⭐</span>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-text-muted">{review.date}</span>
                    </div>
                    <p className="text-text-secondary">{review.comment}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">{t('viewAllReviews')}</Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar (1/3) ── */}
        <div className="space-y-6">
          <Card variant="glow" className="sticky top-20">
            <CardHeader><CardTitle>{t('bookClass')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Price */}
              <div className="text-center p-4 rounded-xl bg-bg-elevated">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-bold text-accent-gem">{sessionPriceGems}</p>
                  <GemImage size={28} />
                </div>
                <p className="text-text-muted">/ 25 {t('minutes')}</p>
              </div>

              {/* Selected slot summary */}
              {selectedDate && selectedTime ? (
                <div className="p-3 rounded-xl bg-success/10 border border-success/30 space-y-1">
                  <p className="text-xs text-text-muted">{t('selectedSlot')}</p>
                  <p className="font-semibold text-text-primary">{selectedDateLabel}</p>
                  <p className="text-accent-primary font-medium">{selectedTime} – {(() => {
                    const [h, m] = selectedTime.split(':').map(Number);
                    const end = h * 60 + m + 25;
                    return `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`;
                  })()}</p>
                  <button
                    onClick={() => { setSelectedDate(null); setSelectedTime(null); }}
                    className="text-xs text-text-muted hover:text-text-primary underline"
                  >
                    {t('changeSlot')}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-bg-elevated border border-dashed border-border-default text-center">
                  <p className="text-sm text-text-muted">{t('selectSlotHint')}</p>
                </div>
              )}

              {/* Total price */}
              <div className="p-4 rounded-xl bg-accent-gem/10 border border-accent-gem/20">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">{t('total')}</span>
                  <p className="text-xl font-bold text-accent-gem inline-flex items-center gap-2">
                    {sessionPriceGems} <GemImage size={20} />
                  </p>
                </div>
              </div>

              {/* Book button */}
              <Button className="w-full" size="lg" onClick={handleBook} disabled={!selectedDate || !selectedTime}>
                {selectedDate && selectedTime
                  ? t('confirmBook')
                  : t('selectDateAndTime')}
              </Button>

              {/* Message button */}
              <Button variant="outline" className="w-full">
                💬 {t('messageTeacher')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TeacherDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-72" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <div><Skeleton className="h-96" /></div>
      </div>
    </div>
  );
}
