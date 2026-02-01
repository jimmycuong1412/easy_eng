/**
 * Get Booking Analytics Edge Function
 *
 * Provides booking trends, conversion rates, and class fill rate analytics
 *
 * Related Tasks: T102 [US5] Create get-booking-analytics Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingAnalyticsParams {
  start_date?: string;
  end_date?: string;
  teacher_id?: string;
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
    const params: BookingAnalyticsParams = {
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      teacher_id: url.searchParams.get('teacher_id') || undefined,
      interval: (url.searchParams.get('interval') as any) || 'day',
    };

    // Default to last 30 days
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate =
      params.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch booking analytics from view
    const { data: bookingTrends, error: trendsError } = await supabaseClient
      .from('analytics_bookings')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (trendsError) throw trendsError;

    // Fetch class performance data
    const { data: classPerformance, error: perfError } = await supabaseClient
      .from('analytics_class_performance')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(20); // Top 20 classes

    if (perfError) throw perfError;

    // Fetch topic popularity
    const { data: topicPopularity, error: topicError } = await supabaseClient
      .from('analytics_topic_popularity')
      .select('*')
      .order('total_revenue', { ascending: false });

    if (topicError) throw topicError;

    // Calculate aggregate metrics
    const totalBookings = bookingTrends?.reduce((sum, day) => sum + day.total_bookings, 0) || 0;
    const confirmedBookings =
      bookingTrends?.reduce((sum, day) => sum + day.confirmed_bookings, 0) || 0;
    const cancelledBookings =
      bookingTrends?.reduce((sum, day) => sum + day.cancelled_bookings, 0) || 0;
    const completedBookings =
      bookingTrends?.reduce((sum, day) => sum + day.completed_bookings, 0) || 0;

    const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    const completionRate = confirmedBookings > 0 ? (completedBookings / confirmedBookings) * 100 : 0;

    const avgFillRate =
      bookingTrends?.reduce((sum, day) => sum + (day.avg_fill_rate_pct || 0), 0) /
        (bookingTrends?.length || 1) || 0;

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
      .from('analytics_bookings')
      .select('total_bookings, total_revenue')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate);

    const previousBookings =
      previousPeriodData?.reduce((sum, day) => sum + day.total_bookings, 0) || 0;
    const bookingGrowth =
      previousBookings > 0 ? ((totalBookings - previousBookings) / previousBookings) * 100 : 0;

    // Return analytics data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          booking_trends: bookingTrends,
          class_performance: classPerformance,
          topic_popularity: topicPopularity,
          summary: {
            total_bookings: totalBookings,
            confirmed_bookings: confirmedBookings,
            cancelled_bookings: cancelledBookings,
            completed_bookings: completedBookings,
            conversion_rate: Math.round(conversionRate * 100) / 100,
            cancellation_rate: Math.round(cancellationRate * 100) / 100,
            completion_rate: Math.round(completionRate * 100) / 100,
            avg_fill_rate: Math.round(avgFillRate * 100) / 100,
            booking_growth: Math.round(bookingGrowth * 100) / 100,
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
    console.error('Error in get-booking-analytics:', error);
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
