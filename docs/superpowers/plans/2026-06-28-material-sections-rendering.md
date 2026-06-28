# Material Sections Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display `material_sections` content (grammar patterns/drills, dialogue lines, reading comprehension questions) on the material detail page, following the existing vocab-item pattern.

**Architecture:** A core `fetchMaterialSections` fetcher → fetched in `page.tsx`'s `Promise.all` for section-based types → passed as a `sections` prop → rendered by three new presentational subcomponents, displayed above the unchanged "mark done" button.

**Tech Stack:** Next.js 14 (App Router, server + client components), TypeScript, `@easyeng/core` (shared queries/types), Jest + React Testing Library, next-intl.

## Global Constraints

- Mirror the existing `fetchVocabularyItems` fetcher exactly (same file, same shape, same error handling: `if (error) throw error`).
- No DB changes: no new tables, columns, RPCs, or migrations.
- No changes to completion gating, gems/xp award flow (`useAwardCompletion`), or auth. Sections render display-only, ABOVE the existing button.
- Keep the existing `<MaterialBody>` render; add sections BELOW it.
- Locale rule: `vi` → `*_vi` / `q_vi`; `en` → `*_en` / `q_en`; fall back to the other language when the preferred field is null (match `resolveTitle` behavior).
- `material_sections.kind` ∈ `{intro, pattern, drill, passage, audio, dialogue_line, test_block}`.
- Each subcomponent returns `null` when it has no relevant sections (older materials unaffected).
- `Locale` type is imported from `./MaterialCard` (existing convention in these components).
- `MaterialSection` type and `fetchMaterialSections` are defined in `packages/core/src/lib/queries/materials.ts`; the package re-exports them automatically via `export * from './lib/queries/materials'` in `packages/core/src/index.ts` (no index edit needed).
- Commit message trailer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Do not bypass the pre-commit hook (it lints; warnings are pre-existing and non-blocking).
- Run web tests with `pnpm --filter web test`; core tests with `pnpm --filter @easyeng/core test` (or the package's `test` script). Confirm the exact filter name from each package.json `name` field before running.

---

### Task 1: Core `fetchMaterialSections` + type + unit test

**Files:**
- Modify: `packages/core/src/lib/queries/materials.ts` (add type + fetcher near `fetchVocabularyItems`, ~line 250)
- Test: `packages/core/src/lib/queries/materials.sections.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `interface MaterialSection { id: string; idx: number; kind: string; body_vi: string | null; body_en: string | null; meta: Record<string, unknown>; }`
  - `fetchMaterialSections(supabase: SupabaseClient, materialId: string): Promise<MaterialSection[]>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/lib/queries/materials.sections.test.ts
import { fetchMaterialSections } from './materials';

function mockClient(result: { data?: unknown; error?: unknown }) {
  const order = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as any, from, select, eq, order };
}

describe('fetchMaterialSections', () => {
  it('selects sections for a material ordered by idx', async () => {
    const rows = [
      { id: 's1', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} },
      { id: 's2', idx: 1, kind: 'drill', body_vi: 'c', body_en: 'd', meta: { rule: 'x' } },
    ];
    const m = mockClient({ data: rows, error: null });
    const out = await fetchMaterialSections(m.client, 'mat-1');
    expect(m.from).toHaveBeenCalledWith('material_sections');
    expect(m.eq).toHaveBeenCalledWith('material_id', 'mat-1');
    expect(m.order).toHaveBeenCalledWith('idx', { ascending: true });
    expect(out).toEqual(rows);
  });

  it('returns [] when data is null', async () => {
    const m = mockClient({ data: null, error: null });
    expect(await fetchMaterialSections(m.client, 'mat-1')).toEqual([]);
  });

  it('throws when the query errors', async () => {
    const m = mockClient({ data: null, error: new Error('boom') });
    await expect(fetchMaterialSections(m.client, 'mat-1')).rejects.toThrow('boom');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (confirm filter name from `packages/core/package.json` `"name"` first): `pnpm --filter @easyeng/core test -- materials.sections`
Expected: FAIL — `fetchMaterialSections` is not exported / not a function.

- [ ] **Step 3: Add the type and fetcher**

In `packages/core/src/lib/queries/materials.ts`, immediately after the `fetchVocabularyItems` function (around line 250), add:

```ts
/**
 * A single structured section of a material (grammar pattern/drill, dialogue
 * line, reading passage/comprehension). Mirrors the `material_sections` table.
 */
export interface MaterialSection {
  id: string;
  idx: number;
  kind: string;
  body_vi: string | null;
  body_en: string | null;
  meta: Record<string, unknown>;
}

/**
 * Fetch ordered sections for a section-based material (grammar/dialogue/reading).
 */
export async function fetchMaterialSections(
  supabase: SupabaseClient,
  materialId: string,
): Promise<MaterialSection[]> {
  const { data, error } = await supabase
    .from('material_sections')
    .select('id, idx, kind, body_vi, body_en, meta')
    .eq('material_id', materialId)
    .order('idx', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as MaterialSection[];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @easyeng/core test -- materials.sections`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/lib/queries/materials.ts packages/core/src/lib/queries/materials.sections.test.ts
git commit -m "feat(materials): add fetchMaterialSections core fetcher + MaterialSection type"
```

---

### Task 2: DialogueLines component + page plumbing + wire into DialoguePlayer

**Files:**
- Create: `apps/web/src/components/materials/DialogueLines.tsx`
- Test: `apps/web/src/components/materials/__tests__/DialogueLines.test.tsx` (new)
- Modify: `apps/web/src/app/[locale]/materials/[slug]/page.tsx` (fetch sections + thread prop)
- Modify: `apps/web/src/components/materials/DialoguePlayer.tsx` (accept + render sections)

**Interfaces:**
- Consumes: `MaterialSection` from `@easyeng/core` (Task 1); `Locale` from `./MaterialCard`.
- Produces:
  - `DialogueLines({ sections, locale }: { sections: MaterialSection[]; locale: Locale })` — renders `dialogue_line` sections as a speaker-labeled transcript; returns `null` if none.
  - Page now passes `sections={sections}` into `DialoguePlayer`, `GrammarPattern`, `ReadingPassage` (the latter two consumed in Tasks 3–4).

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/src/components/materials/__tests__/DialogueLines.test.tsx
import { render, screen } from '@testing-library/react';
import { DialogueLines } from '../DialogueLines';
import type { MaterialSection } from '@easyeng/core';

const lines: MaterialSection[] = [
  { id: '1', idx: 0, kind: 'dialogue_line', body_vi: 'Chào anh!', body_en: 'Hello!', meta: { speaker: 'Waiter' } },
  { id: '2', idx: 1, kind: 'dialogue_line', body_vi: 'Chào chị.', body_en: 'Hi.', meta: { speaker: 'Customer' } },
];

describe('DialogueLines', () => {
  it('renders one row per dialogue_line with speaker and line', () => {
    render(<DialogueLines sections={lines} locale="en" />);
    expect(screen.getByText('Waiter')).toBeInTheDocument();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Hi.')).toBeInTheDocument();
  });

  it('shows the Vietnamese line for vi locale', () => {
    render(<DialogueLines sections={lines} locale="vi" />);
    expect(screen.getByText('Chào anh!')).toBeInTheDocument();
  });

  it('falls back to a generic label when speaker is not a string', () => {
    const bad: MaterialSection[] = [
      { id: '3', idx: 0, kind: 'dialogue_line', body_vi: 'x', body_en: 'y', meta: {} },
    ];
    render(<DialogueLines sections={bad} locale="en" />);
    expect(screen.getByText('y')).toBeInTheDocument();
  });

  it('renders nothing when there are no dialogue_line sections', () => {
    const { container } = render(
      <DialogueLines sections={[{ id: '4', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (confirm web filter from `apps/web/package.json` `"name"`, which is `web`): `pnpm --filter web test -- DialogueLines`
Expected: FAIL — cannot find module `../DialogueLines`.

- [ ] **Step 3: Write `DialogueLines.tsx`**

```tsx
// apps/web/src/components/materials/DialogueLines.tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- DialogueLines`
Expected: PASS (4 tests).

- [ ] **Step 5: Thread sections through the page**

In `apps/web/src/app/[locale]/materials/[slug]/page.tsx`:

(a) Add to the `@easyeng/core` import block (with the other fetchers):
```ts
  fetchMaterialSections,
  type MaterialSection,
```

(b) Replace the `Promise.all` (currently `[progress, vocabularyItems, assets]`) with a 4-tuple:
```ts
  const [progress, vocabularyItems, assets, sections] = await Promise.all([
    userId ? fetchUserProgress(supabase as any, userId, material.id) : Promise.resolve(null),
    material.type === 'vocabulary_pack'
      ? fetchVocabularyItems(supabase as any, material.id)
      : Promise.resolve([]),
    material.type === 'listening_audio'
      ? fetchMaterialAssets(supabase as any, material.id)
      : Promise.resolve([]),
    ['grammar_lesson', 'dialogue', 'reading_passage'].includes(material.type)
      ? fetchMaterialSections(supabase as any, material.id)
      : Promise.resolve([] as MaterialSection[]),
  ]);
```

(c) Add `sections` to `RendererProps`:
```ts
  sections: MaterialSection[];
```

(d) Pass `sections={sections}` in the `<MaterialRenderer ... />` call (alongside `vocabularyItems={vocabularyItems}`).

(e) Destructure `sections` in `MaterialRenderer({ ... })` and pass `sections={sections}` into the `DialoguePlayer`, `GrammarPattern`, and `ReadingPassage` cases. (GrammarPattern/ReadingPassage accept the prop in Tasks 3–4; adding it now is forward-compatible since those components will ignore an unknown prop until wired — but to avoid a TS error, add the optional prop to those two components' interfaces in this task as `sections?: MaterialSection[]` and actually consume them in 3–4. Simplest: add `sections` to all three component prop interfaces now as required, and render only in DialoguePlayer this task; Grammar/Reading render in 3–4.)

To keep this task self-contained and type-clean: in THIS task, add `sections: MaterialSection[]` to the prop interfaces of `GrammarPattern` and `ReadingPassage` too (they just won't use it yet), and pass it in all three cases.

- [ ] **Step 6: Wire DialogueLines into DialoguePlayer**

In `apps/web/src/components/materials/DialoguePlayer.tsx`:

(a) Add imports:
```ts
import { DialogueLines } from './DialogueLines';
import type { MaterialSection } from '@easyeng/core';
```

(b) Add `sections` to `DialoguePlayerProps`:
```ts
  sections: MaterialSection[];
```

(c) Destructure `sections` in the component params, and render `<DialogueLines>` between `<MaterialBody>` and the completion block:
```tsx
      <MaterialBody material={material} locale={locale} />

      <DialogueLines sections={sections} locale={locale} />

      {alreadyCompleted ? (
```

- [ ] **Step 7: Add the placeholder prop to Grammar/Reading interfaces (type-clean)**

In `GrammarPattern.tsx` and `ReadingPassage.tsx`, add to each props interface:
```ts
  sections: MaterialSection[];
```
and add the import `import type { MaterialSection } from '@easyeng/core';`, and destructure `sections` in params (unused for now — prefix with eslint-disable only if lint complains; otherwise reference via `void sections;` is NOT needed since it's a prop). They will consume it in Tasks 3–4.

- [ ] **Step 8: Run web tests + typecheck**

Run: `pnpm --filter web test -- DialogueLines`
Expected: PASS.
Run: `pnpm --filter web exec tsc --noEmit` (or the repo's typecheck script if present, e.g. `pnpm --filter web type-check`)
Expected: no type errors in the changed files.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/materials/DialogueLines.tsx apps/web/src/components/materials/__tests__/DialogueLines.test.tsx apps/web/src/app/[locale]/materials/[slug]/page.tsx apps/web/src/components/materials/DialoguePlayer.tsx apps/web/src/components/materials/GrammarPattern.tsx apps/web/src/components/materials/ReadingPassage.tsx
git commit -m "feat(materials): render dialogue lines from sections + page section plumbing"
```

---

### Task 3: GrammarSections component + wire into GrammarPattern

**Files:**
- Create: `apps/web/src/components/materials/GrammarSections.tsx`
- Test: `apps/web/src/components/materials/__tests__/GrammarSections.test.tsx` (new)
- Modify: `apps/web/src/components/materials/GrammarPattern.tsx` (render sections)

**Interfaces:**
- Consumes: `MaterialSection` (Task 1); `Locale` from `./MaterialCard`; the `sections` prop already added to `GrammarPatternProps` in Task 2.
- Produces: `GrammarSections({ sections, locale })` — renders `intro`/`pattern`/`drill` sections as labeled blocks; returns `null` if none.

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/src/components/materials/__tests__/GrammarSections.test.tsx
import { render, screen } from '@testing-library/react';
import { GrammarSections } from '../GrammarSections';
import type { MaterialSection } from '@easyeng/core';

const sections: MaterialSection[] = [
  { id: '1', idx: 0, kind: 'intro', body_vi: 'Giới thiệu', body_en: 'Intro', meta: {} },
  { id: '2', idx: 1, kind: 'pattern', body_vi: 'Cấu trúc câu', body_en: 'Sentence pattern', meta: {} },
  { id: '3', idx: 2, kind: 'drill', body_vi: 'Bài tập', body_en: 'Practice drill', meta: {} },
];

describe('GrammarSections', () => {
  it('renders a block per intro/pattern/drill section (en locale)', () => {
    render(<GrammarSections sections={sections} locale="en" />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Sentence pattern')).toBeInTheDocument();
    expect(screen.getByText('Practice drill')).toBeInTheDocument();
  });

  it('shows Vietnamese bodies for vi locale', () => {
    render(<GrammarSections sections={sections} locale="vi" />);
    expect(screen.getByText('Cấu trúc câu')).toBeInTheDocument();
  });

  it('renders nothing when there are no grammar sections', () => {
    const { container } = render(
      <GrammarSections sections={[{ id: '9', idx: 0, kind: 'dialogue_line', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- GrammarSections`
Expected: FAIL — cannot find module `../GrammarSections`.

- [ ] **Step 3: Write `GrammarSections.tsx`**

```tsx
// apps/web/src/components/materials/GrammarSections.tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- GrammarSections`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire into GrammarPattern**

In `apps/web/src/components/materials/GrammarPattern.tsx`:

(a) Add import:
```ts
import { GrammarSections } from './GrammarSections';
```
(`MaterialSection` import + `sections` prop were added in Task 2.)

(b) Render between `<MaterialBody>` and the completion block:
```tsx
      <MaterialBody material={material} locale={locale} />

      <GrammarSections sections={sections} locale={locale} />

      {alreadyCompleted ? (
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter web test -- GrammarSections`
Expected: PASS.
Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/materials/GrammarSections.tsx apps/web/src/components/materials/__tests__/GrammarSections.test.tsx apps/web/src/components/materials/GrammarPattern.tsx
git commit -m "feat(materials): render grammar lesson sections (intro/pattern/drill)"
```

---

### Task 4: ReadingComprehension component + wire into ReadingPassage

**Files:**
- Create: `apps/web/src/components/materials/ReadingComprehension.tsx`
- Test: `apps/web/src/components/materials/__tests__/ReadingComprehension.test.tsx` (new)
- Modify: `apps/web/src/components/materials/ReadingPassage.tsx` (render sections)

**Interfaces:**
- Consumes: `MaterialSection` (Task 1); `Locale` from `./MaterialCard`; the `sections` prop already added to `ReadingPassageProps` in Task 2.
- Produces: `ReadingComprehension({ sections, locale })` — renders the `passage` section body, then a Q&A list from the `drill` section's `meta.questions`, each answer behind a toggle; returns `null` if neither exists.

- [ ] **Step 1: Write the failing component test**

```tsx
// apps/web/src/components/materials/__tests__/ReadingComprehension.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ReadingComprehension } from '../ReadingComprehension';
import type { MaterialSection } from '@easyeng/core';

const sections: MaterialSection[] = [
  { id: 'p', idx: 0, kind: 'passage', body_vi: 'Đoạn văn.', body_en: 'The passage.', meta: {} },
  {
    id: 'd', idx: 1, kind: 'drill', body_vi: 'Câu hỏi', body_en: 'Questions',
    meta: { questions: [
      { q_en: 'Where?', q_vi: 'Ở đâu?', answer_en: 'On the river.' },
      { q_en: 'Why?', q_vi: 'Tại sao?', answer_en: 'Because.' },
    ] },
  },
];

describe('ReadingComprehension', () => {
  it('renders the passage and the question text', () => {
    render(<ReadingComprehension sections={sections} locale="en" />);
    expect(screen.getByText('The passage.')).toBeInTheDocument();
    expect(screen.getByText('Where?')).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();
  });

  it('hides answers until the per-question toggle is clicked', () => {
    render(<ReadingComprehension sections={sections} locale="en" />);
    expect(screen.queryByText('On the river.')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('reveal-answer')[0]);
    expect(screen.getByText('On the river.')).toBeInTheDocument();
    // second answer still hidden
    expect(screen.queryByText('Because.')).not.toBeInTheDocument();
  });

  it('renders the passage only when meta.questions is missing', () => {
    const passageOnly: MaterialSection[] = [
      { id: 'p', idx: 0, kind: 'passage', body_vi: 'x', body_en: 'Only passage.', meta: {} },
      { id: 'd', idx: 1, kind: 'drill', body_vi: 'q', body_en: 'q', meta: {} },
    ];
    render(<ReadingComprehension sections={passageOnly} locale="en" />);
    expect(screen.getByText('Only passage.')).toBeInTheDocument();
    expect(screen.queryByTestId('reveal-answer')).not.toBeInTheDocument();
  });

  it('renders nothing when there are no passage or drill sections', () => {
    const { container } = render(
      <ReadingComprehension sections={[{ id: 'i', idx: 0, kind: 'intro', body_vi: 'a', body_en: 'b', meta: {} }]} locale="en" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- ReadingComprehension`
Expected: FAIL — cannot find module `../ReadingComprehension`.

- [ ] **Step 3: Write `ReadingComprehension.tsx`**

```tsx
// apps/web/src/components/materials/ReadingComprehension.tsx
/**
 * <ReadingComprehension>
 *
 * Renders the passage section body of a reading_passage material, then a
 * comprehension Q&A list drawn from the drill section's `meta.questions`.
 * Each answer is hidden behind a per-question "Show answer" toggle. Read-only;
 * no scoring (completion stays on the existing "mark done" button).
 */

'use client';

import { useState } from 'react';

import type { Locale } from './MaterialCard';
import type { MaterialSection } from '@easyeng/core';

export interface ReadingComprehensionProps {
  sections: MaterialSection[];
  locale: Locale;
}

interface ComprehensionQuestion {
  q_en: string;
  q_vi: string;
  answer_en: string;
}

function readQuestions(meta: Record<string, unknown>): ComprehensionQuestion[] {
  const q = meta?.questions;
  if (!Array.isArray(q)) return [];
  return q.filter(
    (item): item is ComprehensionQuestion =>
      !!item && typeof item === 'object' &&
      typeof (item as any).answer_en === 'string',
  );
}

export function ReadingComprehension({ sections, locale }: ReadingComprehensionProps) {
  const passage = sections.find((s) => s.kind === 'passage');
  const drill = sections.find((s) => s.kind === 'drill');
  const questions = drill ? readQuestions(drill.meta) : [];

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  if (!passage && questions.length === 0) return null;

  const passageBody = passage
    ? locale === 'vi'
      ? passage.body_vi ?? passage.body_en
      : passage.body_en ?? passage.body_vi
    : null;

  return (
    <div className="space-y-5" data-testid="reading-comprehension">
      {passageBody && (
        <p className="whitespace-pre-line text-base leading-relaxed text-[color:var(--ed-ink-2,#0A1F4F)]">
          {passageBody}
        </p>
      )}

      {questions.length > 0 && (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="ed-card px-4 py-3" data-testid="comprehension-question">
              <p className="text-base text-[color:var(--ed-ink-2,#0A1F4F)]">
                {locale === 'vi' ? q.q_vi || q.q_en : q.q_en}
              </p>
              {revealed[i] ? (
                <p className="mt-2 text-sm font-medium text-[color:var(--ed-ink,#0B2A6B)]">
                  {q.answer_en}
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-sm underline text-[color:var(--ed-ink-mute,#6B7280)]"
                  data-testid="reveal-answer"
                  onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
                >
                  {locale === 'vi' ? 'Xem đáp án' : 'Show answer'}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test -- ReadingComprehension`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire into ReadingPassage**

In `apps/web/src/components/materials/ReadingPassage.tsx`:

(a) Add import:
```ts
import { ReadingComprehension } from './ReadingComprehension';
```
(`MaterialSection` import + `sections` prop were added in Task 2.)

(b) Render between `<MaterialBody>` and the `practiceSentence` block:
```tsx
      <MaterialBody material={material} locale={locale} />

      <ReadingComprehension sections={sections} locale={locale} />

      {practiceSentence && <PronunciationPractice text={practiceSentence} />}
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm --filter web test -- ReadingComprehension`
Expected: PASS.
Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/materials/ReadingComprehension.tsx apps/web/src/components/materials/__tests__/ReadingComprehension.test.tsx apps/web/src/components/materials/ReadingPassage.tsx
git commit -m "feat(materials): render reading passage + comprehension Q&A with answer toggle"
```

---

### Task 5: Verify all three in the running app

**Files:** none.

**Interfaces:**
- Consumes: the full feature.
- Produces: a verification report + screenshots.

- [ ] **Step 1: Ensure dev server is running**

Use the preview tooling (`preview_start` with config "Frontend (Next.js)", port 3000). It talks to the remote Supabase that already has the 30 materials.

- [ ] **Step 2: Reload each detail page and snapshot/screenshot**

Navigate (via `preview_eval` `window.location.href`) and screenshot each:
- `http://localhost:3000/vi/materials/dialogue-ordering-pho-a1` → expect speaker-labeled lines (Waiter/Customer) with English + Vietnamese.
- `http://localhost:3000/vi/materials/grammar-verb-to-be-a1` → expect labeled intro/pattern/drill blocks below the body.
- `http://localhost:3000/vi/materials/reading-urbanization-c1` → expect passage + comprehension questions with "Xem đáp án" toggles; click one and confirm the answer reveals.

- [ ] **Step 3: Check console for errors**

`preview_console_logs` level=error → expect none.

- [ ] **Step 4: Report**

Report per-page: sections rendered (yes/no), the answer-toggle works, no console errors. Share screenshots.

---

## Self-Review

**Spec coverage:**
- Core `fetchMaterialSections` + type + export → Task 1 (export is automatic via `export *`). ✓
- Page fetch in `Promise.all` only for the 3 types + prop threading → Task 2 Step 5. ✓
- DialogueLines (speaker transcript, fallback) → Task 2. ✓
- GrammarSections (intro/pattern/drill labeled) → Task 3. ✓
- ReadingComprehension (passage + Q&A, answer toggle, missing-questions guard) → Task 4. ✓
- Keep body, add sections below → each wire-in step inserts after `<MaterialBody>`. ✓
- Completion/award/auth unchanged → no task touches `useAwardCompletion` or the button. ✓
- Locale + fallback rules → encoded in every component's body/question resolution. ✓
- Empty/malformed guards → `null` returns + `Array.isArray`/typeof guards in Tasks 2–4. ✓
- App verification of the 3 pages → Task 5. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output. ✓

**Type consistency:** `MaterialSection` fields (`id/idx/kind/body_vi/body_en/meta`) identical across Tasks 1–4. `sections: MaterialSection[]` prop name consistent across page + all three components (added once in Task 2, consumed in 2/3/4). `Locale` imported from `./MaterialCard` everywhere (matches existing components). ✓

**Note on Task 2 breadth:** Task 2 adds the `sections` prop to all three component interfaces (so the page compiles type-clean) but only renders in DialoguePlayer; Grammar/Reading render their sections in Tasks 3/4. This is called out explicitly in Task 2 Step 7 so a reviewer expects the unused-prop interim state.
