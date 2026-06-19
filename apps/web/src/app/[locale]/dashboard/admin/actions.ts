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
    const { data: users, error: usersError } = await (supabase as any)
      .from('profiles')
      .select('role')
      .in('role', ['student', 'teacher', 'parent']);

    if (usersError) throw usersError;

    const typedUsers = users as Array<{ role: string }> | null;
    const totalUsers = typedUsers?.length || 0;
    const totalTeachers = typedUsers?.filter(u => u.role === 'teacher').length || 0;
    const totalStudents = typedUsers?.filter(u => u.role === 'student').length || 0;
    const totalParents = typedUsers?.filter(u => u.role === 'parent').length || 0;

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
    // Trả về 0 thay vì throw để một truy vấn lỗi không làm trắng cả dashboard.
    return {
      totalUsers: 0, usersGrowth: 0, totalTeachers: 0, teachersGrowth: 0,
      totalStudents: 0, studentsGrowth: 0, totalParents: 0, parentsGrowth: 0,
    };
  }
}

/**
 * Get revenue statistics from Supabase
 */
export async function getRevenueStats(): Promise<RevenueStats> {
  try {
    const supabase = await createClient();

    // Doanh thu = tổng final_price các booking đã hoàn thành.
    // (Schema thật dùng cột `final_price` (numeric VND), không phải price_cents.)
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from('bookings')
      .select('final_price, created_at')
      .eq('status', 'completed');

    if (bookingsError) throw bookingsError;

    const rows = (bookings as any[]) ?? [];
    const totalRevenue = rows.reduce((sum, b) => sum + Number(b.final_price || 0), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyRevenue = rows
      .filter((b) => b.created_at && b.created_at >= monthStart)
      .reduce((sum, b) => sum + Number(b.final_price || 0), 0);

    const totalBookingsCount = rows.length;
    const averageBookingValue = totalBookingsCount > 0 ? totalRevenue / totalBookingsCount : 0;

    return {
      totalRevenue,
      revenueGrowth: 0,
      monthlyRevenue,
      pendingPayouts: 0,
      averageBookingValue,
    };
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    // Không throw để tránh làm hỏng cả dashboard — trả về 0.
    return { totalRevenue: 0, revenueGrowth: 0, monthlyRevenue: 0, pendingPayouts: 0, averageBookingValue: 0 };
  }
}

/**
 * Get cookie statistics from Supabase
 */
export async function getCookieStats(): Promise<CookieStats> {
  try {
    const supabase = await createClient();

    // Get total cookies in circulation
    const { data: balances, error: balancesError } = await (supabase as any)
      .from('cookie_balances')
      .select('balance');

    if (balancesError) throw balancesError;

    const totalCirculating = (balances as any[])?.reduce((sum: number, b: any) => sum + (b.balance || 0), 0) || 0;

    // Get this month's issued and redeemed cookies
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: transactions, error: transError } = await (supabase as any)
      .from('cookie_transactions')
      .select('amount, type')
      .gte('created_at', monthStart.toISOString());

    if (transError) throw transError;

    const issuedThisMonth = (transactions as any[])
      ?.filter((t: any) => t.type === 'earn')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

    const redeemedThisMonth = (transactions as any[])
      ?.filter((t: any) => t.type === 'spend')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

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
 * Get gem circulation statistics from Supabase
 */
export async function getGemStats(): Promise<GemStats> {
  try {
    const supabase = await createClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Schema thật: bảng số dư là `user_gems_balances` (cột balance), bảng giao
    // dịch là `gem_transactions` với `amount` (>0 = phát hành, <0 = sử dụng).
    const [circulating, monthTx] = await Promise.all([
      (supabase as any).from('user_gems_balances').select('balance'),
      (supabase as any).from('gem_transactions').select('amount').gte('created_at', startOfMonth),
    ]);

    const totalCirculating = (circulating.data ?? []).reduce(
      (sum: number, row: any) => sum + Number(row.balance ?? 0), 0,
    );

    const txRows = (monthTx.data as any[]) ?? [];
    const issuedThisMonth = txRows
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const redeemedThisMonth = txRows
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const spentCount = txRows.filter((t) => Number(t.amount) < 0).length;
    const averageRedemption = spentCount > 0 ? Math.round(redeemedThisMonth / spentCount) : 0;

    return { totalCirculating, issuedThisMonth, redeemedThisMonth, averageRedemption };
  } catch {
    return { totalCirculating: 0, issuedThisMonth: 0, redeemedThisMonth: 0, averageRedemption: 0 };
  }
}

/**
 * Get booking statistics from Supabase
 */
export async function getBookingStats(): Promise<BookingStats> {
  try {
    const supabase = await createClient();

    // Get total bookings
    const { data: allBookings, error: bookingsError } = await (supabase as any)
      .from('bookings')
      .select('status');

    if (bookingsError) throw bookingsError;

    const totalBookings = allBookings?.length || 0;

    // Get this month's completed bookings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: completedBookings, error: completedError } = await (supabase as any)
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
    return { totalBookings: 0, completedThisMonth: 0, completionRate: 0, averageRating: 0 };
  }
}

/**
 * Get top teachers by revenue
 */
export async function getTopTeachers(limit: number = 5): Promise<TopTeacher[]> {
  try {
    const supabase = await createClient();

    // Doanh thu theo giáo viên: bookings → classes (class_id) → teacher_id.
    // (Schema thật: bookings KHÔNG có teacher_id; nối qua bảng classes.)
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from('bookings')
      .select('final_price, class_id, classes(teacher_id)')
      .eq('status', 'completed');

    if (bookingsError) throw bookingsError;

    const rows = (bookings as any[]) ?? [];
    if (rows.length === 0) return [];

    // Gom doanh thu theo teacher_id.
    const teacherStats = new Map<string, { revenue: number; bookings: number }>();
    for (const b of rows) {
      const teacherId = b.classes?.teacher_id;
      if (!teacherId) continue;
      const s = teacherStats.get(teacherId) ?? { revenue: 0, bookings: 0 };
      s.revenue += Number(b.final_price || 0);
      s.bookings += 1;
      teacherStats.set(teacherId, s);
    }
    if (teacherStats.size === 0) return [];

    // Lấy tên giáo viên từ profiles.
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('role', 'teacher');

    return Array.from(teacherStats.entries())
      .map(([teacherId, stats]) => {
        const teacher = (profiles as any[])?.find((p) => p.id === teacherId);
        return {
          id: teacherId,
          name: teacher?.full_name || 'Unknown',
          revenue: stats.revenue,
          bookings: stats.bookings,
          rating: 0,
          avatar_url: teacher?.avatar_url || undefined,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
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
