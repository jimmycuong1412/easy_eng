# Bright Theme Redesign — Design

**Date:** 2026-07-24
**Status:** Approved by user
**Scope:** Whole web app (`apps/web`), migrated page by page

## Goal

Modernize EasyEng's look with a bright, white-canvas theme and a playful-energetic
personality, and refocus the marketing funnel on the platform's free features
(Materials Library, AI tools, quizzes, leaderboard) so visitors are attracted by
what they can use immediately, with paid live classes positioned as the upgrade.

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Scope | Whole app, but migrated page by page (Approach B) |
| Free-feature focus | Landing page reworked to showcase free features first |
| Dark theme fate | Kept — toggle button switches between bright and dark |
| Personality | Playful & energetic (bold rounded shapes, vivid accents, lively micro-animations) |

## Current state

- Theme is dark-only: "Direction C" deep-indigo tokens defined in
  `apps/web/src/app/globals.css` (`:root` CSS variables + `--et-*` aliases) and
  mirrored as literal hexes in `apps/web/tailwind.config.ts`.
- ~46 component files consume semantic Tailwind token classes
  (`bg-bg-primary`, `text-text-primary`, …). Only 2 files hardcode brand hexes
  (`components/editorial/TopBar.tsx`, `components/teacher/AvailabilityCalendar.tsx`).
- `darkMode: 'class'` is already configured in Tailwind but unused.
- The landing page (`app/[locale]/page.tsx`) uses `et-*` classes from the
  `.edtech` mockup CSS and leads with teacher/class content.

## Section 1 — Theme architecture

**Mechanism: scoped `.bright` wrapper.** Because all pages share the same CSS
variables, flipping values at `:root` would retheme everything at once. Instead:

1. Tailwind color tokens change from literal hexes to `var(...)` references
   (e.g. `'bg-primary': 'var(--bg-primary)'`), so one utility set serves both
   themes. Shadows and gradients that are theme-dependent also become variables.
2. `globals.css` gains a `.bright { … }` block redefining the same variable
   names for the light palette. Anything inside a `.bright` subtree renders
   bright; everything else keeps today's dark look untouched.
3. Each migrated page's layout applies `.bright` to its root (respecting the
   user's toggle choice). Unmigrated pages have no wrapper and cannot regress.
4. **Theme toggle:** a button in the site header. Choice persists in
   `localStorage` and is reflected as a class on `<html>`. Migrated pages:
   bright by default, dark when toggled. Unmigrated pages: always dark for now.
   A small pre-hydration inline script prevents theme flash.
5. **End state:** when all phases are migrated, bright values move to `:root`
   as the default, the indigo palette moves under `.dark`, the `.bright`
   wrappers are removed, and the toggle becomes truly global.

### Bright palette (Direction D)

| Token | Value | Notes |
|-------|-------|-------|
| `--bg-primary` | `#ffffff` | page canvas |
| `--bg-secondary` | `#f6f7fd` | card body, blue-tinted off-white |
| `--bg-surface` | `#eef0fb` | hover / input |
| `--bg-elevated` | `#ffffff` | raised cards (elevation via shadow, not tint) |
| `--accent-primary` | `#6d4aff` | violet, deepened for contrast on white |
| `--accent-secondary` | `#3b5bff` | blue, deepened for contrast on white |
| `--accent-gold` | `#f59e0b` | darkened amber (readable on white) |
| `--accent-gem` | `#ec4899` | unchanged |
| `--accent-cookie` | `#ff7a59` | unchanged |
| `--color-success` | `#10b981` | darkened for white bg |
| `--text-primary` | `#0f1436` | ink navy |
| `--text-secondary` | `#4a5178` | |
| `--text-muted` | `#7c82a8` | |
| `--border-default` | `rgba(15, 20, 54, 0.08)` | blue-tinted, never neutral gray |
| Shadows | soft violet-tinted, low opacity | replace neon glows (`pulseGlow` etc. get bright variants) |

Gradients (`gradient-primary`, avatar gradients, hero CTA) are kept — they work
on white. The dark radial body background gets a bright counterpart: white with
very faint violet/blue radial tints at the edges.

Accessibility bar: all text tokens meet WCAG AA (4.5:1) against their intended
backgrounds in both themes; verified with Axe.

## Section 2 — Landing page (free-first)

Rework `app/[locale]/page.tsx` (bright by default) into this structure:

1. **Hero:** "Learn English free, every day" (Vietnamese-first copy via
   next-intl). Primary CTA = sign up free / start now. Playful visual using
   existing gamification art (character sprites, streak flame). No class
   booking in the hero.
2. **Free feature showcase:** four bold cards — Materials Library
   (Vietnamese-first packs), AI grammar & pronunciation tools, daily quizzes
   with XP/streaks, leaderboard — each with a mini-preview treatment.
3. **Gamification strip:** XP, gems, career paths, marketplace — "learning
   that feels like a game."
4. **Social proof:** ratings/testimonials, reusing the existing `Stars` and
   `Avatar` primitives.
5. **Upgrade section (last):** live 1-on-1 classes with teachers presented as
   the premium tier, with a clear but non-dominant CTA.

Existing translations in `apps/web/messages/*` are extended for new copy (vi + en).

## Section 3 — Migration order

| Phase | Pages | Rationale |
|-------|-------|-----------|
| 1 | Landing + auth (login/signup) | the visitor funnel — first impression |
| 2 | materials, ai-tools, quiz, leaderboard, learning-path | the free features being promoted |
| 3 | student dashboard, notifications, settings | daily logged-in surface |
| 4 | booking, classes, live class | revenue flow, migrated carefully |
| 5 | teacher + admin | internal audiences last |

Per phase: apply the `.bright` wrapper, hand-tune dark-tuned visuals (glows,
radial backgrounds, hardcoded hexes), fix the 2 hardcoded-hex files when their
phase arrives, verify both themes, commit. Each phase ships independently.

## Error handling / edge cases

- **Theme flash on load:** inline script in the root layout reads localStorage
  before paint and sets the `<html>` class.
- **SSR/hydration:** theme class application must not cause hydration
  mismatch — the toggle component renders after mount (same `mounted`-guard
  pattern already used by `DashboardLayout` / `DevDebugPopup`).
- **Mixed navigation:** during migration a user may move from a bright page to
  a dark page; acceptable by decision (phased rollout), minimized by migrating
  the visitor funnel first.
- **Embedded third-party UI (CometChat)** keeps its own theming until Phase 4,
  where its theme config is aligned if the SDK allows.

## Testing

- Playwright screenshot passes per migrated page in both bright and dark.
- Axe accessibility checks (contrast) on migrated pages, both themes.
- Existing Jest/Playwright suites must stay green after each phase.
- Manual verification of the toggle: persistence, no flash, no hydration errors.

## Out of scope

- Mobile app (`apps/mobile`) theming.
- New features or content — this is a retheme + landing refocus only.
- Free-first dashboard reordering and try-without-account access (possible
  follow-ups, explicitly not chosen for this iteration).
