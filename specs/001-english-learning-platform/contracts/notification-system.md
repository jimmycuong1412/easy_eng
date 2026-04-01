# Contract: Notification System APIs

## 1. `teacher_favorites` Table — REST Contract

### Add Favorite
```
POST /rest/v1/teacher_favorites
Authorization: Bearer <student_jwt>
Content-Type: application/json

{ "student_id": "<uuid>", "teacher_id": "<uuid>" }

Response 201: { "id": "<uuid>", "student_id": "...", "teacher_id": "...", "created_at": "..." }
Response 409: duplicate (already favorited)
Response 403: student_id != auth.uid()
```

### Remove Favorite
```
DELETE /rest/v1/teacher_favorites?student_id=eq.<uuid>&teacher_id=eq.<uuid>
Authorization: Bearer <student_jwt>

Response 204: deleted
Response 403: student_id != auth.uid()
```

### Check if Favorited
```
GET /rest/v1/teacher_favorites?select=id&student_id=eq.<uuid>&teacher_id=eq.<uuid>
Authorization: Bearer <student_jwt>

Response 200: [] (not favorited) | [{ "id": "..." }] (favorited)
```

---

## 2. `notification_preferences` Table — REST Contract

### Read Preferences
```
GET /rest/v1/notification_preferences?select=settings&user_id=eq.<uuid>
Authorization: Bearer <user_jwt>

Response 200: [{ "settings": { "booking_confirmed": { "in_app": true, "email": true }, ... } }]
Response 200: [] (no row yet → use defaults)
```

### Write Preferences (Upsert)
```
POST /rest/v1/notification_preferences
Prefer: resolution=merge-duplicates
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "user_id": "<uuid>",
  "settings": { "slot_opened": { "in_app": false, "email": false }, ... },
  "updated_at": "<iso8601>"
}

Response 200/201: upserted row
Response 403: user_id != auth.uid()
```

### Default Settings Shape
```typescript
type NotificationPreferences = {
  [type: string]: {
    in_app: boolean;
    email: boolean;
  };
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  booking_confirmed:    { in_app: true,  email: true  },
  booking_cancelled:    { in_app: true,  email: true  },
  class_reminder:       { in_app: true,  email: true  },
  slot_opened:          { in_app: true,  email: false },
  teacher_favorited:    { in_app: true,  email: false },
  gems_earned:          { in_app: true,  email: false },
  payment_received:     { in_app: true,  email: true  },
  system_announcement:  { in_app: true,  email: false },
  new_booking:          { in_app: true,  email: true  },
};
```

---

## 3. `create-notification` Edge Function — Extended Contract

**Endpoint**: `POST /functions/v1/create-notification`
**Auth**: Service role key (admin page uses server action with service key)

### Single User Mode (existing)
```typescript
{
  user_id: string;           // target user UUID
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}
```

### Broadcast Mode (new)
```typescript
{
  broadcast: {
    target: 'all' | 'students' | 'teachers';
    exclude_user_ids?: string[];   // optional exclusion list
  };
  type: NotificationType;          // must be 'system_announcement' for 'all'
  title: string;
  message: string;
  action_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
```

**Response**:
```typescript
{
  success: true;
  sent_count: number;         // number of users notified
  notification_ids: string[]; // only in single-user mode
}
```

**Authorization rules**:
- Single-user mode: service role only
- Broadcast mode: service role only (called from server action with SUPABASE_SERVICE_KEY)

---

## 4. Notification Types Reference

| Type | Recipient | Trigger |
|------|-----------|---------|
| `booking_confirmed` | Student | Booking INSERT |
| `new_booking` | Teacher | Booking INSERT |
| `booking_cancelled` | Student + Teacher | Booking status → 'cancelled' |
| `slot_opened` | Student (fans) | `teacher_availability` INSERT |
| `teacher_favorited` | Teacher | `teacher_favorites` INSERT |
| `gems_earned` | Student | `gem_transactions` INSERT (amount > 0) |
| `payment_received` | Student + Admin | Payment webhook |
| `class_reminder` | Student + Teacher | Scheduled cron |
| `system_announcement` | All / Segment | Admin broadcast |
| `cancellation_alert` | Admin | 3+ cancellations in 24h |
| `achievement_unlocked` | Student | Milestone trigger |
| `level_up` | Student | XP threshold trigger |

---

## 5. `notify_user_batched()` — DB Function Contract

```sql
SELECT notify_user_batched(
  p_user_id      => 'uuid',
  p_type         => 'slot_opened',
  p_title        => 'New Slot Available',
  p_message      => 'Teacher Name opened new slots.',
  p_action_url   => '/teachers/uuid',
  p_related_id   => 'teacher_uuid',
  p_related_type => 'teacher',
  p_priority     => 'normal',
  p_batch_key    => 'teacher_uuid',  -- group by teacher
  p_window_mins  => 15               -- 15-minute window
);
```

**Behavior**:
- If an unread notification of the same `(user_id, type, batch_key)` exists within the window → UPDATE its message to append "(+N more)", increment `metadata.batch_count`
- Otherwise → INSERT a fresh notification
- Supabase Realtime fires UPDATE event on batched rows → `useRealtimeNotifications` hook handles it
- Checks `notification_preferences` before inserting — skips if `in_app: false` for the type
