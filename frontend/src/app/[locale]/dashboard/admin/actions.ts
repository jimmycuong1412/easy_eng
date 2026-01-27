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

export interface CookieStats {
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
      .select('role', { count: 'exact' })
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
      .select('price')
      .eq('status', 'completed');

    if (bookingsError) throw bookingsError;

    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;

    // Get this month's bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthlyBookings, error: monthlyError } = await supabase
      .from('bookings')
      .select('price')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString());

    if (monthlyError) throw monthlyError;

    const monthlyRevenue = monthlyBookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;

    // Calculate average booking value
    const totalBookingsCount = bookings?.length || 0;
    const averageBookingValue = totalBookingsCount > 0 ? totalRevenue / totalBookingsCount : 0;

    return {
      totalRevenue,
      revenueGrowth: 23.5, // Mock for now
      monthlyRevenue,
      pendingPayouts: 12500000, // Mock for now
      averageBookingValue,
    };
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    throw error;
  }
}

/**
 * Get cookie statistics from Supabase
 */
export async function getCookieStats(): Promise<CookieStats> {
  try {
    const supabase = await createClient();

    // Get total cookies in circulation
    const { data: balances, error: balancesError } = await supabase
      .from('cookie_balances')
      .select('balance');

    if (balancesError) throw balancesError;

    const totalCirculating = balances?.reduce((sum, b) => sum + (b.balance || 0), 0) || 0;

    // Get this month's issued and redeemed cookies
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: transactions, error: transError } = await supabase
      .from('cookie_transactions')
      .select('amount, type')
      .gte('created_at', monthStart.toISOString());

    if (transError) throw transError;

    const issuedThisMonth = transactions
      ?.filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

    const redeemedThisMonth = transactions
      ?.filter(t => t.type === 'spend')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

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
    console.error('Error fetching cookie stats:', error);
    throw error;
  }
}

/**
 * Get booking statistics from Supabase
 */
export async function getBookingStats(): Promise<BookingStats> {
  try {
    const supabase = await createClient();

    // Get total bookings
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status');

    if (bookingsError) throw bookingsError;

    const totalBookings = allBookings?.length || 0;

    // Get this month's completed bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: completedBookings, error: completedError } = await supabase
      .from('bookings')
      .select('id')
      .eq('status', 'completed')
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

    // Get teachers with their revenue (sum of completed bookings)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('teacher_id, price, id')
      .eq('status', 'completed');

    if (bookingsError) throw bookingsError;

    // Get teacher profiles
    const { data: teachers, error: teachersError } = await supabase
      .from('teacher_profiles')
      .select('id, user_id, avg_rating')
      .limit(limit);

    if (teachersError && teachersError.code !== 'PGRST116') {
      // PGRST116 means table doesn't exist, which is fine for demo
      throw teachersError;
    }

    // Get teacher names from profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'teacher');

    if (profilesError) throw profilesError;

    // Aggregate revenue by teacher
    const teacherStats = new Map<string, { revenue: number; bookings: number }>();

    bookings?.forEach(booking => {
      const teacherId = booking.teacher_id;
      if (!teacherStats.has(teacherId)) {
        teacherStats.set(teacherId, { revenue: 0, bookings: 0 });
      }
      const stats = teacherStats.get(teacherId)!;
      stats.revenue += booking.price || 0;
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
          rating: 4.8, // Default rating, would come from teacher_profiles
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

    // For now, return mock data
    // In production, you would have an activity log table
    const activities: RecentActivity[] = [
      {
        id: '1',
        type: 'user_signup',
        message: 'Người dùng mới đã đăng ký',
        time: '2 phút trước',
        icon: 'UserPlus',
        color: 'text-emerald-400',
      },
      {
        id: '2',
        type: 'booking',
        message: 'Lớp học mới đã được đặt',
        time: '5 phút trước',
        icon: 'Calendar',
        color: 'text-[#3B82F6]',
      },
      {
        id: '3',
        type: 'payment',
        message: 'Thanh toán mới được xử lý',
        time: '12 phút trước',
        icon: 'DollarSign',
        color: 'text-amber-400',
      },
    ];

    return activities;
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}
