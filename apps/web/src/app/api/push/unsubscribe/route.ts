import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/push/unsubscribe
 * Removes the authenticated user's push subscriptions (Growth 1.3).
 * Optional body { endpoint } removes just one device; otherwise all of theirs.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { endpoint?: string };

  let q = (supabase as any).from('push_subscriptions').delete().eq('user_id', user.id);
  if (body?.endpoint) q = q.eq('endpoint', body.endpoint);
  const { error } = await q;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
