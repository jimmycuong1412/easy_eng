# Data Model: Notifications Button Fix

No new data models required. This feature only changes UI components.

## Existing Data Used

### `notifications` table (via `useRealtimeNotifications` hook)
- `id` — UUID
- `user_id` — references auth.users
- `type` — NotificationType enum
- `title` — string
- `message` — string
- `is_read` — boolean
- `created_at` — timestamp
- `action_url` — optional string

### Hook: `useRealtimeNotifications`
**File**: `frontend/src/hooks/useRealtimeNotifications.ts`

Returns:
```typescript
{
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}
```

### Component: `NotificationBell`
**File**: `frontend/src/components/layout/NotificationBell.tsx`

Self-contained component — manages its own open/close state, subscribes to realtime, renders dropdown.

## No Schema Changes

No migrations, no new tables, no new RLS policies required.
