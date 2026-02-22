# Quickstart: Security Hardening

**Last Updated**: 2026-02-22
**Target Audience**: Developers implementing the security fixes
**Branch**: `001-english-learning-platform`

## What You'll Fix

By the end of this guide, all 10 security issues will be resolved:

1. ✅ Committed `.env` credentials purged from git history + rotated
2. ✅ `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` removed from client bundle
3. ✅ CSRF protection applied to all state-changing API routes
4. ✅ Rate limiting on all frontend API routes
5. ✅ Webhook signature verification halts on failure
6. ✅ Webhook idempotency via `processed_webhooks` table
7. ✅ JWT claims used in RLS policies (replaces slow subqueries)
8. ✅ `INTERNAL_API_SECRET` compared timing-safely
9. ✅ HSTS header added to production responses
10. ✅ File upload filenames sanitized

---

## Phase 1 — Immediate: Credential Rotation (Do First)

**CRITICAL**: Rotate all credentials before any code changes. Committed secrets are already compromised.

### Step 1: Supabase Keys

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **Settings** → **API**
3. Click **Regenerate** next to:
   - `anon` key → update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and Vercel
   - `service_role` key → update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel

### Step 2: CometChat Keys

1. Open [CometChat Dashboard](https://app.cometchat.com)
2. Go to **API Credentials**
3. Regenerate **Auth Key** → update `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` (then rename, see Phase 2)
4. Regenerate **API Key** → update `COMETCHAT_API_KEY`

### Step 3: JWT Secret

```bash
# Generate new 64-char secret
openssl rand -hex 32
```

Update `JWT_SECRET` in `.env.local` and Vercel.

### Step 4: Payment Gateway Keys

| Gateway | Where to rotate |
|---------|----------------|
| VNPay | Merchant portal → API credentials |
| MoMo | MoMo Business → Settings → API |
| ZaloPay | ZaloPay Partner → Account → API keys |
| Stripe | [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys |

Update all payment env vars in `.env.local` and Vercel environment variables.

### Step 5: Internal API Secret

```bash
# Generate new secret for gem-purchase-complete route
openssl rand -hex 32
```

Update `INTERNAL_API_SECRET` in `.env.local` and Vercel.

---

## Phase 2 — Git History Purge

**IMPORTANT**: Coordinate with all team members before running. Everyone must re-clone after.

```bash
# Install git-filter-repo (Python required)
pip install git-filter-repo

# Purge env files from ALL history
git filter-repo --path .env --path frontend/.env.local --invert-paths

# Clean up refs
git reflog expire --expire=now --all && git gc --prune=now

# Force push (coordinate with team)
git push origin --force --all
```

After this: all team members must `git clone` fresh. No `git pull` — it won't work on rewritten history.

---

## Phase 3 — Code Changes

### 3.1 Remove NEXT_PUBLIC_ from CometChat Auth Key

**File**: `frontend/src/lib/cometchat/config.ts`

Remove `authKey` from the exported config object:

```typescript
export const COMETCHAT_CONFIG = {
  appId: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || '',
  region: process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us',
} as const;
// authKey removed — not needed client-side
```

**File**: `frontend/src/app/api/cometchat/auth-token/route.ts`

Change:
```typescript
// Before
const AUTH_KEY = process.env.NEXT_PUBLIC_COMETCHAT_AUTH_KEY || '';
// After
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY || '';
```

**New file**: `frontend/src/lib/server-only-secrets.ts`

```typescript
import 'server-only'; // Causes build error if imported in client component

export const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
```

Update `.env.local`: rename `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` → `COMETCHAT_AUTH_KEY`.

### 3.2 Add Rate Limiting

Install package:
```bash
cd frontend && npm install lru-cache
```

**New file**: `frontend/src/lib/rate-limit.ts`

```typescript
import { LRUCache } from 'lru-cache';

type RateLimitEntry = { count: number; resetAt: number };

export function createRateLimiter(max: number, windowMs: number) {
  const cache = new LRUCache<string, RateLimitEntry>({ max: 10_000, ttl: windowMs });

  return function check(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = cache.get(key) ?? { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    cache.set(key, entry);
    return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count) };
  };
}
```

Apply in each route handler at the top of the `POST`/`PUT`/`DELETE` function:

```typescript
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter(5, 60_000); // 5 per 60s

export async function POST(request: NextRequest) {
  const userId = /* get from session */ '';
  const { allowed } = limiter(userId || request.ip || 'anon');
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  // ... rest of handler
}
```

### 3.3 Apply CSRF Protection

**File**: `frontend/src/lib/csrf.tsx` — add at bottom of file:

```typescript
import type { NextRequest, NextResponse } from 'next/server';

export function withCsrfProtection<T extends NextRequest>(
  handler: (req: T) => Promise<NextResponse>
): (req: T) => Promise<NextResponse> {
  return async (req: T) => {
    const headerToken = req.headers.get(CSRF_HEADER_NAME);
    const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
    if (!verifyCsrfToken(headerToken, cookieToken)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      );
    }
    return handler(req);
  };
}
```

Wrap each route handler:

```typescript
// In route.ts files
import { withCsrfProtection } from '@/lib/csrf';

async function handler(request: NextRequest): Promise<NextResponse> {
  // ... existing handler logic
}

export const POST = withCsrfProtection(handler);
```

Routes to wrap:
- `frontend/src/app/api/payments/gem-purchase/route.ts`
- `frontend/src/app/api/payments/gem-purchase-complete/route.ts`
- `frontend/src/app/api/admin/gems-rules/route.ts` (POST)
- `frontend/src/app/api/admin/gems-rules/[id]/route.ts` (PUT, DELETE)
- `frontend/src/app/api/cometchat/auth-token/route.ts`

### 3.4 Timing-Safe Secret Comparison

**File**: `frontend/src/lib/sanitization.ts` — add function:

```typescript
import { timingSafeEqual } from 'crypto';

export function compareSecretsTimingSafe(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
```

**File**: `frontend/src/app/api/payments/gem-purchase-complete/route.ts`

Replace:
```typescript
// Before
if (secret !== expectedSecret) {
// After
import { compareSecretsTimingSafe } from '@/lib/sanitization';
if (!compareSecretsTimingSafe(secret, expectedSecret)) {
```

Also add guard at top of handler:
```typescript
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
if (!INTERNAL_SECRET) throw new Error('INTERNAL_API_SECRET not configured');
```

### 3.5 Add HSTS Header

**File**: `frontend/next.config.mjs`

Find the `headers()` async function and add to the headers array:

```javascript
const isDev = process.env.NODE_ENV === 'development';

// In the headers array:
{
  key: 'Strict-Transport-Security',
  value: isDev ? 'max-age=0' : 'max-age=31536000; includeSubDomains; preload',
},
```

### 3.6 Sanitize File Upload Filenames

**File**: `frontend/src/components/teacher/ClassMaterialsUploader.tsx`

Before uploading to Supabase storage:

```typescript
import { sanitizeFilename } from '@/lib/sanitization';

// In upload handler:
const safeFilename = sanitizeFilename(file.name);
const path = `materials/${classId}/${Date.now()}-${safeFilename}`;
```

**File**: `frontend/src/lib/sanitization.ts` — add function:

```typescript
export function sanitizeFilename(filename: string): string {
  // Remove path traversal characters, keep only safe chars
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')  // no ..
    .substring(0, 255);
}
```

### 3.7 Fix Webhook Signature Verification

**File**: `backend/src/routes/payment-webhook.routes.ts`

Ensure signature verification exits on failure (should already `return`, verify it doesn't just log):

```typescript
// Ensure this pattern (early return on failure):
if (!isValidSignature) {
  return res.status(400).json({ error: 'Invalid signature' });
}
// NOT this (continues after failure):
if (!isValidSignature) {
  logger.warn('Invalid signature');
  // falls through — BAD
}
```

---

## Phase 4 — Database Migrations

Apply in order:

### Migration 056: JWT Claims Trigger

```bash
# Apply via Supabase CLI or MCP
supabase db push --db-url <dev-db-url>
# OR via Supabase dashboard SQL editor
```

Content: `supabase/migrations/056_jwt_claims_trigger.sql`

Verify:
```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'profiles' AND trigger_name = 'trg_sync_role_to_jwt';
```

### Migration 057: Processed Webhooks Table

Content: `supabase/migrations/057_processed_webhooks.sql`

Verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'processed_webhooks';
```

### Migration 058: Update RLS Policies

Content: `supabase/migrations/058_rls_jwt_claims.sql`

Verify:
```sql
-- Test admin policy uses JWT claim
EXPLAIN SELECT * FROM profiles; -- Should not show subquery on profiles table
```

### Add Webhook Idempotency to Handlers

After migration 057, update each payment webhook handler in `backend/src/`:

```typescript
import { supabase } from '../lib/supabase';

// At the top of each webhook handler:
const { data: existing } = await supabase
  .from('processed_webhooks')
  .select('status')
  .eq('webhook_source', 'vnpay')  // or 'momo', 'zalopay', 'stripe'
  .eq('external_transaction_id', transactionId)
  .maybeSingle();

if (existing) {
  return res.json({ success: true }); // Already processed — idempotent
}

// ... existing processing logic ...

// After successful processing, record it:
await supabase.from('processed_webhooks').insert({
  webhook_source: 'vnpay',
  external_transaction_id: transactionId,
  booking_id: bookingId,
  status: 'completed',
});
```

---

## Verification Checklist

After all changes, verify:

- [ ] `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` does NOT appear in browser network tab JS bundles
- [ ] Rate limit: 6 rapid POST requests to `/api/payments/gem-purchase` → 6th returns 429
- [ ] CSRF: POST to `/api/payments/gem-purchase` without CSRF header → 403
- [ ] HSTS header present in production response headers
- [ ] Duplicate webhook call returns 200 without double-crediting gems
- [ ] Git log shows no `.env` files: `git log --all --full-history -- .env`
- [ ] `npm run type-check` passes with 0 errors

---

## Troubleshooting

**CSRF 403 on valid requests**: Ensure frontend is sending the CSRF header. Check `csrf.tsx` for the correct header name constant (`CSRF_HEADER_NAME`).

**Rate limiter not resetting**: LRU cache is in-process — restarting the dev server resets all counts. This is expected behavior.

**JWT claims not in token**: After updating role in `profiles`, the trigger fires but the change takes effect on next login. Force token refresh or log user out and back in.

**`processed_webhooks` insert fails**: Check that `booking_id` is a valid UUID that exists in `bookings`. Use `NULL` for non-booking webhook events.
