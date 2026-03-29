# Implementation Plan: Teacher Schedule UX & Save-Button Refactor

**Branch**: `001-english-learning-platform` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: "Make the schedule `/teacher/schedule` easier to configure and monitor, also add a save button to reduce the query workload to the database"

## Summary

The teacher schedule page (`/en/teacher/schedule`) currently writes every slot-toggle directly to the database on each click via `teacher_slot_overrides`. This creates excessive DB round-trips and makes bulk edits painful. The fix introduces a **local draft state** with an explicit **Save** button (batch upsert on commit), adds an **unsaved-changes banner** to prevent accidental navigation, and improves schedule monitoring with a **stats summary bar** (slots enabled/booked/available at a glance). The `AvailabilityCalendar` already has a Save button; the schedule page grid does not — that is the primary gap.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node 20
**Primary Dependencies**: Next.js 14.2, Supabase JS v2, Framer Motion, Radix UI, next-intl
**Storage**: Supabase PostgreSQL — `teacher_availability`, `teacher_slot_overrides`, `class_sessions`
**Testing**: Jest (unit), Playwright (e2e)
**Target Platform**: Web (desktop-primary, responsive)
**Project Type**: Web application (Next.js frontend only — no new backend endpoints needed)
**Performance Goals**: Schedule page load < 1s; Save batch upsert < 200ms p95
**Constraints**: Must not break existing slot-toggle-from-dialog flow; slot grid remains read-only for past dates
**Scale/Scope**: Single page + one shared component; ~150 lines changed, ~100 lines added

## Constitution Check

*GATE: Evaluated before Phase 0. Re-evaluated post-design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Extracting draft state into a custom hook keeps page.tsx under 50-line functions |
| II. Testing Discipline | ✅ PASS | Unit tests for draft-state hook; e2e for save flow required before merge |
| III. UX Consistency | ✅ PASS | Unsaved banner follows existing pattern (Framer Motion, blue accent); Save button matches `AvailabilityCalendar` style |
| IV. Performance | ✅ PASS | Batch upsert replaces N per-click upserts — reduces DB load by up to 57× per session |
| V. RBAC | ✅ PASS | No permission changes; teacher-only route already guarded |
| VI. Currency Integrity | N/A | No currency involved |
| VII. UI Design Excellence | ✅ PASS | Stats bar adds monitoring clarity; animations kept at 60fps via Framer Motion |

**Gate result: PASS — proceed to Phase 0**

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md         ← this file
├── research.md     ← Phase 0 output
├── data-model.md   ← Phase 1 output
├── quickstart.md   ← Phase 1 output
├── contracts/      ← Phase 1 output
└── tasks.md        ← Phase 2 output (speckit.tasks)
```

### Source Code (affected files)

```text
frontend/
├── src/
│   ├── app/[locale]/teacher/schedule/
│   │   └── page.tsx                          # Add draft state, Save button, stats bar
│   ├── components/teacher/
│   │   └── AvailabilityCalendar.tsx           # Minor: expose onSaved callback prop
│   ├── hooks/
│   │   └── useScheduleDraft.ts               # NEW: local draft state + batch save logic
│   └── messages/
│       ├── en.json                           # Add new i18n keys
│       └── vi.json                           # Vietnamese translations
└── tests/
    ├── unit/
    │   └── useScheduleDraft.test.ts          # NEW: unit tests
    └── e2e/
        └── teacher-schedule-save.spec.ts     # NEW: e2e test
```

**Structure Decision**: Web application (existing Next.js frontend). No new API routes needed — all DB writes go through Supabase client SDK directly (same pattern as existing `toggleSlot` and `AvailabilityCalendar.save`).

## Complexity Tracking

> No constitution violations.
