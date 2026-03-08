'use server';

import { createClient } from '@/lib/supabase/server';

export interface PlatformStats {
  totalUsers: number;
  usersGrowth: number;
  totalTeachers: number;
  teachersGrowth: number;
  totalStudents: number;
  studentsGrowth: number;
  totalParents: number;
  parentsGrowth: number;
}

export interface RevenueStats {
  totalRevenue: number;
  revenueGrowth: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  averageBookingValue: number;
}

export interface GemStats {
  totalCirculating: number;
  issuedThisMonth: number;
  redeemedThisMonth: number;
  averageRedemption: number;
}

export interface BookingStats {
  totalBookings: number;
  completedThisMonth: number;
  completionRate: number;
  averageRating: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_signup' | 'booking' | 'payment' | 'teacher_verified' | 'report';
  message: string;
  time: string;
  icon: string;
  color: string;
}

export interface TopTeacher {
  id: string;
  name: string;
  revenue: number;
  bookings: number;
  rating: number;
  avatar_url?: string;
}

/**
 * Get platform statistics from Supabase
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const supabase = await createClient();

    // Get user counts by role
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('role')
      .in('role', ['student', 'teacher', 'parent']);

    if (usersError) throw usersError;

    const totalUsers = users?.length || 0;
    const totalTeachers = users?.filter(u => u.role === 'teacher').length || 0;
    const totalStudents = users?.filter(u => u.role === 'student').length || 0;
    const totalParents = users?.filter(u => u.role === 'parent').length || 0;

    // Get growth metrics (mock for now, would need historical data)
    // In production, you'd query a metrics table
    const growthData = {
      usersGrowth: 12.5,
      teachersGrowth: 8.2,
      studentsGrowth: 13.1,
      parentsGrowth: 5.3,
    };

    return {
      totalUsers,
      usersGrowth: growthData.usersGrowth,
      totalTeachers,
      teachersGrowth: growthData.teachersGrowth,
      totalStudents,
      studentsGrowth: growthData.studentsGrowth,
      totalParents,
      parentsGrowth: growthData.parentsGrowth,
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    throw error;
  }
}

/**
 * Get revenue statistics from Supabase
 */
export async function getRevenueStats(): Promise<RevenueStats> {
  try {
    const supabase = await createClient();

    // Get total bookings for revenue calculation
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('final_price')
      .eq('payment_status', 'paid');

    if (bookingsError) throw bookingsError;

    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.final_price || 0), 0) ?? 0;

    // Get this month's bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthlyBookings, error: monthlyError } = await supabase
      .from('bookings')
      .select('final_price')
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart.toISOString());

    if (monthlyError) throw monthlyError;

    const monthlyRevenue = monthlyBookings?.reduce((sum, b) => sum + (b.final_price || 0), 0) ?? 0;

    // Calculate average booking value
    const totalBookingsCount = bookings?.length || 0;
    const averageBookingValue = totalBookingsCount > 0 ? totalRevenue / totalBookingsCount : 0;

    // Calculate revenue growth (compare this month vs last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const { data: lastMonthBookings } = await supabase
      .from('bookings')
      .select('final_price')
      .eq('payment_status', 'paid')
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString());
    const lastMonthRevenue = lastMonthBookings?.reduce((sum, b) => sum + (b.final_price || 0), 0) ?? 0;
    const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    // Get pending payouts
    const { data: pendingPayoutData } = await supabase
      .from('payout_requests')
      .select('amount')
      .in('status', ['pending', 'reviewing', 'approved']);
    const pendingPayouts = pendingPayoutData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ?? 0;

    return {
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      monthlyRevenue,
      pendingPayouts,
      averageBookingValue,
    };
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    throw error;
  }
}

/**
 * Get gem statistics from Supabase
 */
export async function getGemStats(): Promise<GemStats> {
  try {
    const supabase = await createClient();

    // Get total gems in circulation (sum of positive balances from gem_transactions)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: transactions, error: transError } = await supabase
      .from('gem_transactions')
      .select('amount, transaction_type')
      .gte('created_at', monthStart.toISOString());

    if (transError) throw transError;

    const issuedThisMonth = transactions
      ?.filter(t => t.transaction_type === 'earn' || (t.amount > 0))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

    const redeemedThisMonth = transactions
      ?.filter(t => t.transaction_type === 'spend' || (t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

    // Get total circulating gems
    const { data: allTransactions } = await supabase
      .from('gem_transactions')
      .select('amount');
    const totalCirculating = allTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const averageRedemption = redeemedThisMonth > 0
      ? Math.round(redeemedThisMonth / (transactions?.length || 1))
      : 0;

    return {
      totalCirculating,
      issuedThisMonth,
      redeemedThisMonth,
      averageRedemption,
    };
  } catch (error) {
    console.error('Error fetching gem stats:', error);
    throw error;
  }
}

/** @deprecated Use getGemStats instead */
export const getCookieStats = getGemStats;
/** @deprecated Use GemStats instead */
export type CookieStats = GemStats;

/**
 * Get booking statistics from Supabase
 */
export async function getBookingStats(): Promise<BookingStats> {
  try {
    const supabase = await createClient();

    // Get total bookings
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('payment_status');

    if (bookingsError) throw bookingsError;

    const totalBookings = allBookings?.length || 0;

    // Get this month's completed bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: completedBookings, error: completedError } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_status', 'paid')
      .gte('created_at', monthStart.toISOString());

    if (completedError) throw completedError;

    const completedThisMonth = completedBookings?.length || 0;
    const completionRate = totalBookings > 0 ? (completedThisMonth / totalBookings) * 100 : 0;

    // Average rating (mock for now - would need ratings table)
    const averageRating = 4.8;

    return {
      totalBookings,
      completedThisMonth,
      completionRate,
      averageRating,
    };
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    throw error;
  }
}

/**
 * Get top teachers by revenue
 */
export async function getTopTeachers(limit: number = 5): Promise<TopTeacher[]> {
  try {
    const supabase = await createClient();

    // Get teachers via classes joined with bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('final_price, class_id, classes!inner(teacher_id)')
      .eq('payment_status', 'paid');

    if (bookingsError) throw bookingsError;

    // Get teacher profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'teacher');

    if (profilesError) throw profilesError;

    // Aggregate revenue by teacher
    const teacherStats = new Map<string, { revenue: number; bookings: number }>();

    bookings?.forEach(booking => {
      const teacherId = (booking.classes as any)?.teacher_id;
      if (!teacherId) return;
      if (!teacherStats.has(teacherId)) {
        teacherStats.set(teacherId, { revenue: 0, bookings: 0 });
      }
      const stats = teacherStats.get(teacherId)!;
      stats.revenue += booking.final_price || 0;
      stats.bookings += 1;
    });

    // Convert to array and sort by revenue
    const topTeachersData = Array.from(teacherStats.entries())
      .map(([teacherId, stats]) => {
        const teacher = profiles?.find(p => p.id === teacherId);
        return {
          id: teacherId,
          name: teacher?.full_name || 'Unknown',
          revenue: stats.revenue,
          bookings: stats.bookings,
          rating: 4.8,
          avatar_url: teacher?.avatar_url || undefined,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return topTeachersData;
  } catch (error) {
    console.error('Error fetching top teachers:', error);
    return [];
  }
}

/**
 * Get recent activities/events
 */
export async function getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const typeMap: Record<string, { activityType: RecentActivity['type']; icon: string; color: string }> = {
      booking_confirmed: { activityType: 'booking', icon: 'Calendar', color: 'text-[#3B82F6]' },
      booking_cancelled: { activityType: 'booking', icon: 'Calendar', color: 'text-red-400' },
      payment_received: { activityType: 'payment', icon: 'DollarSign', color: 'text-amber-400' },
      gems_earned: { activityType: 'payment', icon: 'DollarSign', color: 'text-emerald-400' },
      level_up: { activityType: 'user_signup', icon: 'UserPlus', color: 'text-purple-400' },
    };

    return (data || []).map((n) => {
      const mapped = typeMap[n.type] || { activityType: 'report' as const, icon: 'Bell', color: 'text-slate-400' };
      const createdAt = new Date(n.created_at);
      const diffMs = Date.now() - createdAt.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const time = diffMin < 60 ? `${diffMin} phút trước` : `${Math.floor(diffMin / 60)} giờ trước`;

      return {
        id: n.id,
        type: mapped.activityType,
        message: n.message || n.title,
        time,
        icon: mapped.icon,
        color: mapped.color,
      };
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}
