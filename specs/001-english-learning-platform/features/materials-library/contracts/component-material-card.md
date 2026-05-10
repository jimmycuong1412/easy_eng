# Component contract — `<MaterialCard>`

**File**: `frontend/src/components/materials/MaterialCard.tsx`
**Used by**: catalog (`/materials`), personal library, dashboard "Recommended next" widget, collections page.

The MaterialCard is the only catalog tile in the codebase. Every list of materials anywhere in the app MUST use it (no ad-hoc card layouts) so the editorial appearance stays consistent.

## Props

```ts
import type { Locale } from '@/i18n/config';
import type { MaterialSummary, MaterialProgressLite } from '@/lib/queries/materials';

export interface MaterialCardProps {
  /** Resolved (per-locale) summary of the material. Required. */
  material: MaterialSummary;

  /** Personal progress for this material, when the user is signed in. */
  progress?: MaterialProgressLite | null;

  /** Active locale. Determines which title/summary string to render. */
  locale: Locale;

  /** Visual size — affects spacing, font sizes, image aspect ratio. */
  size?: 'sm' | 'md' | 'lg';

  /** Optional label rendered as a coral chip (e.g. "RECOMMENDED", "NEW"). */
  badge?: 'recommended' | 'new' | 'pinned' | null;

  /** Whether the user is anonymous; if so we omit progress-related UI and show a sign-in CTA on hover. */
  anonymous?: boolean;

  /** Click target. Defaults to `/{locale}/materials/{slug}`. */
  href?: string;

  /** Optional className passthrough for layout. */
  className?: string;
}
```

## Required visual elements

A MaterialCard MUST always render, regardless of size:

1. **Type pill** — coloured `.ed-chip` with `kindLabelVi` mapping (`vocabulary_pack` → "Từ vựng", `grammar_lesson` → "Ngữ pháp", `reading_passage` → "Đọc", `listening_audio` → "Nghe", `dialogue` → "Hội thoại", `mock_test` → "Đề luyện thi"). On `en` locale uses English labels.
2. **Level badge** — uppercase A1 / A2 / B1 / B2 / C1 in mono.
3. **Title** — Newsreader serif, dark navy ink, ≥ 18 px.
4. **Summary** — 2 lines max with `line-clamp-2`, ink-soft.
5. **Duration** — `Clock` icon + `"~{n} phút"` in vi or `"~{n} min"` in en.
6. **Reward chip** — coral pill `"+{gems_reward} ⟡"` (using gem icon).

Conditionally:

- **Cover image** when `size ∈ {md, lg}` AND `material.cover_url`. Rendered with `next/image`, aspect-ratio 4:5 for `lg`, 16:10 for `md`.
- **Progress strip** when `progress` is provided: 3px coral fill underneath, width = `progress.completion_pct%`. Tiny "đã hoàn thành" check appears when `progress.state === 'completed'`.
- **Goal eyebrow** when `material.goal` is set: small mono "IELTS · BAND 6.5" style label above the title.
- **Anonymous lock**: when `anonymous`, the bottom-right shows a small lock icon + tooltip "Đăng nhập để theo dõi tiến độ".
- **Badge** prop renders a coral chip in the top-right ("MỚI", "ĐỀ XUẤT", "GHIM").

## A11y

- Whole card is wrapped in a single `<Link>`; the title is the accessible name.
- Type pill, level badge, duration, reward chip are inside the link; tooltips are available on hover and via `aria-label` on focus.
- All locale-resolved strings come from `next-intl`'s `t('materials.card.*')` namespace — never hard-coded.

## Loading state

`<MaterialCard.Skeleton size="md" />` — separate component used by Suspense fallbacks. Renders the same outer shape with shimmering paper rectangles. Required when listing materials in server components.

## Test contract

```ts
// frontend/tests/unit/materials/MaterialCard.test.tsx

it('renders Vietnamese title when locale=vi', ...);
it('falls back to vi summary when en summary missing on en locale', ...);
it('omits progress strip when progress is null', ...);
it('shows lock + sign-in tooltip when anonymous=true', ...);
it('uses correct type pill colour for each material type', ...);
it('matches editorial design tokens (data-testid="ed-chip", "ed-card")', ...);
```

These tests MUST be written first (TDD per Constitution II) and fail before the component is implemented.
