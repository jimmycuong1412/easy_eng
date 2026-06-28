# Render material_sections on detail pages — Design

**Date:** 2026-06-28
**Status:** Approved
**Author:** Jimmy Cuong (with Claude Code)
**Feature area:** Materials Library — `apps/web/src/app/[locale]/materials/[slug]/`

## Problem

The material detail page renders only the markdown `body` for grammar lessons,
dialogues, and reading passages. The structured `material_sections` rows
(grammar patterns/drills, dialogue lines, reading comprehension questions) are
stored in the DB but never displayed — `MaterialRenderer` only fetches
`vocabulary_items` (for vocab) and `material_assets` (for listening). The
AI-generated materials (and any section-based seed) therefore show only their
intro body, not their substance.

## Goal

Display each section-based material's `material_sections` content on the detail
page, following the existing vocab pattern: a core fetcher → fetched in
`page.tsx` → passed as a prop → rendered display-only above the existing
"mark done" completion button. No changes to auth, completion gating, or award
logic.

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Scope | Render sections for all three types (grammar, dialogue, reading) |
| Reading questions | Q&A list; answer hidden behind per-question "Show answer" toggle |
| Completion gating | Unchanged — keep the existing "mark done" button |
| Data flow | Fetch in `page.tsx` `Promise.all`, pass as prop (mirrors vocab) |
| Body vs sections | Keep `body` (intro/overview) AND render sections below it |
| Component structure | 3 new small presentational subcomponents |

## Architecture

```
page.tsx (server component)
  → fetchMaterialDetail(slug)
  → Promise.all[ progress, vocabularyItems, assets, sections ]
       sections fetched only when type ∈ {grammar_lesson, dialogue, reading_passage}
  → <MaterialRenderer ... sections={sections}>
       case grammar_lesson → <GrammarPattern sections=…>  → <MaterialBody/> + <GrammarSections/> + button
       case dialogue       → <DialoguePlayer sections=…>  → <MaterialBody/> + <DialogueLines/> + button
       case reading_passage→ <ReadingPassage sections=…>  → <MaterialBody/> + <ReadingComprehension/> + button
```

## Components & changes

### 1. Core fetcher — `packages/core/src/lib/queries/materials.ts`

Add, mirroring `fetchVocabularyItems`:

```ts
export interface MaterialSection {
  id: string;
  idx: number;
  kind: string;            // 'intro'|'pattern'|'drill'|'passage'|'audio'|'dialogue_line'|'test_block'
  body_vi: string | null;
  body_en: string | null;
  meta: Record<string, unknown>;
}

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

Export `fetchMaterialSections` and `MaterialSection` from the core package's
public surface (same place `fetchVocabularyItems` is exported).

### 2. Page wiring — `apps/web/src/app/[locale]/materials/[slug]/page.tsx`

- Import `fetchMaterialSections` (and `MaterialSection` type) from `@easyeng/core`.
- Extend the existing `Promise.all` (currently `[progress, vocabularyItems, assets]`)
  with a 4th entry:
  ```ts
  ['grammar_lesson','dialogue','reading_passage'].includes(material.type)
    ? fetchMaterialSections(supabase as any, material.id)
    : Promise.resolve([])
  ```
- Add `sections` to `RendererProps` and thread it into the three component cases.

### 3. New presentational subcomponents (`apps/web/src/components/materials/`)

All are `'use client'` only where they need state (ReadingComprehension toggles);
DialogueLines and GrammarSections can be server components (no state). Each takes
`sections: MaterialSection[]` and `locale: Locale`, and returns `null` when it has
no relevant sections.

**`DialogueLines.tsx`** — filters `kind === 'dialogue_line'`, renders a
speaker-labeled transcript. Each row: speaker (from `meta.speaker`, string-guarded),
the studied line (`body_en` for the English line), and the translation (`body_vi`).
Chat-style: alternating alignment or a simple labeled list; speaker name bold.

**`GrammarSections.tsx`** — filters `kind ∈ {intro, pattern, drill}`, renders each
as a labeled block. Kind → heading label (e.g. intro→"Giới thiệu"/"Intro",
pattern→"Cấu trúc"/"Pattern", drill→"Luyện tập"/"Practice"; use i18n keys if a
matching namespace exists, else literal bilingual labels). Body uses the
locale-appropriate field with fallback.

**`ReadingComprehension.tsx`** (`'use client'`) — renders:
- the `passage` section body (locale-appropriate) if present, then
- a Q&A list built from the `drill` section's `meta.questions` array
  (`{q_en, q_vi, answer_en}`). Question text shown per locale; each item has a
  "Show answer" / "Ẩn đáp án" toggle revealing `answer_en`. Defensive:
  `Array.isArray(meta.questions)` guard; renders passage-only if absent.

### 4. Wire into existing components

`GrammarPattern`, `DialoguePlayer`, `ReadingPassage` each gain a `sections:
MaterialSection[]` prop and render their new subcomponent between `<MaterialBody>`
and the completion button. No other logic changes.

## Locale & content rules

- `vi` → `body_vi` / `q_vi`; `en` → `body_en` / `q_en`.
- Fallback to the other language when the preferred field is null (matches the
  existing `resolveTitle`/`resolveSummary` fallback behavior).
- Comprehension answers are `answer_en` only (that's what the data carries),
  revealed on toggle.

## Error handling

- `fetchMaterialSections` throws on DB error (consistent with sibling fetchers;
  page error boundary handles it).
- Empty `sections` → each subcomponent renders `null`; older/section-less
  materials are visually unchanged.
- Malformed/missing `meta.questions` → ReadingComprehension renders the passage
  only and skips the Q&A block (`Array.isArray` guard).
- Non-string `meta.speaker` → DialogueLines falls back to a generic label
  (e.g. "—") rather than crashing.

## Testing

- **Core unit test**: `fetchMaterialSections` returns ordered rows from a mocked
  supabase client and throws on error (mirror existing query-test conventions; if
  none exist, a minimal mock-client test).
- **Component render tests** (RTL/Jest, matching existing component test style):
  - `DialogueLines`: renders one row per dialogue_line with speaker + line;
    non-string speaker falls back; empty → renders nothing.
  - `GrammarSections`: renders a labeled block per intro/pattern/drill; empty →
    nothing.
  - `ReadingComprehension`: passage shown; answers hidden until toggle; missing
    `meta.questions` → passage only, no crash.
- **App verification**: reload `grammar-verb-to-be-a1`, `dialogue-ordering-pho-a1`,
  `reading-urbanization-c1`; confirm sections render; screenshot.

## Task decomposition

1. Core `fetchMaterialSections` + `MaterialSection` type + export + unit test.
2. `DialogueLines` component + wire into `DialoguePlayer` + page fetch/prop threading.
3. `GrammarSections` component + wire into `GrammarPattern`.
4. `ReadingComprehension` component (answer toggle) + wire into `ReadingPassage`.
5. Verify all three in the running app.

(Task 2 carries the page.tsx fetch/prop plumbing since it's the first consumer;
Tasks 3–4 only add their prop + subcomponent.)

## Non-goals

- No quiz scoring / graded comprehension (stays read-only).
- No per-line audio playback for dialogues.
- No change to completion gating, gems/xp award flow, or auth.
- No new DB columns, RPCs, or migrations.
- No changes to vocab or listening rendering.

## Open questions

None — all decisions locked above.
