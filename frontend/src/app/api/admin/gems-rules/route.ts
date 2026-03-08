/**
 * Admin Gem Earning Rules API
 * GET /api/admin/gems-rules - List all rules
 * POST /api/admin/gems-rules - Create a new rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfRouteProtection } from '@/lib/csrf.server';

// Map DB row → frontend GemRule shape
function toFrontend(row: Record<string, unknown>) {
  return {
    id: row.id,
    activity_type: row.activity_type,
    gem_reward: row.gem_amount,
    is_active: row.is_active,
    conditions: undefined,
    rate_limit: row.daily_limit != null
      ? { max_per_day: row.daily_limit }
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
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

    const { data, error } = await supabase
      .from('gem_earning_rules')
      .select('*')
      .order('activity_type');

    if (error) throw error;

    return NextResponse.json({ data: (data || []).map(toFrontend) });
  } catch (error) {
    console.error('[gems-rules GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Verify admin
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

    const body = await request.json();
    const { activity_type, gem_reward, is_active, rate_limit } = body;

    if (!activity_type || gem_reward == null) {
      return NextResponse.json({ message: 'activity_type and gem_reward are required' }, { status: 400 });
    }

    const insertData = {
      activity_type,
      gem_amount: gem_reward,
      is_active: is_active ?? true,
      daily_limit: rate_limit?.max_per_day ?? null,
    };

    const { data, error } = await supabase
      .from('gem_earning_rules')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: toFrontend(data) }, { status: 201 });
  } catch (error) {
    console.error('[gems-rules POST]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withCsrfRouteProtection(handlePost);
