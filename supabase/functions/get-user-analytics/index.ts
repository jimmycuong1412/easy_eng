/**
 * Get User Analytics Edge Function
 *
 * Provides user growth and registration analytics for admin dashboard
 *
 * Related Tasks: T101 [US5] Create get-user-analytics Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserAnalyticsParams {
  start_date?: string;
  end_date?: string;
  role?: 'student' | 'teacher' | 'admin' | 'all';
  interval?: 'day' | 'week' | 'month';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request parameters
    const url = new URL(req.url);
    const params: UserAnalyticsParams = {
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      role: (url.searchParams.get('role') as any) || 'all',
      interval: (url.searchParams.get('interval') as any) || 'day',
    };

    // Default to last 30 days if no dates provided
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate =
      params.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch user growth analytics
    let query = supabaseClient
      .from('analytics_user_growth')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // Filter by role if specified
    if (params.role !== 'all') {
      query = query.eq('role', params.role);
    }

    const { data: userGrowth, error: growthError } = await query;

    if (growthError) {
      throw growthError;
    }

    // Fetch current user counts by role
    const { data: userCounts, error: countsError } = await supabaseClient
      .from('profiles')
      .select('role')
      .then((result) => {
        if (result.error) throw result.error;

        const counts = {
          student: 0,
          teacher: 0,
          admin: 0,
          total: result.data?.length || 0,
        };

        result.data?.forEach((profile: any) => {
          if (profile.role in counts) {
            counts[profile.role as 'student' | 'teacher' | 'admin']++;
          }
        });

        return { data: counts, error: null };
      });

    if (countsError) {
      throw countsError;
    }

    // Calculate growth rates (comparing to previous period)
    const periodDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousStartDate = new Date(
      new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];
    const previousEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: previousPeriodData } = await supabaseClient
      .from('analytics_user_growth')
      .select('role, new_users')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate);

    // Aggregate growth by role
    const currentPeriodTotals: Record<string, number> = {};
    const previousPeriodTotals: Record<string, number> = {};

    userGrowth?.forEach((record: any) => {
      currentPeriodTotals[record.role] =
        (currentPeriodTotals[record.role] || 0) + record.new_users;
    });

    previousPeriodData?.forEach((record: any) => {
      previousPeriodTotals[record.role] =
        (previousPeriodTotals[record.role] || 0) + record.new_users;
    });

    // Calculate growth rates
    const growthRates: Record<string, number> = {};
    Object.keys(currentPeriodTotals).forEach((role) => {
      const current = currentPeriodTotals[role] || 0;
      const previous = previousPeriodTotals[role] || 0;
      growthRates[role] = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    });

    // Group by interval if requested
    let groupedData = userGrowth;
    if (params.interval === 'week' || params.interval === 'month') {
      groupedData = groupByInterval(userGrowth || [], params.interval);
    }

    // Return analytics data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_growth: groupedData,
          current_counts: userCounts,
          growth_rates: growthRates,
          period: {
            start: startDate,
            end: endDate,
            days: periodDays,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in get-user-analytics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Group analytics data by week or month
 */
function groupByInterval(data: any[], interval: 'week' | 'month'): any[] {
  const grouped: Record<string, any> = {};

  data.forEach((record) => {
    const date = new Date(record.date);
    let key: string;

    if (interval === 'week') {
      // Get the Monday of the week
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      key = monday.toISOString().split('T')[0];
    } else {
      // Get first day of month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }

    const groupKey = `${key}_${record.role}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        date: key,
        role: record.role,
        new_users: 0,
        cumulative_users: record.cumulative_users, // Use latest cumulative
      };
    }

    grouped[groupKey].new_users += record.new_users;
  });

  return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
}
