# Quickstart: Teacher Schedule UX & Save-Button Refactor

**Last Updated**: 2026-03-30
**Target Audience**: Developer implementing the changes
**Branch**: `001-english-learning-platform`

---

## What's changing

1. **New hook** `frontend/src/hooks/useScheduleDraft.ts` — encapsulates draft slot overrides and batch save.
2. **Modified page** `frontend/src/app/[locale]/teacher/schedule/page.tsx` — removes `toggleSlot`, adds draft mutations, unsaved banner, stats bar, Save button.
3. **Modified component** `frontend/src/components/teacher/AvailabilityCalendar.tsx` — add optional `onSaved?: () => void` prop.
4. **i18n keys** added to `en.json` and `vi.json`.
5. **Tests** — unit for hook, e2e for save flow.

---

## Step 1 — Create `useScheduleDraft` hook

File: `frontend/src/hooks/useScheduleDraft.ts`

```ts
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type DraftOverrides = Record<string, boolean>; // "dayOfWeek:HH:MM" → enabled

export function useScheduleDraft() {
  const [draft, setDraft] = useState<DraftOverrides>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const supabase = createClient();

  const toggleDraft = useCallback((dayOfWeek: number, slotTime: string, newValue: boolean) => {
    setDraft((prev) => ({ ...prev, [`${dayOfWeek}:${slotTime}`]: newValue }));
    setIsDirty(true);
    setSaveError(null);
  }, []);

  const saveDraft = useCallback(async (teacherId: string) => {
    if (!isDirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const rows = Object.entries(draft).map(([key, isEnabled]) => {
        const colonIdx = key.indexOf(':');
        const day = parseInt(key.slice(0, colonIdx));
        const hm = key.slice(colonIdx + 1);
        return {
          teacher_id: teacherId,
          day_of_week: day,
          slot_time: hm + ':00',
          is_enabled: isEnabled,
        };
      });
      if (rows.length > 0) {
        const { error } = await supabase
          .from('teacher_slot_overrides')
          .upsert(rows, { onConflict: 'teacher_id,day_of_week,slot_time' });
        if (error) throw error;
      }
      setDraft({});
      setIsDirty(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draft, isDirty, supabase]);

  const discardDraft = useCallback(() => {
    setDraft({});
    setIsDirty(false);
    setSaveError(null);
  }, []);

  return { draft, isDirty, saving, saveError, toggleDraft, saveDraft, discardDraft };
}
```

---

## Step 2 — Update `page.tsx`

Key changes to `frontend/src/app/[locale]/teacher/schedule/page.tsx`:

### 2a. Remove `toggleSlot`, add hook

```ts
// Remove: const [togglingSlot, setTogglingSlot] = React.useState(false);
// Remove: const toggleSlot = async (...) => { ... };

// Add:
import { useScheduleDraft } from '@/hooks/useScheduleDraft';
// ...
const { draft, isDirty, saving, saveError, toggleDraft, saveDraft, discardDraft } = useScheduleDraft();
```

### 2b. Compute effective slot status (merge draft over loaded schedule)

```ts
// Helper used in getSlotForTime — apply draft overrides on top of DB state
const getEffectiveStatus = (slot: ScheduleSlot, date: Date): ScheduleSlot['status'] => {
  const dayOfWeek = date.getDay();
  const key = `${dayOfWeek}:${slot.time}`;
  if (key in draft) return draft[key] ? 'available' : 'disabled';
  return slot.status;
};
```

### 2c. Add unsaved banner (above schedule grid)

```tsx
{isDirty && (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5"
  >
    <span className="text-sm text-amber-300">{t('saveBar.unsavedChanges')}</span>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={discardDraft} className="text-slate-400 hover:text-white">
        {t('saveBar.discard')}
      </Button>
      <Button
        size="sm"
        onClick={() => saveDraft(user!.id)}
        disabled={saving}
        className="bg-[#3B82F6] hover:bg-[#3B82F6]/90"
      >
        {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t('saveBar.saving')}</> : t('saveBar.save')}
      </Button>
    </div>
  </motion.div>
)}
```

### 2d. Add stats bar (below week navigation, above grid)

```tsx
// Compute stats from schedule (memoised)
const stats = React.useMemo(() => {
  const slots = Object.values(schedule).flat();
  return {
    total: slots.length,
    available: slots.filter(s => s.status === 'available').length,
    booked: slots.filter(s => s.status === 'upcoming' || s.status === 'booked').length,
    disabled: slots.filter(s => s.status === 'disabled').length,
  };
}, [schedule]);

// JSX — place between week navigation and grid
<motion.div className="mb-4 grid grid-cols-4 gap-3" ...>
  {([
    { label: t('stats.total'),     value: stats.total,     color: 'text-white' },
    { label: t('stats.available'), value: stats.available, color: 'text-emerald-400' },
    { label: t('stats.booked'),    value: stats.booked,    color: 'text-[#3B82F6]' },
    { label: t('stats.disabled'),  value: stats.disabled,  color: 'text-red-400' },
  ]).map(({ label, value, color }) => (
    <Card key={label} className="bg-white/5 border-white/10">
      <CardContent className="p-3 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </CardContent>
    </Card>
  ))}
</motion.div>
```

### 2e. Update dialog buttons to use draft

```tsx
// Replace toggleSlot(selectedSlot, false) with:
onClick={() => {
  const dayOfWeek = /* extract from slot.id as before */;
  toggleDraft(dayOfWeek, selectedSlot.time, false);
  setSelectedSlot(null);
}}

// Replace toggleSlot(selectedSlot, true) with:
onClick={() => {
  const dayOfWeek = /* extract from slot.id as before */;
  toggleDraft(dayOfWeek, selectedSlot.time, true);
  setSelectedSlot(null);
}}
```

### 2f. Add `beforeunload` guard

```ts
React.useEffect(() => {
  if (!isDirty) return;
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```

### 2g. Add Settings button to header

The header currently has no buttons. Add:

```tsx
<Button
  variant="outline"
  size="sm"
  className="border-white/20 text-white hover:bg-white/10"
  onClick={() => setShowAvailabilityDialog(true)}
>
  <Settings className="w-4 h-4 mr-2" />
  {t('settingsBtn')}
</Button>
```

---

## Step 3 — Update i18n files

### `frontend/messages/en.json` — add under `teacherSchedule`:

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
  "upcoming": "Upcoming",
  "booked": "Booked",
  "completed": "Completed",
  "available": "Available",
  "disabled": "Disabled"
}
```

### `frontend/messages/vi.json` — add under `teacherSchedule`:

```json
"saveBar": {
  "unsavedChanges": "Bạn có thay đổi chưa lưu",
  "save": "Lưu",
  "discard": "Huỷ",
  "saving": "Đang lưu...",
  "saved": "Đã lưu!"
},
"stats": {
  "total": "Tổng",
  "available": "Trống",
  "booked": "Đã đặt",
  "disabled": "Đã tắt"
},
"legend": {
  "disabled": "Đã tắt"
}
```

---

## Step 4 — Write tests

### Unit: `frontend/src/hooks/useScheduleDraft.test.ts`

Test cases:
1. `toggleDraft` sets `isDirty = true` and adds entry to draft
2. `discardDraft` clears draft and sets `isDirty = false`
3. `saveDraft` calls supabase upsert with correct rows and clears draft on success
4. `saveDraft` sets `saveError` on failure

### E2E: `frontend/tests/e2e/teacher-schedule-save.spec.ts`

Scenario:
1. Log in as teacher
2. Navigate to `/en/teacher/schedule`
3. Click a slot to open dialog
4. Click "Disable Slot"
5. Assert unsaved banner is visible
6. Click "Save"
7. Assert banner disappears
8. Reload page — assert slot is still disabled

---

## Dev setup reminder

```bash
# Kill stale Next.js server
powershell -Command "Get-Process node | Stop-Process -Force"
Remove-Item -Recurse -Force frontend/.next

# Start dev server
cd frontend && npm run dev
```

Login: jimmycuong1414@gmail.com / 12345678 (teacher account)
