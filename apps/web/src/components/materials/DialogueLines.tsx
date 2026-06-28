/**
 * <DialogueLines>
 *
 * Renders the dialogue_line sections of a dialogue material as a speaker-labeled
 * transcript. Display-only. The studied line is the locale-appropriate body;
 * the other language is shown as a muted translation beneath it.
 */

import type { Locale } from './MaterialCard';
import type { MaterialSection } from '@easyeng/core';

export interface DialogueLinesProps {
  sections: MaterialSection[];
  locale: Locale;
}

function speakerLabel(meta: Record<string, unknown>): string | null {
  const s = meta?.speaker;
  return typeof s === 'string' && s.trim() ? s : null;
}

export function DialogueLines({ sections, locale }: DialogueLinesProps) {
  const lines = sections.filter((s) => s.kind === 'dialogue_line');
  if (lines.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="dialogue-lines">
      {lines.map((line) => {
        const primary = locale === 'vi' ? line.body_vi ?? line.body_en : line.body_en ?? line.body_vi;
        const secondary = locale === 'vi' ? line.body_en : line.body_vi;
        const speaker = speakerLabel(line.meta);
        return (
          <div
            key={line.id}
            className="ed-card px-4 py-3"
            data-testid="dialogue-line"
          >
            {speaker && (
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ed-ink-mute,#6B7280)]">
                {speaker}
              </div>
            )}
            <p className="text-base text-[color:var(--ed-ink-2,#0A1F4F)]">{primary}</p>
            {secondary && (
              <p className="mt-1 text-sm text-[color:var(--ed-ink-mute,#6B7280)]">{secondary}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
