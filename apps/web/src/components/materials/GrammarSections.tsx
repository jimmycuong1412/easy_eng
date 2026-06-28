/**
 * <GrammarSections>
 *
 * Renders the intro/pattern/drill sections of a grammar lesson as labeled
 * blocks. Display-only; sits below the lesson body.
 */

import type { Locale } from './MaterialCard';
import type { MaterialSection } from '@easyeng/core';

export interface GrammarSectionsProps {
  sections: MaterialSection[];
  locale: Locale;
}

const KINDS = new Set(['intro', 'pattern', 'drill']);

const LABELS: Record<string, { vi: string; en: string }> = {
  intro: { vi: 'Giới thiệu', en: 'Introduction' },
  pattern: { vi: 'Cấu trúc', en: 'Pattern' },
  drill: { vi: 'Luyện tập', en: 'Practice' },
};

export function GrammarSections({ sections, locale }: GrammarSectionsProps) {
  const blocks = sections.filter((s) => KINDS.has(s.kind));
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4" data-testid="grammar-sections">
      {blocks.map((s) => {
        const body = locale === 'vi' ? s.body_vi ?? s.body_en : s.body_en ?? s.body_vi;
        const label = LABELS[s.kind]?.[locale === 'vi' ? 'vi' : 'en'] ?? s.kind;
        return (
          <section key={s.id} className="ed-card px-4 py-3" data-testid="grammar-section">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ed-ink-mute,#6B7280)]">
              {label}
            </h3>
            <p className="whitespace-pre-line text-base text-[color:var(--ed-ink-2,#0A1F4F)]">
              {body}
            </p>
          </section>
        );
      })}
    </div>
  );
}
