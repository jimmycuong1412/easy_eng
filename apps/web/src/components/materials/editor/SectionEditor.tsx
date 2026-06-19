'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export type SectionKind =
  | 'intro'
  | 'pattern'
  | 'drill'
  | 'passage'
  | 'audio'
  | 'dialogue_line'
  | 'test_block';

export interface SectionDraft {
  id?: string;
  idx: number;
  kind: SectionKind;
  body_vi: string | null;
  body_en: string | null;
  audio_path?: string | null;
  duration_sec?: number | null;
  meta?: Record<string, unknown>;
}

interface SectionEditorProps {
  section: SectionDraft;
  onChange: (updated: SectionDraft) => void;
  onRemove: () => void;
  index: number;
}

const KIND_LABELS: Record<SectionKind, string> = {
  intro: 'Giới thiệu',
  pattern: 'Mẫu câu',
  drill: 'Bài tập',
  passage: 'Đoạn văn',
  audio: 'Âm thanh',
  dialogue_line: 'Đoạn hội thoại',
  test_block: 'Khối câu hỏi',
};

export function SectionEditor({ section, onChange, onRemove, index }: SectionEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const update = (patch: Partial<SectionDraft>) => onChange({ ...section, ...patch });

  return (
    <div
      className="ed-card p-4 space-y-3"
      data-testid={`section-editor-${index}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="ed-eyebrow text-[10px]">
            {index + 1}
          </span>
          <select
            value={section.kind}
            onChange={(e) => update({ kind: e.target.value as SectionKind })}
            className="rounded border px-2 py-1 text-xs"
            style={{
              background: 'var(--ed-paper-2, #FBF9F4)',
              borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
              color: 'var(--ed-ink, #0B2A6B)',
            }}
            aria-label="Section kind"
          >
            {Object.entries(KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-xs underline"
            style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
          >
            {showPreview ? 'Soạn thảo' : 'Xem trước'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs"
            style={{ color: 'var(--ed-coral-ink, #7A2010)' }}
            aria-label="Remove section"
          >
            ✕
          </button>
        </div>
      </div>

      {showPreview ? (
        <div
          className="rounded p-3 text-sm prose prose-sm max-w-none"
          style={{
            background: 'var(--ed-paper-2, #FBF9F4)',
            color: 'var(--ed-ink, #0B2A6B)',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(section.body_vi ?? '') }}
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="ed-eyebrow mb-1 block text-[10px]">Nội dung (VI) *</label>
            <textarea
              value={section.body_vi ?? ''}
              onChange={(e) => update({ body_vi: e.target.value })}
              rows={6}
              className="w-full rounded-md border p-2 text-sm font-mono leading-relaxed"
              style={{
                background: 'var(--ed-paper-2, #FBF9F4)',
                borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                color: 'var(--ed-ink, #0B2A6B)',
              }}
              placeholder="Markdown được hỗ trợ…"
            />
          </div>
          <div>
            <label className="ed-eyebrow mb-1 block text-[10px]">Nội dung (EN)</label>
            <textarea
              value={section.body_en ?? ''}
              onChange={(e) => update({ body_en: e.target.value || null })}
              rows={6}
              className="w-full rounded-md border p-2 text-sm font-mono leading-relaxed"
              style={{
                background: 'var(--ed-paper-2, #FBF9F4)',
                borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                color: 'var(--ed-ink, #0B2A6B)',
              }}
              placeholder="English content (optional)…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimal HTML preview for Markdown headings, bold, italic, paragraphs. */
function renderMarkdownPreview(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<h[123]>)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}
