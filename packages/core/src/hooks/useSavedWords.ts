'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../adapters/supabase';

export interface SavedWord {
  save_id: string;
  vocabulary_item_id: string;
  term: string;
  pos: string | null;
  ipa: string | null;
  vi_phonetic_hint: string | null;
  gloss_vi: string;
  gloss_en: string | null;
  example_en: string;
  example_vi: string;
  material_id: string | null;
  material_title: string | null;
  srs_due_date: string;
  srs_interval: number;
  times_reviewed: number;
  last_result: 'good' | 'hard' | 'again' | null;
}

export function useSavedWords(dueOnly = false) {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc('get_my_saved_words', { p_due_only: dueOnly });
      if (error) throw error;
      const list = (data ?? []) as SavedWord[];
      setWords(list);
      setSavedIds(new Set(list.map((w) => w.vocabulary_item_id)));
    } catch (err) {
      console.error('useSavedWords error:', err);
    } finally {
      setLoading(false);
    }
  }, [dueOnly]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (vocabularyItemId: string, materialId?: string | null) => {
    const supabase = createClient() as any;
    const { data, error } = await supabase.rpc('toggle_saved_word', {
      p_vocabulary_item_id: vocabularyItemId,
      p_material_id: materialId ?? null,
    });
    if (error) { console.error('toggle_saved_word error:', error); return false; }
    const isSaved = (Array.isArray(data) ? data[0] : data)?.is_saved ?? false;
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.add(vocabularyItemId);
      else next.delete(vocabularyItemId);
      return next;
    });
    if (!isSaved) setWords((prev) => prev.filter((w) => w.vocabulary_item_id !== vocabularyItemId));
    return isSaved;
  }, []);

  const review = useCallback(async (vocabularyItemId: string, result: 'good' | 'hard' | 'again') => {
    const supabase = createClient() as any;
    await supabase.rpc('review_saved_word', { p_vocabulary_item_id: vocabularyItemId, p_result: result });
    await load();
  }, [load]);

  return { words, loading, savedIds, toggle, review, refresh: load };
}
