/**
 * Get Gem Analytics Edge Function
 *
 * Provides Gem circulation, minting, burning, and balance analytics
 *
 * Related Tasks: T103 [US5] Create get-gem-analytics Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GemAnalyticsParams {
  start_date?: string;
  end_date?: string;
  activity_type?: string;
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
    const params: GemAnalyticsParams = {
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      activity_type: url.searchParams.get('activity_type') || undefined,
    };

    // Default to last 30 days
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate =
      params.start_date ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch Gem circulation analytics
    let query = supabaseClient
      .from('analytics_gem_circulation')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (params.activity_type) {
      query = query.eq('activity_type', params.activity_type);
    }

    const { data: gemCirculation, error: circulationError } = await query;

    if (circulationError) throw circulationError;

    // Fetch current Gem balances
    const { data: gemBalances, error: balancesError } = await supabaseClient
      .from('analytics_gem_balances')
      .select('*')
      .order('current_balance', { ascending: false })
      .limit(100); // Top 100 students by balance

    if (balancesError) throw balancesError;

    // Calculate aggregate metrics
    const totalMinted = gemCirculation?.reduce((sum, day) => sum + day.gems_minted, 0) || 0;
    const totalBurned = gemCirculation?.reduce((sum, day) => sum + day.gems_burned, 0) || 0;
    const netGems = totalMinted - totalBurned;

    // Calculate circulation by activity type
    const circulationByActivity: Record<string, any> = {};
    gemCirculation?.forEach((record) => {
      if (!circulationByActivity[record.activity_type]) {
        circulationByActivity[record.activity_type] = {
          activity_type: record.activity_type,
          total_transactions: 0,
          gems_minted: 0,
          gems_burned: 0,
          net_gems: 0,
        };
      }

      circulationByActivity[record.activity_type].total_transactions += record.transaction_count;
      circulationByActivity[record.activity_type].gems_minted += record.gems_minted;
      circulationByActivity[record.activity_type].gems_burned += record.gems_burned;
      circulationByActivity[record.activity_type].net_gems += record.net_gems;
    });

    // Calculate balance distribution
    const balanceDistribution = {
      empty: gemBalances?.filter((b) => b.balance_level === 'empty').length || 0,
      low: gemBalances?.filter((b) => b.balance_level === 'low').length || 0,
      medium: gemBalances?.filter((b) => b.balance_level === 'medium').length || 0,
      high: gemBalances?.filter((b) => b.balance_level === 'high').length || 0,
    };

    const totalStudents =
      balanceDistribution.empty +
      balanceDistribution.low +
      balanceDistribution.medium +
      balanceDistribution.high;

    // Get total Gems in circulation (from all time)
    const { data: totalCirculation } = await supabaseClient
      .from('gem_transactions')
      .select('amount')
      .then((result) => {
        const total = result.data?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        return { data: total };
      });

    // Calculate average balance
    const avgBalance = gemBalances?.length
      ? gemBalances.reduce((sum, b) => sum + b.current_balance, 0) / gemBalances.length
      : 0;

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
      .from('analytics_gem_circulation')
      .select('gems_minted, gems_burned')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate);

    const previousMinted =
      previousPeriodData?.reduce((sum, day) => sum + day.gems_minted, 0) || 0;
    const mintingGrowth =
      previousMinted > 0 ? ((totalMinted - previousMinted) / previousMinted) * 100 : 0;

    // Return analytics data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          gem_circulation: gemCirculation,
          circulation_by_activity: Object.values(circulationByActivity),
          top_balances: gemBalances?.slice(0, 20), // Top 20 for display
          summary: {
            total_minted: totalMinted,
            total_burned: totalBurned,
            net_gems: netGems,
            total_in_circulation: totalCirculation,
            avg_balance: Math.round(avgBalance * 100) / 100,
            minting_growth: Math.round(mintingGrowth * 100) / 100,
          },
          distribution: {
            ...balanceDistribution,
            total_students: totalStudents,
            percentages: {
              empty:
                totalStudents > 0
                  ? Math.round((balanceDistribution.empty / totalStudents) * 10000) / 100
                  : 0,
              low:
                totalStudents > 0
                  ? Math.round((balanceDistribution.low / totalStudents) * 10000) / 100
                  : 0,
              medium:
                totalStudents > 0
                  ? Math.round((balanceDistribution.medium / totalStudents) * 10000) / 100
                  : 0,
              high:
                totalStudents > 0
                  ? Math.round((balanceDistribution.high / totalStudents) * 10000) / 100
                  : 0,
            },
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
    console.error('Error in get-gem-analytics:', error);
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
