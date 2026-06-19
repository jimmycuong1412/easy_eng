'use client';

import { Plus, Trash2 } from 'lucide-react';

export interface TestItemDraft {
  id?: string;
  idx: number;
  format: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'matching';
  prompt_vi: string;
  prompt_en: string;
  options_en: string[];
  options_vi?: string[] | null;
  correct_index: number;
  explanation_vi: string;
  explanation_en?: string | null;
  points: number;
}

interface MockTestItemsEditorProps {
  items: TestItemDraft[];
  onChange: (items: TestItemDraft[]) => void;
  errorMessage?: string;
}

const EMPTY_ITEM = (): TestItemDraft => ({
  idx: 0,
  format: 'multiple_choice',
  prompt_vi: '',
  prompt_en: '',
  options_en: ['', '', '', ''],
  options_vi: null,
  correct_index: 0,
  explanation_vi: '',
  explanation_en: null,
  points: 1,
});

const FORMAT_LABELS = {
  multiple_choice: 'Trắc nghiệm',
  fill_in_blank: 'Điền vào chỗ trống',
  true_false: 'Đúng/Sai',
  matching: 'Ghép đôi',
};

export function MockTestItemsEditor({
  items,
  onChange,
  errorMessage,
}: MockTestItemsEditorProps) {
  const addItem = () => {
    onChange([...items, { ...EMPTY_ITEM(), idx: items.length }]);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, idx: i }));
    onChange(next);
  };

  const updateItem = (idx: number, patch: Partial<TestItemDraft>) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3" data-testid="mock-test-items-editor">
      {errorMessage && (
        <p
          className="rounded-md border px-3 py-2 text-sm"
          data-testid="error-test-items"
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
          className="ed-card p-4 space-y-3"
          data-testid={`test-item-${i}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="ed-eyebrow text-[10px]"
                style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
              >
                Câu {i + 1}
              </span>
              <select
                value={item.format}
                onChange={(e) =>
                  updateItem(i, { format: e.target.value as TestItemDraft['format'] })
                }
                className="rounded border px-2 py-1 text-xs"
                style={{
                  background: 'var(--ed-paper-2, #FBF9F4)',
                  borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                  color: 'var(--ed-ink, #0B2A6B)',
                }}
              >
                {Object.entries(FORMAT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>
                Điểm:
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={item.points}
                  onChange={(e) => updateItem(i, { points: Number(e.target.value) })}
                  className="w-12 rounded border px-1 py-0.5 text-xs"
                  style={{
                    background: 'var(--ed-paper-2, #FBF9F4)',
                    borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                    color: 'var(--ed-ink, #0B2A6B)',
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label={`Remove question ${i + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--ed-ink-mute, #6B7280)' }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="ed-eyebrow mb-0.5 block text-[10px]">Câu hỏi (VI) *</label>
              <textarea
                rows={2}
                value={item.prompt_vi}
                onChange={(e) => updateItem(i, { prompt_vi: e.target.value })}
                className="w-full rounded border p-2 text-sm"
                style={{
                  background: 'var(--ed-paper-2, #FBF9F4)',
                  borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                  color: 'var(--ed-ink, #0B2A6B)',
                }}
              />
            </div>
            <div>
              <label className="ed-eyebrow mb-0.5 block text-[10px]">Câu hỏi (EN) *</label>
              <textarea
                rows={2}
                value={item.prompt_en}
                onChange={(e) => updateItem(i, { prompt_en: e.target.value })}
                className="w-full rounded border p-2 text-sm"
                style={{
                  background: 'var(--ed-paper-2, #FBF9F4)',
                  borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                  color: 'var(--ed-ink, #0B2A6B)',
                }}
              />
            </div>
          </div>

          {item.format !== 'fill_in_blank' && (
            <div className="space-y-1">
              <span className="ed-eyebrow block text-[10px]">Đáp án (chọn đáp án đúng)</span>
              {item.options_en.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={item.correct_index === oi}
                    onChange={() => updateItem(i, { correct_index: oi })}
                    className="h-3.5 w-3.5"
                    aria-label={`Option ${oi + 1} correct`}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...item.options_en];
                      opts[oi] = e.target.value;
                      updateItem(i, { options_en: opts });
                    }}
                    placeholder={`Đáp án ${oi + 1}`}
                    className="flex-1 rounded border px-2 py-1 text-sm"
                    style={{
                      background: 'var(--ed-paper-2, #FBF9F4)',
                      borderColor:
                        item.correct_index === oi
                          ? 'var(--ed-coral, #F4593A)'
                          : 'var(--ed-rule, rgba(0,0,0,0.08))',
                      color: 'var(--ed-ink, #0B2A6B)',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {item.format === 'fill_in_blank' && (
            <div>
              <label className="ed-eyebrow mb-0.5 block text-[10px]">Đáp án đúng *</label>
              <input
                type="text"
                value={item.options_en[0] ?? ''}
                onChange={(e) => updateItem(i, { options_en: [e.target.value], correct_index: 0 })}
                className="w-full rounded border px-2 py-1 text-sm"
                style={{
                  background: 'var(--ed-paper-2, #FBF9F4)',
                  borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                  color: 'var(--ed-ink, #0B2A6B)',
                }}
              />
            </div>
          )}

          <div>
            <label className="ed-eyebrow mb-0.5 block text-[10px]">Giải thích (VI) *</label>
            <textarea
              rows={2}
              value={item.explanation_vi}
              onChange={(e) => updateItem(i, { explanation_vi: e.target.value })}
              className="w-full rounded border p-2 text-sm"
              style={{
                background: 'var(--ed-paper-2, #FBF9F4)',
                borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
                color: 'var(--ed-ink, #0B2A6B)',
              }}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          border: '1px solid var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
          borderRadius: '6px',
          padding: '0.375rem 0.75rem',
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm câu hỏi
      </button>
    </div>
  );
}
