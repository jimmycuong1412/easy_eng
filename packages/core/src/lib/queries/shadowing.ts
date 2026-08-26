/**
 * Free Shadowing — Supabase data-access helpers.
 *
 * Both helpers work for anonymous callers: shadowing packs and clips are
 * readable without a session when the pack is published (see migration 104).
 * That is what lets cold ad traffic load a practice page with no signup.
 *
 * Server-side: import `createClient` from '@/lib/supabase/server'.
 * Client-side: import `getSupabaseClient` from '@/lib/supabase/client'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Envelope } from '../shadowing/envelope';

export interface ShadowingClip {
  clipId: string;
  idx: number;
  textEn: string;
  textVi: string;
  audioPath: string;
  durationMs: number;
  referenceEnvelope: Envelope;
  /** Caller's best score for this clip; null when anonymous or never attempted. */
  bestScore: number | null;
}

export interface ShadowingPackSummary {
  id: string;
  slug: string;
  titleVi: string;
  titleEn: string | null;
  summaryVi: string;
  level: string;
  clipCount: number;
}

interface ClipRow {
  clip_id: string;
  idx: number;
  text_en: string;
  text_vi: string;
  audio_path: string;
  duration_ms: number;
  reference_envelope: Envelope;
  best_score: number | null;
}

export async function fetchShadowingPack(
  client: SupabaseClient,
  slug: string,
): Promise<ShadowingClip[]> {
  const { data, error } = await client.rpc('get_shadowing_pack', { p_slug: slug });
  if (error) throw error;
  const rows = (data ?? []) as ClipRow[];
  return rows.map((r) => ({
    clipId: r.clip_id,
    idx: r.idx,
    textEn: r.text_en,
    textVi: r.text_vi,
    audioPath: r.audio_path,
    durationMs: r.duration_ms,
    referenceEnvelope: r.reference_envelope,
    bestScore: r.best_score ?? null,
  }));
}

interface PackRow {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string | null;
  summary_vi: string;
  level: string;
  shadowing_clips: Array<{ count: number }>;
}

export async function fetchShadowingPacks(
  client: SupabaseClient,
): Promise<ShadowingPackSummary[]> {
  const { data, error } = await client
    .from('materials')
    .select('id, slug, title_vi, title_en, summary_vi, level, shadowing_clips(count)')
    .eq('type', 'shadowing')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as unknown as PackRow[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    titleVi: r.title_vi,
    titleEn: r.title_en,
    summaryVi: r.summary_vi,
    level: r.level,
    clipCount: r.shadowing_clips?.[0]?.count ?? 0,
  }));
}
