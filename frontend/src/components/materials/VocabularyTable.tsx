/**
 * <VocabularyTable>
 *
 * Renders a vocabulary_pack material's word list with IPA, Vietnamese
 * phonetic hint, gloss, and example sentences. Tracks "I know this" taps
 * locally; when ≥ 80% of cards are marked known, fires the
 * award_material_completion RPC.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { ProgressRibbon } from './ProgressRibbon';
import { SaveWordButton } from '@/components/vocabulary/SaveWordButton';
import { useSavedWords } from '@/hooks/useSavedWords';

export interface VocabularyItem {
  id: string;
  idx: number;
  term: string;
  pos: string | null;
  ipa: string | null;
  vi_phonetic_hint: string | null;
  gloss_vi: string;
  gloss_en: string | null;
  example_en: string;
  example_vi: string;
  audio_path: string | null;
}

export interface VocabularyTableProps {
  items: VocabularyItem[];
  materialId: string;
  userId: string | null;
  /** Existing completion (so we don't double-award on revisit). */
  alreadyCompleted: boolean;
  /** Pass threshold from material.min_completion_pct (defaults to 80). */
  minCompletionPct?: number;
}

export function VocabularyTable({
  items,
  materialId,
  userId,
  alreadyCompleted,
  minCompletionPct = 80,
}: VocabularyTableProps) {
  const t = useTranslations();
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [awarded, setAwarded] = useState<{ gems: number; xp: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { savedIds, toggle: toggleSave } = useSavedWords(false);

  const completionPct = useMemo(
    () => (items.length === 0 ? 0 : Math.round((known.size / items.length) * 100)),
    [known.size, items.length],
  );

  const reachedThreshold = completionPct >= minCompletionPct;

  useEffect(() => {
    if (!reachedThreshold || awarded || alreadyCompleted || !userId || submitting) return;

    let cancelled = false;
    setSubmitting(true);

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('award_material_completion', {
        p_user_id: userId,
        p_material_id: materialId,
      });
      if (cancelled) return;
      if (!error && data) {
        const payload = data as { gems_awarded?: number; xp_awarded?: number };
        if (payload.gems_awarded != null && payload.xp_awarded != null) {
          setAwarded({ gems: payload.gems_awarded, xp: payload.xp_awarded });
        }
      }
      setSubmitting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reachedThreshold, awarded, alreadyCompleted, userId, materialId, submitting]);

  const toggle = (id: string) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Progress strip */}
      <div className="flex items-center justify-between text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
        <span>
          {known.size} / {items.length} ({completionPct}%)
        </span>
        <div
          className="h-1 w-32 overflow-hidden rounded-full"
          style={{ background: 'var(--ed-rule, rgba(0,0,0,0.08))' }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${completionPct}%`,
              background: 'var(--ed-coral, #F4593A)',
            }}
          />
        </div>
      </div>

      {/* Award strip */}
      {awarded && (
        <ProgressRibbon gemsAwarded={awarded.gems} xpAwarded={awarded.xp} />
      )}
      {alreadyCompleted && !awarded && (
        <ProgressRibbon gemsAwarded={0} xpAwarded={0} alreadyEarned />
      )}

      {/* Cards */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const isKnown = known.has(it.id);
          return (
            <li
              key={it.id}
              className="ed-card flex flex-col gap-2 p-4"
              data-testid="vocabulary-card"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-serif text-lg text-[color:var(--ed-ink-2,#0A1F4F)]"
                  style={{ fontFamily: 'var(--font-newsreader, serif)' }}
                >
                  {it.term}
                </span>
                {it.audio_path && (
                  <button
                    type="button"
                    aria-label={`Phát âm ${it.term}`}
                    className="text-[color:var(--ed-ink-mute,#6B7280)] hover:text-[color:var(--ed-coral,#F4593A)]"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(it.ipa || it.vi_phonetic_hint) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {it.ipa && (
                    <span className="font-mono text-[color:var(--ed-ink-mute,#6B7280)]">
                      {it.ipa}
                    </span>
                  )}
                  {it.vi_phonetic_hint && (
                    <span className="text-[color:var(--ed-coral-ink,#7A2010)]">
                      "{it.vi_phonetic_hint}"
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm text-[color:var(--ed-ink,#0B2A6B)]">{it.gloss_vi}</p>

              <details className="text-xs text-[color:var(--ed-ink-mute,#6B7280)]">
                <summary className="cursor-pointer">Ví dụ</summary>
                <p className="mt-1 italic">{it.example_en}</p>
                <p className="mt-1">{it.example_vi}</p>
              </details>

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => toggle(it.id)}
                  aria-pressed={isKnown}
                  className={`ed-chip text-[11px] transition-colors ${
                    isKnown ? 'ed-chip-coral' : ''
                  }`}
                >
                  {isKnown ? '✓ Đã thuộc' : 'Tôi đã thuộc'}
                </button>
                {userId && (
                  <SaveWordButton
                    vocabularyItemId={it.id}
                    materialId={materialId}
                    isSaved={savedIds.has(it.id)}
                    onToggle={toggleSave}
                    compact
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!userId && (
        <p className="text-sm text-[color:var(--ed-ink-mute,#6B7280)]">
          {t('materials.detail.signInCta')}
        </p>
      )}
    </div>
  );
}
