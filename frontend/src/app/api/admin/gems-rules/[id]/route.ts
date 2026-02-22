/**
 * Admin Gem Earning Rule by ID
 * PUT /api/admin/gems-rules/[id] - Update a rule
 * DELETE /api/admin/gems-rules/[id] - Delete a rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCsrfToken } from '@/lib/csrf';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';

function checkCsrf(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value ?? null;
  if (!verifyCsrfToken(headerToken, cookieToken)) {
    return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
  }
  return null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

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

    const body = await request.json();
    const { gem_reward, is_active, rate_limit } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (gem_reward != null) updateData.gem_amount = gem_reward;
    if (is_active != null) updateData.is_active = is_active;
    updateData.daily_limit = rate_limit?.max_per_day ?? null;

    const { data, error } = await supabase
      .from('gem_earning_rules')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ message: 'Rule not found' }, { status: 404 });

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      data: {
        id: row.id,
        activity_type: row.activity_type,
        gem_reward: row.gem_amount,
        is_active: row.is_active,
        conditions: undefined,
        rate_limit: row.daily_limit != null ? { max_per_day: row.daily_limit } : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    console.error('[gems-rules PUT]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

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

    void request; // consumed by checkCsrf above
    const { error } = await supabase
      .from('gem_earning_rules')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[gems-rules DELETE]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
