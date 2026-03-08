/**
 * Admin Gem Rules Stats
 * GET /api/admin/gems-rules/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Get all rules for counts and averages
    const { data: rules, error: rulesError } = await supabase
      .from('gem_earning_rules')
      .select('gem_amount, is_active');

    if (rulesError) throw rulesError;

    const totalRules = rules?.length ?? 0;
    const activeRules = rules?.filter((r) => r.is_active).length ?? 0;
    const averageReward =
      totalRules > 0
        ? (rules ?? []).reduce((sum, r) => sum + (r.gem_amount ?? 0), 0) / totalRules
        : 0;

    // Get total gems issued (positive transactions = minted/earned)
    const { data: txData, error: txError } = await supabase
      .from('gem_transactions')
      .select('amount')
      .gt('amount', 0);

    if (txError) throw txError;

    const totalGemsIssued = (txData ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0);

    return NextResponse.json({
      data: {
        totalRules,
        activeRules,
        totalGemsIssued,
        averageReward,
      },
    });
  } catch (error) {
    console.error('[gems-rules/stats GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
