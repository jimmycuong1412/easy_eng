# Quickstart: Teacher Schedule Multi-Select, UI Cleanup & Compact Layout

**Last Updated**: 2026-03-30
**Branch**: `claude/angry-moser`
**Files to change**: `page.tsx`, `useSlotSelection.ts` (new), `en.json`, `vi.json`

---

## Step 1 — Create `useSlotSelection` hook

Create `frontend/src/hooks/useSlotSelection.ts`:

```ts
'use client';

import { useState, useRef, useCallback } from 'react';

export interface CellCoord {
  dateKey: string;
  time: string;
  rowIdx: number;
  colIdx: number;
}

export interface UseSlotSelectionReturn {
  selected: Set<string>;
  isDragging: boolean;
  isSelected: (dateKey: string, time: string) => boolean;
  selectionCount: number;
  startSelect: (cell: CellCoord) => void;
  extendSelect: (cell: CellCoord) => void;
  endSelect: () => void;
  shiftSelect: (cell: CellCoord, allCells: CellCoord[]) => void;
  clearSelection: () => void;
}

function cellKey(dateKey: string, time: string) {
  return `${dateKey}:${time}`;
}

function computeRectangle(a: CellCoord, b: CellCoord, all: CellCoord[]): Set<string> {
  const minRow = Math.min(a.rowIdx, b.rowIdx);
  const maxRow = Math.max(a.rowIdx, b.rowIdx);
  const minCol = Math.min(a.colIdx, b.colIdx);
  const maxCol = Math.max(a.colIdx, b.colIdx);
  const result = new Set<string>();
  for (const c of all) {
    if (c.rowIdx >= minRow && c.rowIdx <= maxRow && c.colIdx >= minCol && c.colIdx <= maxCol) {
      result.add(cellKey(c.dateKey, c.time));
    }
  }
  return result;
}

export function useSlotSelection(): UseSlotSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const anchorRef = useRef<CellCoord | null>(null);
  const dragCurrentRef = useRef<CellCoord | null>(null);
  const allCellsRef = useRef<CellCoord[]>([]);

  const startSelect = useCallback((cell: CellCoord) => {
    anchorRef.current = cell;
    dragCurrentRef.current = cell;
    setIsDragging(true);
    setSelected(new Set([cellKey(cell.dateKey, cell.time)]));
  }, []);

  const extendSelect = useCallback((cell: CellCoord) => {
    if (!anchorRef.current) return;
    dragCurrentRef.current = cell;
    setSelected(computeRectangle(anchorRef.current, cell, allCellsRef.current));
  }, []);

  const endSelect = useCallback(() => {
    setIsDragging(false);
  }, []);

  const shiftSelect = useCallback((cell: CellCoord, allCells: CellCoord[]) => {
    allCellsRef.current = allCells;
    if (!anchorRef.current) {
      anchorRef.current = cell;
      setSelected(new Set([cellKey(cell.dateKey, cell.time)]));
      return;
    }
    setSelected(computeRectangle(anchorRef.current, cell, allCells));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    anchorRef.current = null;
  }, []);

  return {
    selected,
    isDragging,
    isSelected: (dateKey, time) => selected.has(cellKey(dateKey, time)),
    selectionCount: selected.size,
    startSelect,
    extendSelect,
    endSelect,
    shiftSelect,
    clearSelection,
  };
}
```

---

## Step 2 — Add i18n keys

Add to `frontend/messages/en.json` under `teacherSchedule`:
```json
"batchAction": {
  "label": "{{count}} slot selected",
  "label_plural": "{{count}} slots selected",
  "enableSelected": "Enable Selected",
  "disableSelected": "Disable Selected",
  "clear": "Clear Selection"
},
"settingsHint": "Configure availability"
```

Add matching Vietnamese translation to `frontend/messages/vi.json`.

---

## Step 3 — Wire `useSlotSelection` into `page.tsx`

### 3a. Import and instantiate
```tsx
import { useSlotSelection, CellCoord } from '@/hooks/useSlotSelection';

// Inside component:
const { selected, isDragging, isSelected, selectionCount, startSelect, extendSelect, endSelect, shiftSelect, clearSelection } = useSlotSelection();
```

### 3b. Build `allCells` memo
```tsx
const allCells = React.useMemo<CellCoord[]>(() => {
  return timeSlots.flatMap((time, rowIdx) =>
    weekDays.map((day, colIdx) => ({
      dateKey: formatDate(day),
      time,
      rowIdx,
      colIdx,
    }))
  );
}, [weekDays]);
```

### 3c. Add global pointer-up listener for drag end
```tsx
useEffect(() => {
  const handleUp = () => endSelect();
  document.addEventListener('pointerup', handleUp);
  return () => document.removeEventListener('pointerup', handleUp);
}, [endSelect]);
```

### 3d. Update `<table>` element
```tsx
<table
  className={`w-full min-w-[900px] ${isDragging ? 'select-none' : ''}`}
  style={isDragging ? { touchAction: 'none' } : undefined}
>
```

### 3e. Update each `<td>` and inner `<button>`

Replace current cell render logic with:
```tsx
{weekDays.map((day, colIdx) => {
  const dateKey = formatDate(day);
  const slot = getSlotForTime(day, time);
  const effectiveStatus = slot ? getEffectiveStatus(slot, day.getDay()) : null;
  const cellSelected = isSelected(dateKey, time);

  return (
    <td
      key={`${day.toISOString()}-${time}`}
      className={`px-0.5 py-0 ${isToday(day) ? 'bg-[#3B82F6]/5' : ''}`}
      onPointerDown={(e) => {
        if (e.shiftKey) return; // handled by button onClick
        e.preventDefault();
        startSelect({ dateKey, time, rowIdx, colIdx });
      }}
      onPointerEnter={() => {
        if (isDragging) extendSelect({ dateKey, time, rowIdx, colIdx });
      }}
    >
      {slot ? (
        <button
          onClick={(e) => {
            if (e.shiftKey) {
              shiftSelect({ dateKey, time, rowIdx, colIdx }, allCells);
              return;
            }
            if (selectionCount > 0) {
              // In selection mode: toggle this cell
              if (cellSelected) {
                // deselect single — clear and reset anchor to this cell
                clearSelection();
              } else {
                startSelect({ dateKey, time, rowIdx, colIdx });
              }
              return;
            }
            setSelectedSlot(slot);
          }}
          className={`w-full h-3.5 rounded border text-left transition-all
            ${getStatusColor(effectiveStatus!)}
            ${cellSelected ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : ''}
          `}
        >
          <CompactSlotContent status={effectiveStatus!} slot={slot} />
        </button>
      ) : (
        // Empty cell — selectable but no action
        <button
          onClick={() => { clearSelection(); }}
          className={`w-full h-3.5 rounded border border-white/10
            ${cellSelected ? 'ring-2 ring-white/60' : ''}
          `}
        />
      )}
    </td>
  );
})}
```

### 3f. Add `CompactSlotContent` helper component
```tsx
function CompactSlotContent({ status, slot }: { status: string; slot: ScheduleSlot }) {
  if (status === 'available') return <span className="block w-1.5 h-1.5 rounded-full bg-white/40 mx-auto" />;
  if (status === 'disabled') return <span className="block w-1.5 h-1.5 rounded-full bg-red-500/50 mx-auto" />;
  if (status === 'upcoming' || status === 'booked') return <span className="block w-full h-1.5 rounded-sm bg-[#3B82F6]/70" />;
  if (status === 'completed') return <span className="block w-full h-1.5 rounded-sm bg-emerald-500/70" />;
  return null;
}
```

---

## Step 4 — Add Batch Action Bar

Add immediately after the closing `</div>` of the `<Card>` wrapper around the schedule grid (inside the card, after `</div>` that wraps `<table>`):

```tsx
{selectionCount > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-between gap-3 px-4 py-2 border-t border-white/10 bg-white/5"
  >
    <button
      onClick={clearSelection}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
    >
      <X className="w-3 h-3" />
      {t('batchAction.clear')}
    </button>
    <span className="text-xs text-slate-400">
      {t('batchAction.label', { count: selectionCount })}
    </span>
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
        onClick={() => {
          selected.forEach((key) => {
            const [dateKey, time] = key.split(':').slice(0, 2).join(':').split(':').reduce<[string, string]>(
              (acc, part, i) => i < 3 ? [acc[0] + (acc[0] ? '-' : '') + part, acc[1]] : [acc[0], acc[1] + (acc[1] ? ':' : '') + part],
              ['', '']
            );
            // simpler: key is "YYYY-MM-DD:HH:MM", split at index 10
            const dk = key.slice(0, 10);
            const t2 = key.slice(11);
            const dow = new Date(dk).getDay();
            const slot = getSlotForTime(weekDays.find(d => formatDate(d) === dk)!, t2);
            if (slot && ['available', 'disabled'].includes(getEffectiveStatus(slot, dow))) {
              toggleDraft(dow, t2, false);
            }
          });
          clearSelection();
        }}
      >
        {t('batchAction.disableSelected')}
      </Button>
      <Button
        size="sm"
        className="h-7 text-xs bg-[#3B82F6] hover:bg-[#3B82F6]/90"
        onClick={() => {
          selected.forEach((key) => {
            const dk = key.slice(0, 10);
            const t2 = key.slice(11);
            const dow = new Date(dk).getDay();
            const slot = getSlotForTime(weekDays.find(d => formatDate(d) === dk)!, t2);
            if (slot && ['available', 'disabled'].includes(getEffectiveStatus(slot, dow))) {
              toggleDraft(dow, t2, true);
            }
          });
          clearSelection();
        }}
      >
        {t('batchAction.enableSelected')}
      </Button>
    </div>
  </motion.div>
)}
```

---

## Step 5 — Remove Settings button from header, add to slot detail dialog

### 5a. Remove from header
Delete the `<Button>` block in the header that calls `setShowAvailabilityDialog(true)`.

### 5b. Add Settings hint in slot detail dialog for empty slots
In the empty slot section (outside availability hours), add:
```tsx
<button
  className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
  onClick={() => { setSelectedSlot(null); setShowAvailabilityDialog(true); }}
>
  <Settings className="w-3 h-3" />
  {t('settingsHint')}
</button>
```

---

## Step 6 — Apply compact layout

Update row height and cell sizing in the grid:

```tsx
// <tr> — change h-8 to h-5
<tr key={time} className="border-b border-white/5 h-5">

// Time <td>
<td className="px-1 py-0 text-slate-400 text-[10px] font-medium w-14 leading-none">{time}</td>

// Day header <th>
<th className="w-[12.5%] px-2 py-1.5 text-center font-medium ...">

// Stats cards — reduce padding
<CardContent className="p-2 text-center">
  <p className={`text-xl font-bold ${color}`}>{value}</p>
  <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
```

---

## Step 7 — Tests

### Unit tests (`useSlotSelection.test.ts`)
1. `startSelect` sets `isDragging=true` and adds cell to selection
2. `extendSelect` from anchor to target selects 2×2 rectangle
3. `shiftSelect` from anchor to target selects rectangle
4. `clearSelection` empties selection and resets anchor
5. `endSelect` sets `isDragging=false` but preserves selection

### E2e tests (`teacher-schedule-multiselect.spec.ts`)
1. Login → shift-click two available slots → batch action bar appears with count
2. Click "Disable Selected" → unsaved banner appears, slots show disabled style
3. Drag across 3 cells → 3 cells selected
4. Click "Clear Selection" → batch action bar disappears
