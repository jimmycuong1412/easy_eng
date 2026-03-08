/**
 * Detect Discrepancies Edge Function
 *
 * Detects data integrity issues across bookings, payments, and Gems
 *
 * Related Tasks: T111C [P] [US5] [ADMIN] Create discrepancy detection Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Discrepancy {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  entity_type: string;
  entity_id: string;
  description: string;
  expected_value: any;
  actual_value: any;
  detected_at: string;
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

    console.log('Starting discrepancy detection...');

    const discrepancies: Discrepancy[] = [];

    // 1. Check for bookings without payments (where final_price > 0)
    const { data: bookingsWithoutPayments } = await supabaseClient
      .from('bookings')
      .select('id, final_price, created_at')
      .gt('final_price', 0)
      .eq('status', 'confirmed')
      .then(async (result) => {
        if (!result.data) return { data: [] };

        const bookingsNeedingPayment = [];
        for (const booking of result.data) {
          const { data: payment } = await supabaseClient
            .from('payments')
            .select('id')
            .eq('booking_id', booking.id)
            .eq('status', 'completed')
            .single();

          if (!payment) {
            bookingsNeedingPayment.push(booking);
            discrepancies.push({
              type: 'missing_payment',
              severity: 'critical',
              entity_type: 'booking',
              entity_id: booking.id,
              description: 'Confirmed booking with price > 0 but no completed payment record',
              expected_value: 'Payment record with status=completed',
              actual_value: 'No payment found',
              detected_at: new Date().toISOString(),
            });
          }
        }
        return { data: bookingsNeedingPayment };
      });

    // 2. Check for payments without bookings
    const { data: paymentsWithoutBookings } = await supabaseClient
      .from('payments')
      .select('id, booking_id, amount')
      .eq('status', 'completed')
      .then(async (result) => {
        if (!result.data) return { data: [] };

        const orphanedPayments = [];
        for (const payment of result.data) {
          const { data: booking } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('id', payment.booking_id)
            .single();

          if (!booking) {
            orphanedPayments.push(payment);
            discrepancies.push({
              type: 'orphaned_payment',
              severity: 'warning',
              entity_type: 'payment',
              entity_id: payment.id,
              description: 'Payment exists but booking not found',
              expected_value: `Booking with id=${payment.booking_id}`,
              actual_value: 'Booking not found',
              detected_at: new Date().toISOString(),
            });
          }
        }
        return { data: orphanedPayments };
      });

    // 3. Check for negative Gem balances
    const { data: negativeBalances } = await supabaseClient
      .from('gem_transactions')
      .select('user_id, amount')
      .then(async (result) => {
        if (!result.data) return { data: [] };

        const balances: Record<string, number> = {};
        result.data.forEach((tx: any) => {
          balances[tx.user_id] = (balances[tx.user_id] || 0) + tx.amount;
        });

        const negative = [];
        for (const [userId, balance] of Object.entries(balances)) {
          if (balance < 0) {
            negative.push({ user_id: userId, balance });
            discrepancies.push({
              type: 'negative_gem_balance',
              severity: 'critical',
              entity_type: 'student',
              entity_id: userId,
              description: 'Student has negative Gem balance',
              expected_value: 'Balance >= 0',
              actual_value: balance,
              detected_at: new Date().toISOString(),
            });
          }
        }
        return { data: negative };
      });

    // 4. Check for Gem balances exceeding cap (10000)
    const { data: exceededCaps } = await supabaseClient
      .from('gem_transactions')
      .select('user_id, amount')
      .then(async (result) => {
        if (!result.data) return { data: [] };

        const balances: Record<string, number> = {};
        result.data.forEach((tx: any) => {
          balances[tx.user_id] = (balances[tx.user_id] || 0) + tx.amount;
        });

        const exceeded = [];
        for (const [userId, balance] of Object.entries(balances)) {
          if (balance > 10000) {
            exceeded.push({ user_id: userId, balance });
            discrepancies.push({
              type: 'gem_cap_exceeded',
              severity: 'warning',
              entity_type: 'student',
              entity_id: userId,
              description: 'Student Gem balance exceeds cap of 1000',
              expected_value: 'Balance <= 10000',
              actual_value: balance,
              detected_at: new Date().toISOString(),
            });
          }
        }
        return { data: exceeded };
      });

    // 5. Check for classes with bookings exceeding capacity
    const { data: overcapacityClasses } = await supabaseClient
      .from('classes')
      .select('id, max_students')
      .then(async (result) => {
        if (!result.data) return { data: [] };

        const overcapacity = [];
        for (const cls of result.data) {
          const { count } = await supabaseClient
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .in('status', ['confirmed', 'completed']);

          if (count && count > cls.max_students) {
            overcapacity.push({ class_id: cls.id, capacity: cls.max_students, bookings: count });
            discrepancies.push({
              type: 'class_overcapacity',
              severity: 'critical',
              entity_type: 'class',
              entity_id: cls.id,
              description: 'Class has more confirmed bookings than capacity',
              expected_value: `Bookings <= ${cls.max_students}`,
              actual_value: count,
              detected_at: new Date().toISOString(),
            });
          }
        }
        return { data: overcapacity };
      });

    // 6. Check for duplicate Gem transactions
    const { data: duplicateTransactions } = await supabaseClient
      .from('gem_transactions')
      .select('user_id, amount, transaction_type, created_at')
      .then((result) => {
        if (!result.data) return { data: [] };

        const seen = new Map<string, any>();
        const duplicates = [];

        for (const tx of result.data) {
          // Key based on user, amount, type, and timestamp (within 1 second)
          const timestamp = Math.floor(new Date(tx.created_at).getTime() / 1000);
          const key = `${tx.user_id}_${tx.amount}_${tx.transaction_type}_${timestamp}`;

          if (seen.has(key)) {
            duplicates.push(tx);
            discrepancies.push({
              type: 'duplicate_gem_transaction',
              severity: 'warning',
              entity_type: 'gem_transaction',
              entity_id: tx.user_id,
              description: 'Potential duplicate Gem transaction detected',
              expected_value: 'Unique transactions',
              actual_value: `Duplicate: ${tx.amount} Gems for ${tx.transaction_type}`,
              detected_at: new Date().toISOString(),
            });
          } else {
            seen.set(key, tx);
          }
        }

        return { data: duplicates };
      });

    // Calculate summary
    const summary = {
      total_discrepancies: discrepancies.length,
      critical: discrepancies.filter((d) => d.severity === 'critical').length,
      warnings: discrepancies.filter((d) => d.severity === 'warning').length,
      info: discrepancies.filter((d) => d.severity === 'info').length,
      by_type: {
        missing_payments: discrepancies.filter((d) => d.type === 'missing_payment').length,
        orphaned_payments: discrepancies.filter((d) => d.type === 'orphaned_payment').length,
        negative_balances: discrepancies.filter((d) => d.type === 'negative_gem_balance').length,
        exceeded_caps: discrepancies.filter((d) => d.type === 'gem_cap_exceeded').length,
        overcapacity_classes: discrepancies.filter((d) => d.type === 'class_overcapacity').length,
        duplicate_transactions: discrepancies.filter((d) => d.type === 'duplicate_gem_transaction')
          .length,
      },
      scan_completed_at: new Date().toISOString(),
    };

    console.log(`Discrepancy detection complete. Found ${discrepancies.length} issues.`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        discrepancies: discrepancies.sort((a, b) => {
          // Sort by severity: critical > warning > info
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in detect-discrepancies:', error);
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
