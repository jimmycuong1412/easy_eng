# Data Model: Security Hardening

**Feature**: Security Hardening
**Date**: 2026-02-22
**Branch**: `001-english-learning-platform`

## Overview

This feature introduces two new database entities and modifies how existing RLS policies authenticate admin users. All other tables remain unchanged.

---

## New Entity 1: `processed_webhooks`

**Purpose**: Idempotency table for payment gateway webhooks. Prevents double gem credits when gateways retry delivery.

**SQL**:
```sql
CREATE TABLE public.processed_webhooks (
  webhook_source          VARCHAR(50)  NOT NULL,
  external_transaction_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (webhook_source, external_transaction_id),
  booking_id     UUID         REFERENCES public.bookings(id),
  status         VARCHAR(50)  NOT NULL,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
```

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `webhook_source` | VARCHAR(50) | NOT NULL, PK | Gateway name: `'vnpay'`, `'momo'`, `'zalopay'`, `'stripe'` |
| `external_transaction_id` | VARCHAR(255) | NOT NULL, PK | Transaction ID from payment gateway |
| `booking_id` | UUID | FK → bookings.id, nullable | Associated booking (null for non-booking events) |
| `status` | VARCHAR(50) | NOT NULL | Processing result: `'completed'`, `'failed'`, `'refunded'` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the webhook was processed |

**Validation Rules**:
- `webhook_source` MUST be one of: `'vnpay'`, `'momo'`, `'zalopay'`, `'stripe'`
- `external_transaction_id` MUST be non-empty
- Duplicate `(webhook_source, external_transaction_id)` pair → handler returns `{ success: true }` early (idempotent)

**RLS Policies**:
- No direct user access — only accessible via service role (backend webhook handlers)
- No SELECT/INSERT/UPDATE/DELETE policies needed for authenticated users

**Migration file**: `supabase/migrations/057_processed_webhooks.sql`

---

## New Entity 2: JWT Claims Trigger (Postgres Function)

**Purpose**: Keeps `auth.users.raw_app_meta_data.user_role` in sync with `profiles.role`. Enables fast JWT-based role checks in RLS policies (eliminates subquery round-trips).

**SQL**:
```sql
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt_claims()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{user_role}', to_jsonb(NEW.role::text)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_role_to_jwt
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_jwt_claims();
```

**Trigger Entity**:
| Property | Value |
|----------|-------|
| Name | `trg_sync_role_to_jwt` |
| Table | `public.profiles` |
| When | AFTER INSERT OR UPDATE OF role |
| For Each | ROW |
| Function | `public.sync_role_to_jwt_claims()` |
| Security | SECURITY DEFINER (runs as table owner) |

**JWT Claim Written**:
- Path: `auth.users.raw_app_meta_data.user_role`
- Value: profiles.role string (`'student'`, `'teacher'`, `'admin'`)
- Note: `raw_app_meta_data` is server-controlled — users cannot self-modify (unlike `raw_user_meta_data`)

**Caveat**: JWT claims baked at login time. Role changes take effect on user's next login or token refresh. Acceptable for admin role changes (rare operations).

**Migration file**: `supabase/migrations/056_jwt_claims_trigger.sql`

---

## Modified Entity: RLS Policies (5 admin policies)

**Purpose**: Replace subquery pattern with JWT claim pattern for 5 most-called admin RLS policies.

**Before** (subquery — slow):
```sql
(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
```

**After** (JWT claim — fast):
```sql
auth.jwt() ->> 'user_role' = 'admin'
```

**Policies to update**:
| Table | Policy Name | Operation |
|-------|-------------|-----------|
| `public.profiles` | `admin_read_all_profiles` | SELECT |
| `public.classes` | `admin_manage_all_classes` | ALL |
| `public.bookings` | `admin_read_all_bookings` | SELECT |
| `public.gem_transactions` | `admin_read_all_transactions` | SELECT |
| `public.gem_purchases` | `admin_read_all_purchases` | SELECT |

**Migration file**: `supabase/migrations/058_rls_jwt_claims.sql`

---

## Non-Database Security Changes

These changes have no database entities but are part of the security hardening:

### Rate Limiting (In-Process LRU Cache)

**Package**: `lru-cache` v10 (npm)
**Location**: `frontend/src/lib/rate-limit.ts` (new file)

```typescript
type RateLimitEntry = { count: number; resetAt: number };
// LRUCache<key: string, value: RateLimitEntry>
```

**Limits**:
| Route | Key | Max | Window |
|-------|-----|-----|--------|
| `POST /api/payments/gem-purchase` | user ID | 5 | 60s |
| `POST /api/payments/gem-purchase-complete` | IP | 10 | 60s |
| `POST /api/admin/gems-rules` | user ID | 30 | 60s |
| `PUT /api/admin/gems-rules/[id]` | user ID | 30 | 60s |
| `DELETE /api/admin/gems-rules/[id]` | user ID | 30 | 60s |
| `POST /api/cometchat/auth-token` | user ID | 20 | 60s |

### CSRF Adapter

**Location**: Addition to `frontend/src/lib/csrf.tsx` (existing file)

```typescript
export function withCsrfProtection<T extends NextRequest>(
  handler: (req: T) => Promise<NextResponse>
): (req: T) => Promise<NextResponse>
```

**Routes receiving CSRF wrapping**: All 6 state-changing Next.js API routes listed above.

### Environment Variable Change

**Rename**: `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` → `COMETCHAT_AUTH_KEY`

**Files affected**:
- `frontend/src/lib/cometchat/config.ts`: Remove `authKey` from client config object
- `frontend/src/app/api/cometchat/auth-token/route.ts`: Read from `process.env.COMETCHAT_AUTH_KEY`
- `frontend/src/lib/server-only-secrets.ts` (new file): Export server-only secrets with `import 'server-only'` guard

### Security Headers

**Location**: `frontend/next.config.mjs`

**Addition**:
```javascript
{ key: 'Strict-Transport-Security', value: isDev ? 'max-age=0' : 'max-age=31536000; includeSubDomains; preload' }
```

### Timing-Safe Secret Comparison

**Location**: Addition to `frontend/src/lib/sanitization.ts`

```typescript
export function compareSecretsTimingSafe(provided: string, expected: string): boolean
```

**Applied in**: `frontend/src/app/api/payments/gem-purchase-complete/route.ts`

---

## State Transitions (Unchanged)

Existing state machines are not affected by security hardening:
- **Booking States**: `pending → confirmed → attended | cancelled`
- **Class States**: `scheduled → live → completed | cancelled`
- **Webhook Status**: `pending → completed | failed | refunded` (new, in `processed_webhooks`)

---

## Migration Sequence

```
056_jwt_claims_trigger.sql      ← Trigger + function (no deps)
057_processed_webhooks.sql      ← New table (refs bookings)
058_rls_jwt_claims.sql          ← Policy updates (requires trigger to exist)
```

Run in order. All are non-destructive (no data loss, no column drops).
