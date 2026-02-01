/**
 * Get Revenue Analytics Edge Function
 *
 * Provides revenue breakdown by payment method, teacher earnings, and platform fees
 *
 * Related Tasks: T104 [US5] Create get-revenue-analytics Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueAnalyticsParams {
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  teacher_id?: string;
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
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request parameters
    const url = new URL(req.url);
    const params: RevenueAnalyticsParams = {
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      payment_method: url.searchParams.get('payment_method') || undefined,
      teacher_id: url.searchParams.get('teacher_id') || undefined,
    };

    // Default to last 30 days
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate =
      params.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch revenue analytics
    let query = supabaseClient
      .from('analytics_revenue')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (params.payment_method) {
      query = query.eq('payment_method', params.payment_method);
    }

    const { data: revenueData, error: revenueError } = await query;

    if (revenueError) throw revenueError;

    // Fetch teacher revenue data
    let teacherQuery = supabaseClient
      .from('analytics_teacher_revenue')
      .select('*')
      .order('total_earnings', { ascending: false });

    if (params.teacher_id) {
      teacherQuery = teacherQuery.eq('teacher_id', params.teacher_id);
    }

    const { data: teacherRevenue, error: teacherError } = await teacherQuery.limit(20);

    if (teacherError) throw teacherError;

    // Calculate aggregate metrics
    const totalGrossRevenue = revenueData?.reduce((sum, day) => sum + day.gross_revenue, 0) || 0;
    const totalNetRevenue = revenueData?.reduce((sum, day) => sum + day.net_cash_revenue, 0) || 0;
    const totalTeacherEarnings =
      revenueData?.reduce((sum, day) => sum + day.teacher_earnings, 0) || 0;
    const totalPlatformFee = revenueData?.reduce((sum, day) => sum + day.platform_fee, 0) || 0;
    const totalGatewayFees =
      revenueData?.reduce((sum, day) => sum + day.estimated_gateway_fees, 0) || 0;
    const totalNetProfit =
      revenueData?.reduce((sum, day) => sum + day.net_platform_profit, 0) || 0;
    const totalGemsValue =
      revenueData?.reduce((sum, day) => sum + day.gems_discount_value, 0) || 0;

    // Revenue by payment method
    const revenueByMethod: Record<string, any> = {};
    revenueData?.forEach((record) => {
      if (!revenueByMethod[record.payment_method]) {
        revenueByMethod[record.payment_method] = {
          payment_method: record.payment_method,
          booking_count: 0,
          gross_revenue: 0,
          net_revenue: 0,
          gateway_fees: 0,
        };
      }

      revenueByMethod[record.payment_method].booking_count += record.booking_count;
      revenueByMethod[record.payment_method].gross_revenue += record.gross_revenue;
      revenueByMethod[record.payment_method].net_revenue += record.net_cash_revenue;
      revenueByMethod[record.payment_method].gateway_fees += record.estimated_gateway_fees;
    });

    // Calculate average transaction values
    const totalBookings = revenueData?.reduce((sum, day) => sum + day.booking_count, 0) || 0;
    const avgTransactionValue = totalBookings > 0 ? totalGrossRevenue / totalBookings : 0;

    // Calculate margin percentages
    const platformMargin = totalGrossRevenue > 0 ? (totalPlatformFee / totalGrossRevenue) * 100 : 0;
    const netMargin = totalGrossRevenue > 0 ? (totalNetProfit / totalGrossRevenue) * 100 : 0;
    const gatewayFeeRate = totalGrossRevenue > 0 ? (totalGatewayFees / totalGrossRevenue) * 100 : 0;

    // Calculate period-over-period growth
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
      .from('analytics_revenue')
      .select('gross_revenue')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate);

    const previousRevenue =
      previousPeriodData?.reduce((sum, day) => sum + day.gross_revenue, 0) || 0;
    const revenueGrowth =
      previousRevenue > 0 ? ((totalGrossRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Top earning teachers
    const topTeachers = teacherRevenue?.slice(0, 10) || [];

    // Return analytics data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          revenue_trends: revenueData,
          revenue_by_method: Object.values(revenueByMethod),
          teacher_revenue: teacherRevenue,
          top_teachers: topTeachers,
          summary: {
            total_gross_revenue: Math.round(totalGrossRevenue * 100) / 100,
            total_net_revenue: Math.round(totalNetRevenue * 100) / 100,
            total_teacher_earnings: Math.round(totalTeacherEarnings * 100) / 100,
            total_platform_fee: Math.round(totalPlatformFee * 100) / 100,
            total_gateway_fees: Math.round(totalGatewayFees * 100) / 100,
            total_net_profit: Math.round(totalNetProfit * 100) / 100,
            total_gems_value: Math.round(totalGemsValue * 100) / 100,
            avg_transaction_value: Math.round(avgTransactionValue * 100) / 100,
            platform_margin_pct: Math.round(platformMargin * 100) / 100,
            net_margin_pct: Math.round(netMargin * 100) / 100,
            gateway_fee_rate_pct: Math.round(gatewayFeeRate * 100) / 100,
            revenue_growth: Math.round(revenueGrowth * 100) / 100,
            total_bookings: totalBookings,
          },
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
    console.error('Error in get-revenue-analytics:', error);
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
