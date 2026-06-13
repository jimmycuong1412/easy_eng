/**
 * Materials Library — Supabase data-access helpers.
 *
 * Server-side: import `createClient` from '@/lib/supabase/server' and pass it in.
 * Client-side: import `getSupabaseClient` from '@/lib/supabase/client' and pass it in.
 *
 * Each helper resolves in at most one round-trip so a page render hits ≤ 3
 * round-trips total (per plan.md performance budget).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Types — kept here so component contracts can import without a types/ ping-pong.
// ============================================================

export type MaterialType =
  | 'vocabulary_pack'
  | 'grammar_lesson'
  | 'reading_passage'
  | 'listening_audio'
  | 'dialogue'
  | 'mock_test';

export type MaterialLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1';

export type MaterialStatus = 'draft' | 'in_review' | 'published' | 'archived';

export type MaterialGoal =
  | 'school'
  | 'vstep'
  | 'toeic'
  | 'ielts'
  | 'business'
  | 'study_abroad'
  | 'conversation'
  | 'travel';

/**
 * Catalog tile shape — what `<MaterialCard>` consumes.
 */
export interface MaterialSummary {
  id: string;
  slug: string;
  type: MaterialType;
  level: MaterialLevel;
  goal: MaterialGoal | null;
  title_vi: string;
  title_en: string | null;
  summary_vi: string;
  summary_en: string | null;
  duration_min: number;
  gems_reward: number;
  xp_reward: number;
  cover_path: string | null;
  popularity_score: number;
  published_at: string | null;
}

/**
 * Detail-page payload — full body + reward + completion threshold.
 */
export interface MaterialDetail extends MaterialSummary {
  body_vi: string;
  body_en: string | null;
  min_completion_pct: number;
  status: MaterialStatus;
  author_id: string;
  updated_at: string;
}

/**
 * Per-user progress strip.
 */
export interface MaterialProgressLite {
  material_id: string;
  state: 'in_progress' | 'completed' | 'abandoned';
  completion_pct: number;
  completed_at: string | null;
  score_pct: number | null;
  gems_awarded: number;
  xp_awarded: number;
}

export interface CatalogFilters {
  level?: MaterialLevel | MaterialLevel[];
  type?: MaterialType | MaterialType[];
  goal?: MaterialGoal | MaterialGoal[];
  search?: string;
  /** Cursor: ISO timestamp of last item's published_at */
  cursor?: string;
  /** Page size (default 24) */
  limit?: number;
}

// ============================================================
// Catalog
// ============================================================

/** Columns selected for catalog tiles. Keeps the payload small. */
const SUMMARY_COLUMNS =
  'id, slug, type, level, goal, title_vi, title_en, summary_vi, summary_en, ' +
  'duration_min, gems_reward, xp_reward, cover_path, popularity_score, published_at';

/**
 * Fetch a paginated, filtered list of published materials for the catalog.
 *
 * The query relies on `idx_materials_published` (status, level, type) and
 * `idx_materials_fts` for search. No joins → 1 round-trip.
 */
export async function fetchMaterialsList(
  supabase: SupabaseClient,
  filters: CatalogFilters = {},
): Promise<{ items: MaterialSummary[]; nextCursor: string | null }> {
  const limit = Math.min(filters.limit ?? 24, 60);

  let query = supabase
    .from('materials')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .order('popularity_score', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (filters.level) {
    query = Array.isArray(filters.level)
      ? query.in('level', filters.level)
      : query.eq('level', filters.level);
  }
  if (filters.type) {
    query = Array.isArray(filters.type)
      ? query.in('type', filters.type)
      : query.eq('type', filters.type);
  }
  if (filters.goal) {
    query = Array.isArray(filters.goal)
      ? query.in('goal', filters.goal)
      : query.eq('goal', filters.goal);
  }
  if (filters.search) {
    // Postgres FTS via `@@` tsquery. Use `simple` config so vi + en both work.
    query = query.textSearch('title_vi,title_en,summary_vi,summary_en', filters.search, {
      config: 'simple',
      type: 'websearch',
    });
  }
  if (filters.cursor) {
    query = query.lt('published_at', filters.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const items = (data ?? []) as unknown as MaterialSummary[];
  const nextCursor =
    items.length === limit ? items[items.length - 1]?.published_at ?? null : null;

  return { items, nextCursor };
}

/**
 * Fetch a single material by slug. Returns null if not found or not published
 * (and the caller is not the author/admin — RLS handles that).
 */
export async function fetchMaterialDetail(
  supabase: SupabaseClient,
  slug: string,
): Promise<MaterialDetail | null> {
  const { data, error } = await supabase
    .from('materials')
    .select(
      `${SUMMARY_COLUMNS}, body_vi, body_en, min_completion_pct, status, author_id, updated_at`,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as MaterialDetail | null;
}

/**
 * Fetch the current user's progress for a single material. Returns null when
 * the user has no row yet (i.e. they have not started).
 */
export async function fetchUserProgress(
  supabase: SupabaseClient,
  userId: string,
  materialId: string,
): Promise<MaterialProgressLite | null> {
  const { data, error } = await supabase
    .from('material_progress')
    .select(
      'material_id, state, completion_pct, completed_at, score_pct, gems_awarded, xp_awarded',
    )
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as MaterialProgressLite | null;
}

/**
 * Fetch all tags for the catalog filter chip rail. Cached at the route level
 * with `revalidate: 300`; cheap query, short list.
 */
export async function fetchMaterialTags(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('material_tags')
    .select('id, slug, label_vi, label_en')
    .order('label_vi', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch vocabulary items for a vocabulary_pack material.
 */
export async function fetchVocabularyItems(supabase: SupabaseClient, materialId: string) {
  const { data, error } = await supabase
    .from('vocabulary_items')
    .select(
      'id, idx, term, pos, ipa, vi_phonetic_hint, gloss_vi, gloss_en, example_en, example_vi, audio_path',
    )
    .eq('material_id', materialId)
    .order('idx', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch material assets (audio, images) for a given material.
 */
export async function fetchMaterialAssets(supabase: SupabaseClient, materialId: string) {
  const { data, error } = await supabase
    .from('material_assets')
    .select('id, kind, path, mime_type, duration_sec')
    .eq('material_id', materialId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Mock-test question shape — matches the columns exposed by the
 * `mock_test_items_public` view. Critically: `correct_index` is NOT here,
 * because the view excludes it. Students must submit answers via the
 * `grade_mock_test` SECURITY DEFINER RPC.
 */
export interface MockTestQuestion {
  id: string;
  idx: number;
  format: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';
  prompt_vi: string;
  prompt_en: string;
  options_en: string[];
  options_vi: string[] | null;
  points: number;
}

/**
 * Per-item grading payload returned by `grade_mock_test`. The RPC is
 * SECURITY DEFINER so it can read `correct_index` from the locked-down
 * base table; the result is sent back to the client AFTER grading so the
 * student can see what they got right and read the explanation.
 */
export interface MockTestPerItemResult {
  idx: number;
  correct: boolean;
  explanation_vi: string | null;
  explanation_en: string | null;
}

export interface MockTestGradeResult {
  score_pct: number;
  items_correct: number;
  items_total: number;
  passed: boolean;
  per_item: MockTestPerItemResult[];
}

/**
 * Fetch the public-safe mock-test questions for a material. Asserts the
 * payload does NOT contain `correct_index` — a defensive check because
 * exposing that to students would let them cheat without ever submitting.
 */
export async function fetchMockTestQuestions(
  supabase: SupabaseClient,
  materialId: string,
): Promise<MockTestQuestion[]> {
  const { data, error } = await supabase
    .from('mock_test_items_public')
    .select('id, idx, format, prompt_vi, prompt_en, options_en, options_vi, points')
    .eq('material_id', materialId)
    .order('idx', { ascending: true });

  if (error) throw error;

  // Defensive: if the view is ever misconfigured and ships correct_index,
  // catch it here rather than leak it to students. (Tests rely on this too.)
  for (const row of data ?? []) {
    if ('correct_index' in (row as object)) {
      throw new Error(
        'mock_test_items_public is leaking correct_index — verify migration 081',
      );
    }
  }

  return (data ?? []) as unknown as MockTestQuestion[];
}

// ============================================================
// Editor helpers (admin / teacher authoring)
// ============================================================

/**
 * Full material payload for the editor (includes all status values, not just published).
 * RLS lets admins read all rows; teachers see only their own.
 */
export interface MaterialEditorFull extends MaterialDetail {
  id: string;
  slug: string;
}

/**
 * Fetch a material by its UUID for the editor. Returns null if not found or
 * access denied (RLS). Does NOT filter by status — authors need to see drafts.
 */
export async function fetchMaterialForEditor(
  supabase: SupabaseClient,
  materialId: string,
): Promise<import('@/components/materials/editor/MaterialEditor').MaterialEditorDraft | null> {
  const { data, error } = await supabase
    .from('materials')
    .select(
      'id, slug, type, level, goal, status, title_vi, title_en, summary_vi, summary_en, ' +
      'body_vi, body_en, duration_min, gems_reward, xp_reward, min_completion_pct, ' +
      'cover_path, author_id, updated_at, scheduled_publish_at',
    )
    .eq('id', materialId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as unknown as MaterialEditorFull),
    id: (data as any).id,
    updated_at: (data as any).updated_at,
  } as any;
}

/**
 * Fetch vocabulary items for editor (all fields including admin-only ones).
 */
export async function fetchVocabItemsForEditor(
  supabase: SupabaseClient,
  materialId: string,
) {
  const { data, error } = await supabase
    .from('vocabulary_items')
    .select(
      'id, idx, term, pos, ipa, vi_phonetic_hint, gloss_vi, gloss_en, example_en, example_vi, audio_path',
    )
    .eq('material_id', materialId)
    .order('idx', { ascending: true });

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Fetch mock test items for editor (includes correct_index — admin/teacher only).
 * RLS on mock_test_items grants read access to admin and the item's material author.
 */
export async function fetchTestItemsForEditor(
  supabase: SupabaseClient,
  materialId: string,
) {
  const { data, error } = await supabase
    .from('mock_test_items')
    .select(
      'id, idx, format, prompt_vi, prompt_en, options_en, options_vi, ' +
      'correct_index, explanation_vi, explanation_en, points',
    )
    .eq('material_id', materialId)
    .order('idx', { ascending: true });

  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Create a new material draft. Returns the new material's id.
 */
export async function createMaterialDraft(
  supabase: SupabaseClient,
  payload: {
    type: MaterialType;
    level: MaterialLevel;
    goal: MaterialGoal | null;
    title_vi: string;
    summary_vi: string;
    body_vi: string;
    duration_min: number;
    gems_reward: number;
    xp_reward: number;
    min_completion_pct: number;
    author_id: string;
    slug: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('materials')
    .insert({ ...payload, status: 'draft' })
    .select('id')
    .single();

  if (error) throw error;
  return (data as any).id as string;
}

/**
 * Update an existing draft. Uses optimistic locking via `updated_at` filter.
 * Throws if the row was updated concurrently (no rows returned by the filter).
 */
export async function updateMaterialDraft(
  supabase: SupabaseClient,
  materialId: string,
  currentUpdatedAt: string,
  patch: Partial<{
    title_vi: string;
    title_en: string | null;
    summary_vi: string;
    summary_en: string | null;
    body_vi: string;
    body_en: string | null;
    level: MaterialLevel;
    goal: MaterialGoal | null;
    duration_min: number;
    gems_reward: number;
    xp_reward: number;
    min_completion_pct: number;
  }>,
): Promise<{ updated_at: string }> {
  const { data, error } = await supabase
    .from('materials')
    .update(patch)
    .eq('id', materialId)
    .eq('updated_at', currentUpdatedAt)
    .select('updated_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    // No rows matched — concurrent edit detected
    const conflictError = new Error('Conflict: material was updated concurrently');
    (conflictError as any).code = '409';
    throw conflictError;
  }
  return data as { updated_at: string };
}

// ============================================================
// Locale helpers
// ============================================================

/**
 * Resolve a material's title for the given locale, falling back to Vietnamese
 * (per R10 — vi is source of truth).
 */
export function resolveTitle(material: Pick<MaterialSummary, 'title_vi' | 'title_en'>, locale: string): string {
  if (locale === 'en' && material.title_en) return material.title_en;
  return material.title_vi;
}

/**
 * Resolve a material's summary for the given locale.
 */
export function resolveSummary(
  material: Pick<MaterialSummary, 'summary_vi' | 'summary_en'>,
  locale: string,
): string {
  if (locale === 'en' && material.summary_en) return material.summary_en;
  return material.summary_vi;
}

/**
 * Resolve a material's body (Markdown) for the given locale.
 * Returns `{ body, fallbackUsed }` so the caller can show a "translation
 * pending" eyebrow on the English page when the body falls back to Vietnamese.
 */
export function resolveBody(
  material: Pick<MaterialDetail, 'body_vi' | 'body_en'>,
  locale: string,
): { body: string; fallbackUsed: boolean } {
  if (locale === 'en') {
    if (material.body_en) return { body: material.body_en, fallbackUsed: false };
    return { body: material.body_vi, fallbackUsed: true };
  }
  return { body: material.body_vi, fallbackUsed: false };
}
