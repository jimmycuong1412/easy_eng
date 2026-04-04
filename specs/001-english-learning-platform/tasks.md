# Tasks: Teacher Schedule UX Overhaul

**Feature**: Teacher Schedule — Batch Save, Drag Selection, Visual Polish
**Branch**: `001-english-learning-platform`
**Plan**: plan.md | **Total tasks**: 20

---

## Phase 1: Setup (Read Existing Code)

**Purpose**: Understand current state before modifying.

- [ ] T001 Read `frontend/src/components/teacher/AvailabilityCalendar.tsx` — map current state variables, save flow, slot click handler, and cell render logic
- [ ] T002 [P] Read `frontend/messages/en.json` — locate `teacherSchedule.calendar` key block and note all existing keys
- [ ] T003 [P] Read `frontend/messages/vi.json` — locate `teacherSchedule.calendar` key block

---

## Phase 2: Foundational (i18n Keys — Blocking)

**Purpose**: Add all new i18n keys before any component work begins. Component tasks will call `t('calendar.*')` — keys must exist first.

**Checkpoint**: Both message files updated — component phases can begin.

- [ ] T004 In `frontend/messages/en.json` — add under `teacherSchedule.calendar`: `"saveChanges": "Save Changes"`, `"discardChanges": "Discard"`, `"unsavedChanges": "{count} unsaved change(s)"`, `"saved": "Saved!"`, `"saveError": "Failed to save. Please try again."`; also replace `"shiftHint"` value with `"Click and drag or Shift+click to select multiple slots"` (keep same key, update text)
- [ ] T005 [P] In `frontend/messages/vi.json` — add matching keys under `teacherSchedule.calendar`: `"saveChanges": "Lưu thay đổi"`, `"discardChanges": "Huỷ"`, `"unsavedChanges": "{count} thay đổi chưa lưu"`, `"saved": "Đã lưu!"`, `"saveError": "Lưu thất bại. Vui lòng thử lại."`; update `"shiftHint"` to `"Kéo chuột hoặc Shift+nhấp để chọn nhiều ô"`

---

## Phase 3: User Story 1 — Batch Save (Priority: P1) 🎯 Core

**Goal**: Replace 800ms debounce auto-save with an explicit Save / Discard button pair. Teachers edit freely, then commit with one click.

**Independent Test**: Toggle several slots without saving → no DB write fires. Click Save → grid persists after page reload. Click Discard → grid reverts to saved state.

**Depends on**: Phase 2 complete (needs `t('calendar.saveChanges')` etc.)

- [ ] T006 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add state: `const savedStateRef = useRef<Record<string, boolean>>({})`, `const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)`, `const [saveSuccess, setSaveSuccess] = useState(false)`; in the `load` callback, after `setSlotState(buildDefaultState(overrides ?? []))`, also set `savedStateRef.current = buildDefaultState(overrides ?? [])`
- [ ] T007 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add helper `const checkUnsaved = useCallback((s: Record<string, boolean>) => { setHasUnsavedChanges(JSON.stringify(s) !== JSON.stringify(savedStateRef.current)); }, [])`. Call `checkUnsaved(newState)` at the end of every function that mutates `slotState`: `handleSlotClick`, `bulkOpen`, `bulkClose`, `applyPreset`
- [ ] T008 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — remove `debounceTimer` ref, remove `scheduleSave` function, remove `scheduleSave(newState)` call in `handleSlotClick`, remove `saveToDb(next)` calls in `bulkOpen`, `bulkClose`, and `applyPreset`
- [ ] T009 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add `handleSave` and `handleDiscard` functions:
  ```
  handleSave: calls saveToDb(slotState); on success sets savedStateRef.current = {...slotState}, setHasUnsavedChanges(false), setSaveSuccess(true), then setTimeout(() => setSaveSuccess(false), 2000)
  handleDiscard: calls setSlotState({...savedStateRef.current}), setHasUnsavedChanges(false)
  ```
- [ ] T010 [US1] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — in the render block, replace the `saving` indicator row in the legend area with the Save/Discard/Saved bar. Place it above the grid (below legend): when `saveSuccess` → show `<span className="text-green-400 text-xs">{t('calendar.saved')}</span>`; when `hasUnsavedChanges` → show Save button (`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium`) + Discard button (`bg-white/10 hover:bg-white/20 text-slate-300 px-3 py-1 rounded text-xs`) + unsaved count span; saving spinner shown inside Save button when `saving` is true

**Checkpoint**: Toggle slots → Save bar appears. Click Save → "Saved!" flash. Reload page → changes persisted. Click Discard → reverts.

---

## Phase 4: User Story 2 — Drag Selection (Priority: P1)

**Goal**: Click-and-drag across cells in the same column to multi-select slots in one gesture.

**Independent Test**: Mousedown on 08:00 Monday, drag down to 10:00, release — slots 08:00–10:00 on Monday all appear selected (amber). Existing Shift+click still works.

**Depends on**: T006–T010 complete (component structure stable)

- [ ] T011 [US2] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add state: `const [isDragging, setIsDragging] = useState(false)`, `const dragStartKeyRef = useRef<string | null>(null)`. Add `useEffect` to register a document-level `mouseup` listener: `const onUp = () => setIsDragging(false); document.addEventListener('mouseup', onUp); return () => document.removeEventListener('mouseup', onUp);`
- [ ] T012 [US2] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — update cell `<button>` in the grid render: add `onMouseDown={(e) => { e.preventDefault(); if (isBooked || isPast) return; setIsDragging(true); dragStartKeyRef.current = key; setSelected(prev => new Set([...prev, key])); setAnchorKey(key); }}` and `onMouseEnter={() => { if (!isDragging || !dragStartKeyRef.current) return; const range = getTimeRange(dragStartKeyRef.current, key).filter(k => !pastSlots.has(k) && !bookedSlots.has(k)); setSelected(new Set(range)); }}`
- [ ] T013 [US2] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add `select-none` class to the `<table>` element to prevent browser text selection during drag; update the hint paragraph to use `t('calendar.shiftHint')` (the value was updated in T004 to include drag instructions — key name unchanged)

**Checkpoint**: Drag across cells → they highlight amber. Release → selection stays. Bulk Open → they turn emerald.

---

## Phase 5: User Story 3 — Scrollable Grid + Simplified Time Column (Priority: P1)

**Goal**: Wrap grid in fixed-height scrollable container with sticky day headers; show only hour labels in time column.

**Independent Test**: Open schedule page. Day header row stays fixed while scrolling through the grid. Time column shows "08", "09" etc. (not "08:00") with no label on :30 rows. Clicking a :30 row's invisible header still selects the whole row across all days.

**Depends on**: Phase 2 complete (no dependency on US1/US2 code)

- [ ] T014 [US3] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — wrap the existing `<div className="overflow-x-auto rounded-lg border border-white/10">` with an inner scrollable div: change to:
  ```
  <div className="overflow-x-auto rounded-lg border border-white/10">
    <div className="max-h-[400px] overflow-y-auto">
      <table ...>
  ```
  Close the extra `</div>` after `</table>`. Add `sticky top-0 z-10 bg-[#0d1f3c]` to `<thead>` so day headers remain visible while scrolling.
- [ ] T015 [US3] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — update the time column `<td>` inside `{VISIBLE_SLOTS.map((time) => ...}`: replace the single `<button>` with a conditional: if `time.endsWith(':00')` render `<button onClick={() => handleRowHeader(time)} className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors w-full leading-none" title={t('calendar.rowSelectTitle')}>{time.slice(0, 2)}</button>`; else render `<button onClick={() => handleRowHeader(time)} className="w-full h-full opacity-0 cursor-pointer" aria-label={time} />`
- [ ] T016 [US3] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — update the `<tr>` className: for `:00` rows add `border-t border-white/10`; for `:30` rows keep `border-b border-white/5 last:border-0`; update the full row map to: `className={time.endsWith(':00') ? 'border-t border-white/10' : 'border-b border-white/5 last:border-0'}`

**Checkpoint**: Grid scrolls independently. Day names stay pinned. Only hour numbers visible in time column.

---

## Phase 6: User Story 4 — High-Contrast State Indicators (Priority: P1)

**Goal**: Visually distinct, high-saturation colour fills for every slot state so teachers can parse the grid instantly.

**Independent Test**: Open schedule page. Open slots are rich emerald (not faint). Closed slots are mid-grey (not near-black). Past slots have a diagonal stripe texture (visually distinct from closed). Booked slots are vivid blue. Selected slots are bright amber. Legend swatches match.

**Depends on**: Phase 2 complete

- [ ] T017 [US4] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — replace the `cellClass` conditional block in the grid render with:
  ```
  let cellClass = 'w-full h-3 rounded-sm transition-colors border ';
  if (isPast) {
    cellClass += 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.06)_3px,rgba(255,255,255,0.06)_6px)] border-slate-700/20 cursor-not-allowed opacity-60';
  } else if (isBooked) {
    cellClass += 'bg-blue-500/70 border-blue-400 cursor-not-allowed';
  } else if (isSelected) {
    cellClass += 'bg-amber-400/80 border-amber-300 cursor-pointer';
  } else if (isOpen) {
    cellClass += 'bg-emerald-500/70 border-emerald-400 hover:bg-emerald-500/80 cursor-pointer';
  } else {
    cellClass += 'bg-slate-700/50 border-slate-600/40 hover:bg-slate-600/60 cursor-pointer';
  }
  ```
- [ ] T018 [US4] In `frontend/src/components/teacher/AvailabilityCalendar.tsx` — update the legend swatches to match the new colours:
  - Open: `bg-emerald-500/70 border-emerald-400`
  - Closed: `bg-slate-700/50 border-slate-600/40`
  - Booked: `bg-blue-500/70 border-blue-400`
  - Selected: `bg-amber-400/80 border-amber-300`
  - Past: `bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.06)_3px,rgba(255,255,255,0.06)_6px)] border-slate-700/20 opacity-60`

**Checkpoint**: Side-by-side comparison with current deployed version shows clearly higher contrast for all states.

---

## Phase 7: Polish & Deploy

- [ ] T019 Run `cd frontend && npm run build` — fix any TypeScript errors introduced across T006–T018
- [ ] T020 [P] Commit: `git add frontend/src/components/teacher/AvailabilityCalendar.tsx frontend/messages/en.json frontend/messages/vi.json` and push; deploy `vercel --prod` from `frontend/`; verify on `https://easyeng-dev.vercel.app/en/teacher/schedule` and `/vi/teacher/schedule`

---

## Dependencies

```
T001–T003 (read existing code)
    ↓
T004–T005 (i18n keys — parallel)
    ↓
T006–T010 (US1 Batch Save — sequential)
T011–T013 (US2 Drag — sequential, after US1)
T014–T016 (US3 Scroll — parallel with US1/US2, only needs Phase 2)
T017–T018 (US4 Colours — parallel with US1/US2/US3, only needs Phase 2)
    ↓
T019 (build check)
    ↓
T020 (deploy)
```

## Parallel opportunities

- T002, T003 — read en.json + vi.json simultaneously
- T004, T005 — update en.json + vi.json simultaneously
- T014–T016 (US3) can run in parallel with T006–T013 (US1+US2) — different code sections
- T017–T018 (US4) can run in parallel with US1/US2/US3 — isolated cellClass block

## MVP scope

All 4 user stories are independently useful and low-risk (UI-only, 1 file). Recommended delivery order: US1 (batch save) → US4 (colours) → US3 (scroll) → US2 (drag). All can be done in a single pass.

**Prerequisites**: plan.md ✅, research.md ✅
**Tests**: Not requested — manual smoke test checklist in Phase 7
**Organization**: UI-only changes across 1 component file + 2 i18n files. No backend changes, no new packages.
