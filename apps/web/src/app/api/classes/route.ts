import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const level = searchParams.get('level');
  const status = searchParams.get('status') || 'scheduled';
  const teacherId = searchParams.get('teacherId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const availableOnly = searchParams.get('availableOnly') === 'true';

  let query = supabase
    .from('classes')
    .select('*, teacher:profiles!classes_teacher_id_fkey(id, full_name)', { count: 'exact' })
    .eq('status', status)
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1);

  if (level) query = query.eq('level', level);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (availableOnly) query = query.lt('current_enrollments', 'max_students' as never);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data, total: count });
}
