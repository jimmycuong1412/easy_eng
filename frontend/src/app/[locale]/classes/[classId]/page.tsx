'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Star,
  Globe,
  Award,
  BookOpen,
  MessageSquare,
  Share2,
  Heart,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { GemImage } from '@/components/common/GemImage';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useGemsBalance } from '@/hooks/useGemsBalance';

// 100 Gems = 25,000 VND  →  1 Gem = 250 VND
const GEMS_PER_VND = 1 / 250;

interface ClassDetail {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  currency: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_students: number;
  current_enrollments: number;
  status: string;
  tags: string[] | null;
  teacher_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: string;
    average_rating?: number;
    total_reviews?: number;
  } | null;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
  student_profile: {
    full_name: string | null;
  } | null;
}

const levelLabels: Record<string, string> = {
  'beginner': 'Beginner',
  'elementary': 'Elementary',
  'intermediate': 'Intermediate',
  'upper_intermediate': 'Upper Intermediate',
  'advanced': 'Advanced',
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCategoryFromTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) return 'General';
  return tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  const { balance: gemBalance, refreshBalance: refreshGems } = useGemsBalance();

  const [isLiked, setIsLiked] = React.useState(false);
  const [classData, setClassData] = React.useState<ClassDetail | null>(null);
  const [reviews, setReviews] = React.useState<ReviewData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [isBooking, setIsBooking] = React.useState(false);
  const [bookingSuccess, setBookingSuccess] = React.useState(false);

  React.useEffect(() => {
    async function fetchClassData() {
      try {
        setLoading(true);
        setError(null);
        const supabase = getSupabaseClient();

        // Fetch class with teacher profile
        const { data: classResult, error: classError } = await supabase
          .from('classes')
          .select('*, profiles!classes_teacher_id_profiles_fkey(id, full_name, avatar_url, bio, role)')
          .eq('id', classId)
          .single();

        if (classError) throw classError;
        setClassData(classResult as ClassDetail);

        // Fetch reviews for this class's teacher
        const { data: reviewsResult, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, rating, comment, is_anonymous, created_at, profiles!reviews_student_id_fkey(full_name)')
          .eq('class_id', classId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!reviewsError && reviewsResult) {
          setReviews(
            reviewsResult.map((r: any) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              is_anonymous: r.is_anonymous,
              created_at: r.created_at,
              student_profile: r.profiles,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch class data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load class details');
      } finally {
        setLoading(false);
      }
    }

    if (classId) {
      fetchClassData();
    }
  }, [classId]);

  const handleBookNow = async () => {
    if (!classData || isBooking) return;

    const gemCost = Math.ceil(classData.price * GEMS_PER_VND);
    if (gemBalance < gemCost) {
      setBookingError(
        `Bạn cần ${gemCost.toLocaleString()} Gems để đặt lớp này. ` +
        `Số dư hiện tại: ${gemBalance.toLocaleString()} Gems.`
      );
      return;
    }

    setIsBooking(true);
    setBookingError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      // Check if a booking already exists for this user + class
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, status, payment_status')
        .eq('user_id', user.id)
        .eq('class_id', classData.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'confirmed' || existing.payment_status === 'completed') {
          router.push('/student/bookings');
          return;
        }
        if (existing.status === 'pending') {
          // Already have a pending booking — confirm it now with gems
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              original_price: classData.price,
              final_price: 0,
              gems_used: gemCost,
              gems_discount_amount: classData.price,
              payment_status: 'completed',
              status: 'confirmed',
              payment_method: 'gems',
              paid_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updateError) throw updateError;

          // Deduct gems
          const { error: gemError } = await supabase
            .from('gem_transactions')
            .insert({
              user_id: user.id,
              amount: -gemCost,
              transaction_type: 'booking_payment',
              booking_id: existing.id,
              class_id: classData.id,
              description: `Đặt lớp: ${classData.title}`,
            });
          if (gemError) throw gemError;

          refreshGems();
          setBookingSuccess(true);
          return;
        }

        // Cancelled/failed — reset and rebook
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            original_price: classData.price,
            final_price: 0,
            gems_used: gemCost,
            gems_discount_amount: classData.price,
            payment_status: 'completed',
            status: 'confirmed',
            payment_method: 'gems',
            cancellation_reason: null,
            cancelled_at: null,
            paid_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;

        const { error: gemError } = await supabase
          .from('gem_transactions')
          .insert({
            user_id: user.id,
            amount: -gemCost,
            transaction_type: 'booking_payment',
            booking_id: existing.id,
            class_id: classData.id,
            description: `Đặt lớp: ${classData.title}`,
          });
        if (gemError) throw gemError;

        refreshGems();
        setBookingSuccess(true);
        return;
      }

      // No existing booking — create + immediately confirm with gems
      const { data: booking, error: insertError } = await supabase
        .from('bookings')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          original_price: classData.price,
          final_price: 0,
          gems_used: gemCost,
          gems_discount_amount: classData.price,
          payment_status: 'completed',
          status: 'confirmed',
          payment_method: 'gems',
          currency: classData.currency || 'VND',
          paid_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      // Deduct gems
      const { error: gemError } = await supabase
        .from('gem_transactions')
        .insert({
          user_id: user.id,
          amount: -gemCost,
          transaction_type: 'booking_payment',
          booking_id: booking.id,
          class_id: classData.id,
          description: `Đặt lớp: ${classData.title}`,
        });
      if (gemError) throw gemError;

      refreshGems();
      setBookingSuccess(true);
    } catch (err: any) {
      console.error('Booking error:', err);
      setBookingError(err.message || 'Đặt lớp thất bại. Vui lòng thử lại.');
      setIsBooking(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading class details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load class</h2>
          <p className="text-slate-400 mb-4">{error || 'Class not found'}</p>
          <Button
            onClick={() => router.back()}
            className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const teacherName = classData.profiles?.full_name || 'Unknown Teacher';
  const teacherAvatar = classData.profiles?.avatar_url || '';
  const teacherBio = classData.profiles?.bio || '';
  const teacherRating = classData.profiles?.average_rating || 0;
  const teacherReviewCount = classData.profiles?.total_reviews || 0;
  const category = getCategoryFromTags(classData.tags);
  const spotsLeft = classData.max_students - classData.current_enrollments;
  const isFull = spotsLeft <= 0;
  const priceUsd = Math.round(classData.price / 25000);
  // Gem cost: 1 Gem = 250 VND
  const gemCost = Math.ceil(classData.price * GEMS_PER_VND);
  const hasEnoughGems = gemBalance >= gemCost;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A1628]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to class list
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Class Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-0">
                      {category}
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                      {levelLabels[classData.level] || classData.level}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-slate-300">
                      <Globe className="w-3 h-3 mr-1" />
                      Vietnamese & English
                    </Badge>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                    {classData.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-6 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>{formatDate(classData.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span>{formatTime(classData.start_time)} ({classData.duration_minutes} min)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className={spotsLeft <= 2 ? 'text-amber-400' : ''}>
                        {spotsLeft} spots left
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#3B82F6]" />
                    Class Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {classData.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* What You'll Learn */}
            {classData.tags && classData.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Topics Covered
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {classData.tags.map((tag, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="p-1 bg-emerald-500/20 rounded-full mt-0.5">
                            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-slate-300">{tag}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      `English level: ${levelLabels[classData.level] || classData.level} or above`,
                      'Microphone and camera',
                      'Quiet environment',
                    ].map((req, index) => (
                      <li key={index} className="flex items-center gap-3 text-slate-300">
                        <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Teacher Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Teacher</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-[#3B82F6]/30">
                      <AvatarImage src={teacherAvatar} />
                      <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xl">
                        {teacherName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/dashboard/teachers/${classData.teacher_id}`} className="hover:underline">
                        <h3 className="text-lg font-semibold text-white">{teacherName}</h3>
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mt-1 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>{teacherRating > 0 ? teacherRating.toFixed(1) : 'New'}</span>
                          <span>({teacherReviewCount} reviews)</span>
                        </div>
                      </div>
                      <p className="text-slate-300">{teacherBio || 'No bio available.'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#3B82F6]" />
                    Student Reviews
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    View all
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => {
                      const studentName = review.is_anonymous
                        ? 'Anonymous Student'
                        : review.student_profile?.full_name || 'Student';

                      return (
                        <div key={review.id} className="p-4 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] font-medium">
                                {studentName.charAt(0)}
                              </div>
                              <span className="text-white font-medium">{studentName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-slate-300">{review.comment}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(review.created_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500 text-center py-4">No reviews yet for this class.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-6"
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">

                  {/* Booking success */}
                  {bookingSuccess ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-white font-bold text-lg mb-1">Đặt lớp thành công!</p>
                      <p className="text-slate-400 text-sm mb-4">
                        Đã trừ <span className="text-amber-400 font-medium">{gemCost.toLocaleString()} Gems</span>
                      </p>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => router.push('/student/bookings')}
                      >
                        Xem lịch học của tôi
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Gem price */}
                      <div className="text-center mb-5">
                        <p className="text-sm text-slate-400 mb-1">Chi phí đặt lớp</p>
                        <div className="flex items-center justify-center gap-2">
                          <GemImage size={28} />
                          <span className="text-3xl font-bold text-amber-400">{gemCost.toLocaleString()}</span>
                          <span className="text-slate-400 text-lg">Gems</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{formatVND(classData.price)} • ~${priceUsd} USD</p>
                      </div>

                      {/* Gem balance */}
                      <div className={`p-3 rounded-xl border mb-5 ${
                        hasEnoughGems
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sm">
                            <GemImage size={16} />
                            <span className="text-slate-300">Số dư của bạn</span>
                          </div>
                          <span className={`font-bold ${hasEnoughGems ? 'text-emerald-400' : 'text-red-400'}`}>
                            {gemBalance.toLocaleString()} Gems
                          </span>
                        </div>
                        {!hasEnoughGems && (
                          <p className="text-xs text-red-400 mt-1.5">
                            Cần thêm {(gemCost - gemBalance).toLocaleString()} Gems
                          </p>
                        )}
                      </div>

                      {/* Buy gems shortcut when insufficient */}
                      {!hasEnoughGems && (
                        <Button
                          variant="outline"
                          className="w-full mb-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          onClick={() => router.push('/student/gems/buy')}
                        >
                          <GemImage size={16} className="mr-2" />
                          Nạp thêm Gems
                        </Button>
                      )}

                      {/* Spots Left */}
                      <div className="mb-5">
                        <div className="flex justify-between mb-2 text-sm">
                          <span className="text-slate-400">Chỗ còn lại</span>
                          <span className="text-white">{classData.current_enrollments}/{classData.max_students}</span>
                        </div>
                        <Progress
                          value={(classData.current_enrollments / classData.max_students) * 100}
                          className="h-2 bg-white/10"
                        />
                        {spotsLeft <= 2 && spotsLeft > 0 && (
                          <p className="text-xs text-amber-400 mt-1.5">Chỉ còn {spotsLeft} chỗ!</p>
                        )}
                      </div>

                      {/* Book Button */}
                      <Button
                        className={`w-full h-12 text-base mb-3 ${
                          hasEnoughGems
                            ? 'bg-[#3B82F6] hover:bg-[#3B82F6]/90'
                            : 'bg-slate-600 cursor-not-allowed opacity-60'
                        }`}
                        disabled={isFull || isBooking || !hasEnoughGems}
                        onClick={() => { setBookingError(null); handleBookNow(); }}
                      >
                        {isFull ? (
                          'Hết chỗ'
                        ) : isBooking ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Đang đặt lớp...
                          </>
                        ) : (
                          <>
                            <GemImage size={18} className="mr-2" />
                            Đặt lớp — {gemCost.toLocaleString()} Gems
                          </>
                        )}
                      </Button>
                      {bookingError && (
                        <p className="text-sm text-red-400 flex items-start gap-1.5 mb-3">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {bookingError}
                        </p>
                      )}
                    </>
                  )}

                  {/* Secondary Actions */}
                  {!bookingSuccess && (
                    <>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                          onClick={() => setIsLiked(!isLiked)}
                        >
                          <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          {isLiked ? 'Saved' : 'Save'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                      <Separator className="my-6 bg-white/10" />
                    </>
                  )}

                  {/* Class Info Summary */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="text-white">{formatDate(classData.start_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time</span>
                      <span className="text-white">{formatTime(classData.start_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white">{classData.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Format</span>
                      <span className="text-white">Live video call</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
