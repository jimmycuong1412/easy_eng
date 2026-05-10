'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface VocabItemDraft {
  id?: string;
  idx: number;
  term: string;
  pos?: string | null;
  ipa?: string | null;
  vi_phonetic_hint?: string | null;
  gloss_vi: string;
  gloss_en?: string | null;
  example_en: string;
  example_vi: string;
  audio_path?: string | null;
}

interface VocabularyItemsEditorProps {
  items: VocabItemDraft[];
  onChange: (items: VocabItemDraft[]) => void;
  errorMessage?: string;
}

const EMPTY_ITEM = (): VocabItemDraft => ({
  idx: 0,
  term: '',
  pos: null,
  ipa: null,
  vi_phonetic_hint: null,
  gloss_vi: '',
  gloss_en: null,
  example_en: '',
  example_vi: '',
});

export function VocabularyItemsEditor({
  items,
  onChange,
  errorMessage,
}: VocabularyItemsEditorProps) {
  const addItem = () => {
    onChange([...items, { ...EMPTY_ITEM(), idx: items.length }]);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, idx: i }));
    onChange(next);
  };

  const updateItem = (idx: number, patch: Partial<VocabItemDraft>) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3" data-testid="vocab-items-editor">
      {errorMessage && (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          data-testid="error-vocab-items"
          style={{
            background: 'var(--ed-coral-2, #FFE7E0)',
            borderColor: 'var(--ed-coral, #F4593A)',
            color: 'var(--ed-coral-ink, #7A2010)',
          }}
        >
          {errorMessage}
        </p>
      )}

      {items.map((item, i) => (
        <div
          key={i}
          className="ed-card p-4 space-y-2"
          data-testid={`vocab-item-${i}`}
        >
          <div className="flex items-center justify-between">
            <span
              className="ed-eyebrow text-[10px]"
              style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
            >
              Từ {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="p-1"
              aria-label={`Remove vocab item ${i + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--ed-ink-mute, #6B7280)' }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FieldInput
              label="Từ *"
              value={item.term}
              onChange={(v) => updateItem(i, { term: v })}
              required
            />
            <FieldInput
              label="Từ loại"
              value={item.pos ?? ''}
              onChange={(v) => updateItem(i, { pos: v || null })}
              placeholder="noun / verb…"
            />
            <FieldInput
              label="IPA"
              value={item.ipa ?? ''}
              onChange={(v) => updateItem(i, { ipa: v || null })}
              placeholder="/ˈwɜːrd/"
            />
            <FieldInput
              label="Gợi ý phát âm (VI)"
              value={item.vi_phonetic_hint ?? ''}
              onChange={(v) => updateItem(i, { vi_phonetic_hint: v || null })}
              placeholder="uỡ-đ"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              label="Nghĩa (VI) *"
              value={item.gloss_vi}
              onChange={(v) => updateItem(i, { gloss_vi: v })}
              required
            />
            <FieldInput
              label="Nghĩa (EN)"
              value={item.gloss_en ?? ''}
              onChange={(v) => updateItem(i, { gloss_en: v || null })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              label="Ví dụ (EN) *"
              value={item.example_en}
              onChange={(v) => updateItem(i, { example_en: v })}
              required
            />
            <FieldInput
              label="Ví dụ (VI) *"
              value={item.example_vi}
              onChange={(v) => updateItem(i, { example_vi: v })}
              required
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="ed-btn flex items-center gap-1.5 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          border: '1px solid var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
          borderRadius: '6px',
          padding: '0.375rem 0.75rem',
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm từ
      </button>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="ed-eyebrow mb-0.5 block text-[10px]">
        {label}
        {required && <span style={{ color: 'var(--ed-coral, #F4593A)' }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border px-2 py-1 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
        }}
      />
    </div>
  );
}
