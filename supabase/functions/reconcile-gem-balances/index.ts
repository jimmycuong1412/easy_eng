/**
 * Gem Balance Reconciliation Edge Function
 *
 * Verifies Gem transaction integrity and reconciles balances
 * This is a critical P1 fix for data integrity monitoring
 *
 * Related Tasks: T111A [P] [US5] [ADMIN] Create Gem balance reconciliation script
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReconciliationResult {
  student_id: string;
  student_name: string;
  student_email: string;
  calculated_balance: number;
  profile_balance?: number;
  discrepancy: number;
  transaction_count: number;
  last_transaction_date: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    console.log('Starting Gem balance reconciliation...');

    // Fetch all students
    const { data: students, error: studentsError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'student');

    if (studentsError) throw studentsError;

    const results: ReconciliationResult[] = [];
    let discrepanciesFound = 0;
    let totalStudents = students?.length || 0;

    // Check each student's balance
    for (const student of students || []) {
      // Calculate balance from gem_transactions
      const { data: transactions, error: txError } = await supabaseClient
        .from('gem_transactions')
        .select('amount, created_at')
        .eq('user_id', student.id)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error(`Error fetching transactions for ${student.id}:`, txError);
        continue;
      }

      const calculatedBalance = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
      const transactionCount = transactions?.length || 0;
      const lastTransactionDate = transactions?.[0]?.created_at || null;

      // Note: In the current schema, we don't store balance in profiles
      // This reconciliation checks for negative balances and other anomalies
      const discrepancy = calculatedBalance < 0 ? Math.abs(calculatedBalance) : 0;

      if (calculatedBalance < 0 || calculatedBalance > 1000) {
        // Negative balance or exceeds cap
        discrepanciesFound++;
      }

      results.push({
        student_id: student.id,
        student_name: student.full_name,
        student_email: student.email,
        calculated_balance: calculatedBalance,
        discrepancy,
        transaction_count: transactionCount,
        last_transaction_date: lastTransactionDate || 'Never',
      });
    }

    // Sort by discrepancy (highest first)
    results.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy));

    // Identify specific issues
    const issues = {
      negative_balances: results.filter((r) => r.calculated_balance < 0).length,
      exceeds_cap: results.filter((r) => r.calculated_balance > 1000).length,
      zero_balances: results.filter((r) => r.calculated_balance === 0).length,
      no_transactions: results.filter((r) => r.transaction_count === 0).length,
    };

    // Calculate summary statistics
    const summary = {
      total_students: totalStudents,
      students_with_transactions: results.filter((r) => r.transaction_count > 0).length,
      total_discrepancies: discrepanciesFound,
      total_gems_in_circulation: results.reduce((sum, r) => sum + r.calculated_balance, 0),
      avg_balance: totalStudents > 0
        ? results.reduce((sum, r) => sum + r.calculated_balance, 0) / totalStudents
        : 0,
      issues,
      reconciliation_date: new Date().toISOString(),
    };

    console.log(`Reconciliation complete. Found ${discrepanciesFound} discrepancies.`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        discrepancies: results.filter((r) => r.discrepancy > 0 || r.calculated_balance < 0),
        all_results: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in reconcile-gem-balances:', error);
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
