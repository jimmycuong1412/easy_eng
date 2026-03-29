# Research: Teacher Schedule UX & Save-Button Refactor

**Phase 0 output** | Branch: `001-english-learning-platform` | Date: 2026-03-30

---

## R1 — Current DB write pattern (slot toggle)

**Decision**: Replace per-click upsert with local draft state + single batch upsert on Save.

**Findings**:
- `toggleSlot()` in `page.tsx` fires one `supabase.from('teacher_slot_overrides').upsert()` per click.
- A teacher configuring a full day (57 slots at 25-min intervals) triggers up to 57 separate DB round-trips.
- `AvailabilityCalendar.tsx` already uses the correct pattern: local `slotState` object + single `save()` that upserts all rows at once. We replicate this in a custom hook for the main grid.

**Rationale**: Batch upsert is already validated and working in `AvailabilityCalendar`. Extracting into a hook avoids duplication.

**Alternatives considered**:
- Debounced auto-save: rejected — teacher could navigate away during debounce window and lose changes.
- Server Action with optimistic UI: over-engineered for this scope; Supabase client SDK is sufficient.

---

## R2 — Unsaved-changes guard pattern in Next.js 14

**Decision**: Use `beforeunload` event listener + a sticky Framer Motion banner (not a browser dialog).

**Findings**:
- Next.js App Router does not expose `router.beforePopState`. The only reliable way to block hard navigation is `window.addEventListener('beforeunload', ...)`.
- For soft navigation (Next.js `<Link>` clicks within SPA), a sticky banner warning "You have unsaved changes — Save or Discard" is the idiomatic approach (avoids janky browser dialogs).
- Pattern observed in: Vercel dashboard, Linear, GitHub PR editor.

**Rationale**: Consistent with the app's existing "toast for feedback" pattern. Non-blocking warning keeps UX smooth.

**Alternatives considered**:
- `useRouter().push` interception: not available in App Router without a custom middleware, which is overkill.

---

## R3 — Stats summary bar content

**Decision**: Show four counters — Total slots, Available (open), Booked, Disabled — derived from the already-loaded `schedule` state. No extra DB query.

**Findings**:
- `schedule` (type `ScheduleData`) is already in memory after `fetchSchedule()`.
- Counting by `slot.status` is O(n) over the weekly dataset (~400 slots max), negligible cost.
- Stats teachers care about most: how many slots are open for booking vs already filled.

**Rationale**: Zero extra DB queries. Actionable at a glance.

**Alternatives considered**:
- Separate DB aggregation query: adds latency and complexity for data already in memory.

---

## R4 — i18n keys needed

**Decision**: Add keys under `teacherSchedule.saveBar` and `teacherSchedule.stats` namespaces.

New keys (en):
```json
"saveBar": {
  "unsavedChanges": "You have unsaved changes",
  "save": "Save",
  "discard": "Discard",
  "saving": "Saving...",
  "saved": "Saved!"
},
"stats": {
  "total": "Total",
  "available": "Open",
  "booked": "Booked",
  "disabled": "Disabled"
},
"legend": {
  "disabled": "Disabled"
}
```

Vietnamese keys to be added to `vi.json` under the same paths.

---

## R5 — Hook design: `useScheduleDraft`

**Decision**: Custom hook encapsulating draft slot overrides, dirty flag, save, and discard.

Interface:
```ts
interface UseScheduleDraftReturn {
  draft: Record<string, boolean>; // "dayOfWeek:HH:MM" -> enabled/disabled
  isDirty: boolean;
  saving: boolean;
  saveError: string | null;
  toggleDraft: (dayOfWeek: number, slotTime: string, newValue: boolean) => void;
  saveDraft: (teacherId: string) => Promise<void>;
  discardDraft: () => void;
}
```

**Rationale**: Separating draft logic from the 575-line page component makes both units testable. The hook has no side effects on mount — it only writes to DB when `saveDraft` is called.

**Alternatives considered**:
- Zustand store: unnecessary global state for a single-page concern.
- Moving logic into `AvailabilityCalendar`: wrong responsibility; that component manages weekly template, not per-slot overrides on the grid.

---

## R6 — Slot-toggle-from-dialog compatibility

**Decision**: Remove `toggleSlot()` from the page. Replace dialog "Disable Slot"/"Enable Slot" buttons with draft mutations (`toggleDraft`), close dialog, show unsaved banner.

**Findings**:
- Current `toggleSlot` writes immediately to DB then calls `fetchSchedule()` (full reload).
- After refactor: clicking "Disable Slot" in dialog calls `toggleDraft(dayOfWeek, time, false)`, sets `isDirty = true`, closes dialog. The grid cell updates optimistically. DB write deferred to Save.

**Rationale**: Consistency — all grid mutations go through the same draft → save path.

---

## Resolved unknowns

| Unknown | Resolution |
|---------|-----------|
| Does Supabase SDK support bulk upsert with conflict resolution? | Yes — `.upsert(rows, { onConflict: '...' })` already used in `AvailabilityCalendar.save()` |
| Is `beforeunload` reliable in Next.js App Router? | Yes for hard navigation; soft nav requires sticky banner |
| Any existing draft/dirty state pattern in codebase? | `AvailabilityCalendar` uses `saved` boolean — extended here with `isDirty` |
| RLS on `teacher_slot_overrides`? | Already scoped to `teacher_id = auth.uid()` per T235 audit |
