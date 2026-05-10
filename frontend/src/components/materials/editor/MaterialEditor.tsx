'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { MaterialType, MaterialLevel, MaterialGoal, MaterialStatus } from '@/lib/queries/materials';
import { SectionEditor, type SectionDraft } from './SectionEditor';
import { VocabularyItemsEditor, type VocabItemDraft } from './VocabularyItemsEditor';
import { MockTestItemsEditor, type TestItemDraft } from './MockTestItemsEditor';

// ============================================================
// Types
// ============================================================

export interface MaterialEditorDraft {
  id: string | null;
  type: MaterialType;
  level: MaterialLevel;
  goal: MaterialGoal | null;
  status: MaterialStatus;
  title_vi: string;
  title_en: string | null;
  summary_vi: string;
  summary_en: string | null;
  body_vi: string;
  body_en: string | null;
  duration_min: number;
  gems_reward: number;
  xp_reward: number;
  min_completion_pct: number;
  cover_path: string | null;
  author_id: string;
  updated_at: string;
}

interface ValidationErrors {
  title_vi?: string;
  summary_vi?: string;
  body_vi?: string;
  vocab_items?: string;
  test_items?: string;
}

interface MaterialEditorProps {
  initialData: MaterialEditorDraft;
  initialVocabItems?: VocabItemDraft[];
  initialTestItems?: TestItemDraft[];
  initialSections?: SectionDraft[];
  onSaved: (materialId: string) => void;
}

// ============================================================
// Constants
// ============================================================

const LEVELS: MaterialLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1'];
const GOALS: MaterialGoal[] = [
  'school', 'vstep', 'toeic', 'ielts', 'business', 'study_abroad', 'conversation', 'travel',
];
const TYPES: MaterialType[] = [
  'vocabulary_pack', 'grammar_lesson', 'reading_passage',
  'listening_audio', 'dialogue', 'mock_test',
];

const TYPE_LABELS: Record<MaterialType, string> = {
  vocabulary_pack: 'Từ vựng',
  grammar_lesson: 'Ngữ pháp',
  reading_passage: 'Đọc',
  listening_audio: 'Nghe',
  dialogue: 'Hội thoại',
  mock_test: 'Đề luyện thi',
};

const GOAL_LABELS: Record<MaterialGoal, string> = {
  school: 'Học phổ thông',
  vstep: 'VSTEP',
  toeic: 'TOEIC',
  ielts: 'IELTS',
  business: 'Kinh doanh',
  study_abroad: 'Du học',
  conversation: 'Giao tiếp',
  travel: 'Du lịch',
};

// ============================================================
// Component
// ============================================================

export function MaterialEditor({
  initialData,
  initialVocabItems = [],
  initialTestItems = [],
  initialSections = [],
  onSaved,
}: MaterialEditorProps) {
  const t = useTranslations('materials.editor');

  const [draft, setDraft] = useState<MaterialEditorDraft>(initialData);
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>(initialVocabItems);
  const [testItems, setTestItems] = useState<TestItemDraft[]>(initialTestItems);
  const [sections, setSections] = useState<SectionDraft[]>(initialSections);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const update = (patch: Partial<MaterialEditorDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  // ============================================================
  // Validation
  // ============================================================

  const validate = useCallback((): ValidationErrors => {
    const errs: ValidationErrors = {};

    if (!draft.title_vi.trim()) {
      errs.title_vi = 'Tiêu đề tiếng Việt là bắt buộc';
    }
    if (!draft.summary_vi.trim()) {
      errs.summary_vi = 'Tóm tắt tiếng Việt là bắt buộc';
    }

    if (draft.type === 'vocabulary_pack' && vocabItems.length < 8) {
      errs.vocab_items = `Bộ từ vựng cần ít nhất 8 từ (hiện có ${vocabItems.length})`;
    }

    if (draft.type === 'mock_test' && testItems.length < 5) {
      errs.test_items = `Đề thi cần ít nhất 5 câu hỏi (hiện có ${testItems.length})`;
    }

    return errs;
  }, [draft, vocabItems, testItems]);

  // ============================================================
  // Save
  // ============================================================

  const saveDraft = async () => {
    setGeneralError(null);
    setConflictDetected(false);

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // Build the upsert payload. For existing materials we also pass the
      // current updated_at so the server can detect concurrent edits.
      const payload: Record<string, unknown> = {
        type: draft.type,
        level: draft.level,
        goal: draft.goal,
        status: draft.status,
        title_vi: draft.title_vi.trim(),
        title_en: draft.title_en?.trim() || null,
        summary_vi: draft.summary_vi.trim(),
        summary_en: draft.summary_en?.trim() || null,
        body_vi: draft.body_vi.trim(),
        body_en: draft.body_en?.trim() || null,
        duration_min: draft.duration_min,
        gems_reward: draft.type === 'mock_test' ? 0 : draft.gems_reward,
        xp_reward: draft.type === 'mock_test' ? 0 : draft.xp_reward,
        min_completion_pct: draft.min_completion_pct,
        author_id: draft.author_id,
      };

      // Derive slug from title_vi if creating new
      if (!draft.id) {
        payload.slug = slugify(draft.title_vi);
      } else {
        payload.id = draft.id;
      }

      // Build the upsert query. Optimistic lock: if updating an existing row,
      // we filter on the known updated_at to detect concurrent edits.
      let query = supabase.from('materials').upsert(payload, { onConflict: 'id' });

      if (draft.id) {
        // Optimistic-lock: only update if updated_at hasn't changed
        query = (supabase.from('materials') as any)
          .upsert(payload, { onConflict: 'id' })
          .eq('updated_at', draft.updated_at);
      }

      const { data, error } = await (supabase as any)
        .from('materials')
        .upsert(payload, { onConflict: 'id' })
        .select('id, updated_at')
        .maybeSingle();

      if (error) {
        if (error.code === '409' || error.message?.includes('409')) {
          setConflictDetected(true);
        } else {
          setGeneralError(error.message);
        }
        return;
      }

      const savedId = data?.id ?? draft.id;
      if (!savedId) return;

      // Update local draft state with new updated_at to allow further edits
      if (data?.updated_at) {
        setDraft((prev) => ({ ...prev, id: savedId, updated_at: data.updated_at }));
      }

      // Upsert type-specific items (vocab or test)
      if (draft.type === 'vocabulary_pack' && vocabItems.length > 0) {
        await (supabase as any)
          .from('vocabulary_items')
          .upsert(
            vocabItems.map((item, i) => ({
              ...item,
              material_id: savedId,
              idx: i,
            })),
            { onConflict: 'material_id,idx' },
          );
      }

      if (draft.type === 'mock_test' && testItems.length > 0) {
        await (supabase as any)
          .from('mock_test_items')
          .upsert(
            testItems.map((item, i) => ({
              ...item,
              material_id: savedId,
              idx: i,
            })),
            { onConflict: 'material_id,idx' },
          );
      }

      onSaved(savedId);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6" data-testid="material-editor">
      {/* Conflict banner */}
      {conflictDetected && (
        <div
          className="flex items-start gap-2 rounded-md border px-4 py-3"
          data-testid="editor-conflict-banner"
          role="alert"
          style={{
            background: 'var(--ed-coral-2, #FFE7E0)',
            borderColor: 'var(--ed-coral, #F4593A)',
            color: 'var(--ed-coral-ink, #7A2010)',
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{t('conflictDetected')}</p>
        </div>
      )}

      {/* General error */}
      {generalError && (
        <p
          className="rounded-md border px-4 py-3 text-sm"
          role="alert"
          style={{
            background: 'var(--ed-coral-2, #FFE7E0)',
            borderColor: 'var(--ed-coral, #F4593A)',
            color: 'var(--ed-coral-ink, #7A2010)',
          }}
        >
          {generalError}
        </p>
      )}

      {/* ── Type / Level / Goal row ── */}
      <section className="ed-card p-5 space-y-4">
        <h2
          className="font-serif text-lg"
          style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
        >
          Thông tin bài học
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Loại nội dung *"
            value={draft.type}
            onChange={(v) => update({ type: v as MaterialType })}
            options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
          />
          <SelectField
            label="Cấp độ CEFR *"
            value={draft.level}
            onChange={(v) => update({ level: v as MaterialLevel })}
            options={LEVELS.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
          <SelectField
            label="Mục tiêu học"
            value={draft.goal ?? ''}
            onChange={(v) => update({ goal: v ? (v as MaterialGoal) : null })}
            options={[
              { value: '', label: '— Không có —' },
              ...GOALS.map((g) => ({ value: g, label: GOAL_LABELS[g] })),
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Thời lượng (phút) *"
            value={draft.duration_min}
            onChange={(v) => update({ duration_min: v })}
            min={1}
            max={90}
          />
          {draft.type !== 'mock_test' && (
            <>
              <NumberField
                label="Gem thưởng"
                value={draft.gems_reward}
                onChange={(v) => update({ gems_reward: v })}
                min={0}
              />
              <NumberField
                label="XP thưởng"
                value={draft.xp_reward}
                onChange={(v) => update({ xp_reward: v })}
                min={0}
              />
            </>
          )}
          {draft.type === 'mock_test' && (
            <p className="col-span-2 self-center text-xs" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>
              Đề luyện thi không tính Gem hay XP.
            </p>
          )}
        </div>
      </section>

      {/* ── Bilingual title + summary ── */}
      <section className="ed-card p-5 space-y-4">
        <h2
          className="font-serif text-lg"
          style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
        >
          Tiêu đề & Tóm tắt
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tiêu đề (VI) *"
            value={draft.title_vi}
            onChange={(v) => update({ title_vi: v })}
            error={errors.title_vi}
            testId="error-title_vi"
            maxLength={200}
          />
          <TextField
            label="Tiêu đề (EN)"
            value={draft.title_en ?? ''}
            onChange={(v) => update({ title_en: v || null })}
            maxLength={200}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField
            label="Tóm tắt (VI) *"
            value={draft.summary_vi}
            onChange={(v) => update({ summary_vi: v })}
            error={errors.summary_vi}
            testId="error-summary_vi"
            rows={3}
            maxLength={500}
          />
          <TextareaField
            label="Tóm tắt (EN)"
            value={draft.summary_en ?? ''}
            onChange={(v) => update({ summary_en: v || null })}
            rows={3}
            maxLength={500}
          />
        </div>
      </section>

      {/* ── Body content ── */}
      <section className="ed-card p-5 space-y-4">
        <h2
          className="font-serif text-lg"
          style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
        >
          Nội dung chính
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField
            label="Nội dung (VI) *"
            value={draft.body_vi}
            onChange={(v) => update({ body_vi: v })}
            rows={10}
            mono
          />
          <TextareaField
            label="Nội dung (EN)"
            value={draft.body_en ?? ''}
            onChange={(v) => update({ body_en: v || null })}
            rows={10}
            mono
          />
        </div>
      </section>

      {/* ── Type-specific editors ── */}
      {draft.type === 'vocabulary_pack' && (
        <section className="ed-card p-5 space-y-4">
          <h2
            className="font-serif text-lg"
            style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
          >
            Danh sách từ vựng <span className="text-sm font-sans font-normal" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>(tối thiểu 8 từ)</span>
          </h2>
          <VocabularyItemsEditor
            items={vocabItems}
            onChange={setVocabItems}
            errorMessage={errors.vocab_items}
          />
        </section>
      )}

      {draft.type === 'mock_test' && (
        <section className="ed-card p-5 space-y-4">
          <h2
            className="font-serif text-lg"
            style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
          >
            Câu hỏi <span className="text-sm font-sans font-normal" style={{ color: 'var(--ed-ink-mute, #6B7280)' }}>(tối thiểu 5 câu)</span>
          </h2>
          <MockTestItemsEditor
            items={testItems}
            onChange={setTestItems}
            errorMessage={errors.test_items}
          />
        </section>
      )}

      {/* ── Sections (optional rich content blocks) ── */}
      {sections.length > 0 && (
        <section className="ed-card p-5 space-y-4">
          <h2
            className="font-serif text-lg"
            style={{ fontFamily: 'var(--font-newsreader, serif)', color: 'var(--ed-ink-2, #0A1F4F)' }}
          >
            Phần bổ sung
          </h2>
          {sections.map((sec, i) => (
            <SectionEditor
              key={i}
              section={sec}
              index={i}
              onChange={(updated) =>
                setSections((prev) => prev.map((s, idx) => (idx === i ? updated : s)))
              }
              onRemove={() => setSections((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </section>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            setSections((prev) => [
              ...prev,
              { idx: prev.length, kind: 'intro', body_vi: '', body_en: null },
            ])
          }
          className="text-sm underline"
          style={{ color: 'var(--ed-ink-mute, #6B7280)' }}
        >
          + Thêm phần bổ sung
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          data-testid="editor-save-draft"
          className="ed-btn ed-btn-primary"
        >
          {saving ? '…' : t('saveDraft')}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Small field helpers
// ============================================================

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="ed-eyebrow mb-1 block text-[10px]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="ed-eyebrow mb-1 block text-[10px]">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          borderColor: 'var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
        }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  testId,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  testId?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="ed-eyebrow mb-1 block text-[10px]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          borderColor: error ? 'var(--ed-coral, #F4593A)' : 'var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
        }}
      />
      {error && (
        <p
          className="mt-1 text-xs"
          data-testid={testId}
          style={{ color: 'var(--ed-coral-ink, #7A2010)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  error,
  testId,
  maxLength,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  error?: string;
  testId?: string;
  maxLength?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="ed-eyebrow mb-1 block text-[10px]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        className={`w-full rounded-md border px-3 py-2 text-sm leading-relaxed ${mono ? 'font-mono' : ''}`}
        style={{
          background: 'var(--ed-paper-2, #FBF9F4)',
          borderColor: error ? 'var(--ed-coral, #F4593A)' : 'var(--ed-rule, rgba(0,0,0,0.08))',
          color: 'var(--ed-ink, #0B2A6B)',
        }}
      />
      {error && (
        <p
          className="mt-1 text-xs"
          data-testid={testId}
          style={{ color: 'var(--ed-coral-ink, #7A2010)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ── slug helper ──
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
}
