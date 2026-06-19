/**
 * Materials Ingest API — POST /api/v1/materials
 *
 * Endpoint máy-tới-máy (machine-to-machine) để service "AI Materials Factory"
 * nạp bài học tự sinh vào EasyEng ở trạng thái CHỜ DUYỆT (status = 'draft').
 *
 * KHÁC với các route admin khác:
 *  - Xác thực bằng Bearer token tĩnh (MATERIALS_INGEST_TOKEN), KHÔNG dùng cookie
 *    session và KHÔNG dùng CSRF (không có trình duyệt / không có cookie).
 *  - Dùng service-role client (createAdminClient) để bỏ qua RLS khi insert.
 *
 * Quy tắc an toàn:
 *  - LUÔN ép status = 'draft' bất kể client gửi gì → học viên không bao giờ thấy
 *    bài chưa được admin kiểm định.
 *  - Chống trùng: slug được sinh tất định từ source_url; nạp lại cùng một bài
 *    sẽ đụng ràng buộc UNIQUE(slug) và trả 409 (không tạo bản trùng).
 */

import { createHash } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/server';

// Bài từ báo luôn là reading_passage; duration giới hạn 1–90 theo schema materials.
const MAX_DURATION_MIN = 90;
const MIN_DURATION_MIN = 1;

const MATERIAL_TYPES = [
  'vocabulary_pack',
  'grammar_lesson',
  'reading_passage',
  'listening_audio',
  'dialogue',
  'mock_test',
] as const;
const MATERIAL_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
const MATERIAL_GOALS = [
  'school',
  'vstep',
  'toeic',
  'ielts',
  'business',
  'study_abroad',
  'conversation',
  'travel',
] as const;

// Danh mục lớn theo taxonomy EasyEng (khớp enum material_category, migration 087).
const MATERIAL_CATEGORIES = [
  'daily_news_talk',
  'callan_method',
  'grammar_basics',
  'business_english',
  'daily_travel',
  'pronunciation',
  'exam_prep',
  'kids_english',
] as const;

type IngestPayload = {
  title_vi?: string;
  title_en?: string | null;
  summary_vi?: string;
  summary_en?: string | null;
  body_vi?: string;
  body_en?: string | null;
  type?: string;
  level?: string;
  goal?: string | null;
  category?: string | null;
  subcategory?: string | null;
  duration_min?: number;
  status?: string;
  tags?: string[];
  seo_description?: string;
  source_url?: string;
  source_title?: string;
};

/** Chuyển một chuỗi bất kỳ thành slug hợp lệ ^[a-z0-9-]+$ (bỏ dấu tiếng Việt). */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Sinh slug TẤT ĐỊNH cho một bài, CHỈ phụ thuộc source_url (không phụ thuộc
 * tiêu đề do AI sinh — tiêu đề có thể khác nhau giữa các lần chạy).
 *
 * Phần đọc được lấy từ đoạn path cuối của URL; cộng 8 ký tự hash của source_url.
 * Cùng source_url → cùng slug → dedup qua UNIQUE(slug), bất kể tiêu đề thay đổi.
 */
function buildSlug(sourceUrl: string): string {
  let lastSegment = '';
  try {
    const u = new URL(sourceUrl);
    const segs = u.pathname.split('/').filter(Boolean);
    lastSegment = segs.length ? segs[segs.length - 1].replace(/\.\w+$/, '') : u.hostname;
  } catch {
    lastSegment = sourceUrl;
  }
  const base = slugify(lastSegment) || 'material';
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 8);
  return `${base}-${hash}`.slice(0, 96);
}

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ message }, { status: 401 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Xác thực Bearer token.
  const expected = process.env.MATERIALS_INGEST_TOKEN;
  if (!expected) {
    console.error('[materials ingest] MATERIALS_INGEST_TOKEN chưa được cấu hình');
    return NextResponse.json({ message: 'Ingest not configured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token !== expected) {
    return unauthorized('Invalid or missing Bearer token');
  }

  // 2. Parse + validate payload.
  let body: IngestPayload;
  try {
    body = (await request.json()) as IngestPayload;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const errors: string[] = [];
  if (!body.title_vi?.trim()) errors.push('title_vi is required');
  if (!body.body_vi?.trim()) errors.push('body_vi is required');
  if (!body.source_url?.trim()) errors.push('source_url is required (for dedup)');

  const type = body.type ?? 'reading_passage';
  if (!MATERIAL_TYPES.includes(type as (typeof MATERIAL_TYPES)[number])) {
    errors.push(`type must be one of: ${MATERIAL_TYPES.join(', ')}`);
  }
  const level = body.level ?? 'b1';
  if (!MATERIAL_LEVELS.includes(level as (typeof MATERIAL_LEVELS)[number])) {
    errors.push(`level must be one of: ${MATERIAL_LEVELS.join(', ')}`);
  }
  const goal = body.goal ?? null;
  if (goal !== null && !MATERIAL_GOALS.includes(goal as (typeof MATERIAL_GOALS)[number])) {
    errors.push(`goal must be null or one of: ${MATERIAL_GOALS.join(', ')}`);
  }
  // category tùy chọn; nếu gửi thì phải hợp lệ. Bài từ script tin tức -> daily_news_talk.
  const category = body.category ?? null;
  if (category !== null && !MATERIAL_CATEGORIES.includes(category as (typeof MATERIAL_CATEGORIES)[number])) {
    errors.push(`category must be null or one of: ${MATERIAL_CATEGORIES.join(', ')}`);
  }
  const subcategory = body.subcategory?.trim()?.slice(0, 64) || null;

  if (errors.length > 0) {
    return NextResponse.json({ message: 'Validation failed', errors }, { status: 422 });
  }

  const supabase = createAdminClient();

  // 3. Xác định author_id (profile của "bot"/admin). Ưu tiên env, fallback admin đầu tiên.
  let authorId = process.env.MATERIALS_BOT_PROFILE_ID ?? '';
  if (!authorId) {
    const { data: admin } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    authorId = admin?.id ?? '';
  }
  if (!authorId) {
    console.error('[materials ingest] không tìm được author_id (admin/bot profile)');
    return NextResponse.json(
      { message: 'No author profile available for ingest' },
      { status: 500 }
    );
  }

  // 4. Chuẩn hóa các trường theo ràng buộc schema.
  const sourceUrl = body.source_url!.trim();
  const summaryVi = (body.summary_vi?.trim() || body.seo_description?.trim() || '').slice(0, 500);
  const durationMin = Math.min(
    MAX_DURATION_MIN,
    Math.max(MIN_DURATION_MIN, Math.round(body.duration_min ?? 10))
  );
  const slug = buildSlug(sourceUrl);

  // 5. Chống trùng theo slug (đọc trước cho thông điệp 409 rõ ràng).
  const { data: existing } = await (supabase as any)
    .from('materials')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json(
      { message: 'Material already ingested for this source', id: existing.id, slug },
      { status: 409 }
    );
  }

  // 6. Insert material — LUÔN status='draft'.
  const insertRow = {
    slug,
    type,
    level,
    status: 'draft', // chốt cứng, không bao giờ publish
    goal,
    category,
    subcategory,
    title_vi: body.title_vi!.trim().slice(0, 200),
    title_en: body.title_en?.trim() || null,
    summary_vi: summaryVi || body.title_vi!.trim().slice(0, 200),
    summary_en: body.summary_en?.trim() || null,
    body_vi: body.body_vi!.trim(),
    body_en: body.body_en?.trim() || null,
    duration_min: durationMin,
    author_id: authorId,
  };

  const { data: inserted, error: insertErr } = await (supabase as any)
    .from('materials')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertErr) {
    // 23505 = unique_violation (đua chèn cùng slug) → coi như trùng.
    if ((insertErr as { code?: string }).code === '23505') {
      return NextResponse.json(
        { message: 'Material already ingested (race)', slug },
        { status: 409 }
      );
    }
    // Service-role key sai/lệch project → Supabase trả "Invalid API key".
    const msg = (insertErr as { message?: string }).message ?? '';
    if (/invalid api key/i.test(msg)) {
      console.error(
        '[materials ingest] SUPABASE_SERVICE_ROLE_KEY không hợp lệ cho project này. ' +
          'Kiểm tra .env.local: service-role key phải cùng project ref với NEXT_PUBLIC_SUPABASE_URL.'
      );
      return NextResponse.json(
        { message: 'Server misconfigured: invalid Supabase service-role key' },
        { status: 500 }
      );
    }
    console.error('[materials ingest] insert lỗi', insertErr);
    return NextResponse.json({ message: 'Failed to insert material' }, { status: 500 });
  }

  const materialId = inserted.id as string;

  // 7. Map tags → material_tags (upsert theo slug) + material_tag_links.
  const tags = Array.isArray(body.tags) ? body.tags : [];
  for (const rawTag of tags) {
    const label = (rawTag || '').trim();
    if (!label) continue;
    const tagSlug = slugify(label);
    if (!tagSlug) continue;

    // Upsert tag (slug UNIQUE). label_vi/label_en NOT NULL → dùng chính label.
    const { data: tag, error: tagErr } = await (supabase as any)
      .from('material_tags')
      .upsert({ slug: tagSlug, label_vi: label, label_en: label }, { onConflict: 'slug' })
      .select('id')
      .single();

    if (tagErr || !tag?.id) {
      console.warn('[materials ingest] bỏ qua tag lỗi', label, tagErr);
      continue;
    }

    // Liên kết tag với material (bỏ qua nếu đã có).
    await (supabase as any)
      .from('material_tag_links')
      .upsert(
        { material_id: materialId, tag_id: tag.id },
        { onConflict: 'material_id,tag_id', ignoreDuplicates: true }
      );
  }

  // 8. Thông báo cho TẤT CẢ admin: có bài mới chờ duyệt.
  //    Lỗi notification KHÔNG làm hỏng việc nạp (material đã tạo xong).
  await notifyAdminsPendingReview(supabase, {
    materialId,
    titleVi: body.title_vi!.trim(),
    category,
  });

  return NextResponse.json({ id: materialId, slug, status: 'draft' }, { status: 201 });
}

/** Tạo notification "có bài chờ duyệt" cho mọi admin. Best-effort (nuốt lỗi + log). */
async function notifyAdminsPendingReview(
  supabase: ReturnType<typeof createAdminClient>,
  args: { materialId: string; titleVi: string; category: string | null },
): Promise<void> {
  try {
    const { data: admins, error: adminErr } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    if (adminErr || !admins?.length) {
      if (adminErr) console.warn('[materials ingest] không lấy được admin để thông báo', adminErr);
      return;
    }

    const rows = (admins as { id: string }[]).map((a) => ({
      user_id: a.id,
      type: 'material_pending_review',
      title: 'Bài học mới chờ duyệt',
      message: `"${args.titleVi}" vừa được nạp và đang chờ bạn duyệt & xuất bản.`,
      action_url: `/vi/materials/admin/editor/${args.materialId}`,
      action_label: 'Xem & duyệt',
      related_id: args.materialId,
      related_type: 'material',
      icon: '📥',
      priority: 'normal',
      data: { category: args.category },
    }));

    const { error: notifErr } = await (supabase as any).from('notifications').insert(rows);
    if (notifErr) console.warn('[materials ingest] tạo notification lỗi', notifErr);
  } catch (e) {
    console.warn('[materials ingest] notifyAdmins exception', e);
  }
}
