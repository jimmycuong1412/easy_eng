/**
 * Shared Supabase data-fetching queries.
 *
 * Server-side: call from Server Components / Route Handlers
 * Client-side: call from Client Components via useEffect or useSWR
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  Profile,
} from '@/types/database';

function supabase() {
  return getSupabaseClient();
}

// ============================================================================
// Classes
// ============================================================================

export async function getClasses(filters?: {
  level?: string;
  status?: string;
  teacherId?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase()
    .from('classes')
    .select('*, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url, bio)')
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (filters?.level) query = query.eq('level', filters.level);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getClassById(classId: string) {
  const { data, error } = await supabase()
    .from('classes')
    .select('*, profiles!classes_teacher_id_profiles_fkey(id, full_name, avatar_url, bio, role)')
    .eq('id', classId)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Bookings
// ============================================================================

export async function getUserBookings(userId: string, status?: string) {
  let query = supabase()
    .from('bookings')
    .select('*, classes(id, title, start_time, end_time, duration_minutes, level, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBookingById(bookingId: string) {
  const { data, error } = await supabase()
    .from('bookings')
    .select('*, classes(*, profiles!classes_teacher_id_profiles_fkey(full_name, avatar_url))')
    .eq('id', bookingId)
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Teachers
// ============================================================================

export async function getTeachers(filters?: { limit?: number; offset?: number }) {
  let query = supabase()
    .from('profiles')
    .select('id, full_name, avatar_url, bio, role, is_active')
    .eq('role', 'teacher')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTeacherById(teacherId: string) {
  const db = supabase();

  // Sequential queries to avoid navigator.locks contention on the singleton client
  const profileResult = await db.from('profiles')
    .select('id, full_name, avatar_url, bio, average_rating, total_reviews, role, created_at')
    .eq('id', teacherId)
    .eq('role', 'teacher')
    .single();
  const classesResult = await db.from('classes')
    .select('id, title, level, price, start_time, status, current_enrollments, max_students')
    .eq('teacher_id', teacherId)
    // 1-on-1 classes flip to 'full' on booking (max_students=1) — include
    // them so the calendar can mark those slots as taken
    .in('status', ['scheduled', 'full']);
  const reviewsResult = await (db as any).from('reviews')
    .select('id, rating, comment, is_anonymous, created_at, student_id')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(20);
  const availabilityResult = await db.from('teacher_availability')
    .select('day_of_week, start_time, end_time, is_active')
    .eq('teacher_id', teacherId)
    .eq('is_active', true);
  const overridesResult = await db.from('teacher_slot_overrides')
    .select('day_of_week, slot_time, is_enabled')
    .eq('teacher_id', teacherId);

  if (profileResult.error) throw profileResult.error;

  // Fetch student names for non-anonymous reviews
  const reviews = reviewsResult.data ?? [];
  const studentIds = Array.from(new Set(
    reviews.filter((r: any) => !r.is_anonymous).map((r: any) => r.student_id)
  ));
  let studentNames: Record<string, string> = {};
  if (studentIds.length > 0) {
    const { data: students } = await db
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    if (students) {
      studentNames = Object.fromEntries((students as any[]).map((s: any) => [s.id, s.full_name ?? 'Student']));
    }
  }

  // Build disabled slot set: "dayOfWeek:HH:MM"
  const disabledSlots = new Set<string>();
  ((overridesResult.data ?? []) as any[]).forEach((o: any) => {
    if (!o.is_enabled) disabledSlots.add(`${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`);
  });

  return {
    ...(profileResult.data as Record<string, unknown> | null),
    classes: (classesResult.data ?? []) as any[],
    reviews: reviews.map((r: any) => ({
      ...r,
      profiles: r.is_anonymous ? null : { full_name: studentNames[r.student_id] ?? 'Student', avatar_url: null },
    })),
    teacher_availability: (availabilityResult.data ?? []) as any[],
    disabled_slots: Array.from(disabledSlots), // "dayOfWeek:HH:MM"
  };
}

// ============================================================================
// Notifications
// ============================================================================

export async function getUserNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await (supabase() as any)
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

// ============================================================================
// Quizzes
// ============================================================================

export async function getQuizzes(filters?: { classId?: string; teacherId?: string }) {
  let query = supabase()
    .from('quizzes')
    .select('*, quiz_questions(count)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filters?.classId) query = query.eq('class_id', filters.classId);
  if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getQuizById(quizId: string) {
  const { data, error } = await supabase()
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('id', quizId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserQuizAttempts(userId: string, quizId?: string) {
  let query = supabase()
    .from('quiz_attempts')
    .select('*, quizzes(title, difficulty, passing_score)')
    .eq('student_id', userId)
    .order('started_at', { ascending: false });

  if (quizId) query = query.eq('quiz_id', quizId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================================
// Leaderboard & Progress
// ============================================================================

export async function getLeaderboard(limit = 50) {
  const { data, error } = await supabase()
    .from('student_careers')
    .select('*, profiles!student_careers_student_id_profiles_fkey(full_name, avatar_url), career_paths(name, slug, primary_color)')
    .eq('is_active', true)
    .order('total_xp_earned', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getStudentProgress(studentId: string) {
  const { data, error } = await (supabase() as any)
    .from('student_careers')
    .select('*, career_paths(*)')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

// ============================================================================
// Recordings
// ============================================================================

export async function getUserRecordings(userId: string) {
  const { data, error } = await supabase()
    .from('class_sessions')
    .select('*, classes(title, level)')
    .not('recording_url', 'is', null)
    .or(`teacher_id.eq.${userId},session_participants.user_id.eq.${userId}`)
    .order('scheduled_start_time', { ascending: false });
  if (error) throw error;
  return data;
}

// ============================================================================
// Referrals
// ============================================================================

export async function getUserReferralData(userId: string) {
  // get_or_create_my_referral_code guarantees a code row exists for the caller
  // (the old direct .single() select threw for new users with no code yet).
  const sb = supabase();
  const { data: codeRows, error: rpcError } = await (sb as any).rpc('get_or_create_my_referral_code');
  if (rpcError) throw rpcError;
  const code = Array.isArray(codeRows) ? codeRows[0] : codeRows;

  const { data: refs } = await sb
    .from('referrals')
    .select('id, referred_id, referred_completed_first_class, gems_awarded_to_referrer, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  return {
    code: code?.code ?? null,
    total_referrals: code?.total_referrals ?? 0,
    successful_referrals: code?.successful_referrals ?? 0,
    gems_earned: code?.gems_earned ?? 0,
    referrals: refs ?? [],
  };
}

// ============================================================================
// Teacher Schedule
// ============================================================================

export async function getTeacherSchedule(teacherId: string) {
  const [availResult, sessResult, overridesResult] = await Promise.all([
    supabase()
      .from('teacher_availability')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('is_active', true),
    supabase()
      .from('class_sessions')
      .select('*, classes(title, level, max_students, current_enrollments)')
      .eq('teacher_id', teacherId)
      .gte('scheduled_start_time', new Date().toISOString())
      .order('scheduled_start_time', { ascending: true }),
    supabase()
      .from('teacher_slot_overrides')
      .select('day_of_week, slot_time, is_enabled')
      .eq('teacher_id', teacherId),
  ]);

  if (availResult.error) throw availResult.error;
  if (sessResult.error) throw sessResult.error;

  // Build a Set of disabled slots: "dayOfWeek:HH:MM"
  const disabledSlots = new Set<string>();
  ((overridesResult.data ?? []) as any[]).forEach((o: any) => {
    if (!o.is_enabled) {
      disabledSlots.add(`${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`);
    }
  });

  return {
    availability: availResult.data || [],
    sessions: sessResult.data || [],
    disabledSlots,
  };
}

export async function getTeacherSlotOverrides(teacherId: string) {
  const { data, error } = await (supabase() as any)
    .from('teacher_slot_overrides')
    .select('day_of_week, slot_time, is_enabled')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  // Return as map: "dayOfWeek:HH:MM" -> is_enabled
  const map: Record<string, boolean> = {};
  ((data ?? []) as any[]).forEach((o: any) => {
    map[`${o.day_of_week}:${(o.slot_time as string).slice(0, 5)}`] = o.is_enabled;
  });
  return map;
}

export async function upsertTeacherSlotOverride(
  teacherId: string,
  dayOfWeek: number,
  slotTime: string, // "HH:MM"
  isEnabled: boolean
) {
  const { error } = await (supabase() as any)
    .from('teacher_slot_overrides')
    .upsert(
      { teacher_id: teacherId, day_of_week: dayOfWeek, slot_time: slotTime, is_enabled: isEnabled },
      { onConflict: 'teacher_id,day_of_week,slot_time' }
    );
  if (error) throw error;
}

// ============================================================================
// Dashboard Widgets
// ============================================================================

export async function getDashboardData(userId: string) {
  const [upcomingClasses, recentActivity, gemsBalance] = await Promise.all([
    supabase()
      .from('bookings')
      .select('*, classes(id, title, start_time, end_time, level, teacher_id)')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'pending'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase()
      .from('gem_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    (supabase() as any).rpc('get_gems_balance', { p_user_id: userId }),
  ]);

  return {
    upcomingClasses: upcomingClasses.data || [],
    recentActivity: recentActivity.data || [],
    gemsBalance: (gemsBalance.data as number) || 0,
  };
}

// ============================================================================
// User Profile
// ============================================================================

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await (supabase() as any)
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Learning Path
// ============================================================================

export async function getCareerPaths() {
  const { data, error } = await supabase()
    .from('career_paths')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getStudentCareer(studentId: string) {
  const { data, error } = await supabase()
    .from('student_careers')
    .select('*, career_paths(*), character_sprites(*)')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
