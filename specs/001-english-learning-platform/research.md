# Research: Security Hardening

**Phase**: 0 — Pre-design research
**Date**: 2026-02-22
**Branch**: `001-english-learning-platform`
**Feeds into**: plan.md Phases 1–4

All NEEDS CLARIFICATION items from Technical Context resolved below.

---

## Decision 1: Rate Limiting for Next.js API Routes

**Decision**: In-process `LRUCache` (from `lru-cache` v10 npm package) keyed by user ID or IP.

**Rationale**: Project runs on Vercel serverless. No persistent memory across cold starts, but per-warm-instance accuracy is sufficient for MVP abuse prevention. `lru-cache` is TTL-aware, lightweight (~10KB), zero dependencies. The backend already uses `express-rate-limit` for its own routes — this adds equivalent coverage to Next.js routes.

**Limits chosen**:
| Route | Key | Max | Window |
|-------|-----|-----|--------|
| `gem-purchase` | user ID | 5 | 60s |
| `gem-purchase-complete` | IP | 10 | 60s |
| `gems-rules` POST/PUT/DELETE | user ID | 30 | 60s |
| `cometchat/auth-token` | user ID | 20 | 60s |

**Alternatives Considered**:
- **Upstash Redis** — accurate across instances, but external dependency + latency. Overkill for current scale.
- **Supabase rate-limit table** — already in `supabase/functions/_shared/rate-limit.ts` for Edge Functions; not applicable to Next.js routes.
- **Vercel KV** — proprietary, vendor lock-in, adds cost.

---

## Decision 2: CSRF Adapter for Next.js Route Handlers

**Decision**: Add `withCsrfProtection(handler)` HOF to existing `csrf.tsx` that wraps `(req: NextRequest) => Promise<NextResponse>`.

**Rationale**: The existing `csrfMiddleware` uses Express `(req, res)` signature — incompatible with Next.js Route Handlers. A thin adapter avoids duplicating the already-correct constant-time token verification logic.

**Implementation** (addition to `csrf.tsx`):
```typescript
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

**Routes requiring CSRF wrapping**:
- `POST /api/payments/gem-purchase`
- `POST /api/payments/gem-purchase-complete`
- `POST /api/admin/gems-rules`
- `PUT /api/admin/gems-rules/[id]`
- `DELETE /api/admin/gems-rules/[id]`
- `POST /api/cometchat/auth-token`

**Alternatives Considered**:
- Re-use existing Express `csrfMiddleware` by wrapping `NextRequest` — too hacky.
- External `csrf-csrf` library — adds dependency; we already have correct implementation.

---

## Decision 3: Git History Purge Tool

**Decision**: `git filter-repo` (official Git-recommended replacement for `git filter-branch`).

**Exact command sequence**:
```bash
pip install git-filter-repo
git filter-repo --path .env --path frontend/.env.local --invert-paths
git reflog expire --expire=now --all && git gc --prune=now
git push origin --force --all  # coordinate with all team members
```

**Critical**: Purging history does NOT invalidate already-compromised keys. All credentials must be rotated:

| Credential | Where to rotate |
|------------|----------------|
| Supabase anon key | Dashboard → Settings → API → Regenerate |
| Supabase service role key | Same as above |
| CometChat auth key + API key | CometChat Dashboard → API Credentials |
| JWT secret | Generate new 64-char random string |
| VNPay / MoMo / ZaloPay keys | Each gateway's merchant portal |
| Stripe key | Stripe Dashboard → Developers → API keys |

**Alternatives Considered**: BFG Repo Cleaner (Java dep, less maintained), GitHub secret scanning (detects but doesn't remove).

---

## Decision 4: Remove NEXT_PUBLIC_COMETCHAT_AUTH_KEY

**Decision**: Rename `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` → `COMETCHAT_AUTH_KEY` (no prefix). Install `server-only` npm package to enforce server boundary at build time.

**Rationale**: `NEXT_PUBLIC_` variables are inlined into client JS at build time — visible in any browser's network tab or source view. The auth key is only needed server-side in `/api/cometchat/auth-token/route.ts`. The client SDK only needs `appId` + `region` (both already `NEXT_PUBLIC_`).

**Change to `cometchat/config.ts`**:
```typescript
// Remove authKey — not needed client-side
export const COMETCHAT_CONFIG = {
  appId: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || '',
  region: process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us',
} as const;
```

**Change to `auth-token/route.ts`**:
```typescript
const API_KEY = process.env.COMETCHAT_API_KEY || '';
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY || ''; // was NEXT_PUBLIC_
```

Client-side SDK login already uses the token obtained from the API route — not the raw auth key. Zero functional change.

**New file**: `frontend/src/lib/server-only-secrets.ts`
```typescript
import 'server-only'; // Build error if imported in client component
export const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
```

---

## Decision 5: Supabase RLS — JWT Claims

**Decision**: Add Postgres trigger on `profiles.role` changes that writes to `auth.users.raw_app_meta_data`. Migrate 5 most-called admin RLS policies from subquery to `auth.jwt() ->> 'user_role'`.

**Performance**: Subquery RLS = extra DB round-trip per row evaluated (~150ms). JWT claim = already decoded in request (~5ms). Measurable win for admin list queries.

**Caveat**: JWT claims baked at login time. Role change takes effect on user's next login/token refresh. Acceptable for admin role changes (rare).

**Must use `raw_app_meta_data`** (not `raw_user_meta_data`) — the latter is user-editable and allows self-promotion.

**Trigger pattern**:
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
```

---

## Decision 6: Webhook Idempotency

**Decision**: New `public.processed_webhooks` table with composite primary key `(webhook_source, external_transaction_id)`. Check before processing; insert on success.

**Rationale**: The `gem_purchases` table already has `idempotency_key` column but it's unused in webhook handlers. A dedicated table covers all 4 payment gateways and all webhook types (not just gem purchases).

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

**Handler pattern**:
```typescript
const { data: existing } = await supabase
  .from('processed_webhooks')
  .select('status')
  .eq('webhook_source', 'vnpay')
  .eq('external_transaction_id', transactionId)
  .maybeSingle();

if (existing) return res.json({ success: true }); // idempotent — already processed
// ... then insert after processing
```

---

## Decision 7: Timing-Safe Secret Comparison

**Decision**: Use Node.js built-in `crypto.timingSafeEqual` wrapped in a utility function added to `src/lib/sanitization.ts`.

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

Applied in `gem-purchase-complete/route.ts` to replace `secret !== expectedSecret`. Also add guard: throw if `process.env.INTERNAL_API_SECRET` is undefined (empty default removed).

---

## Decision 8: HSTS Header

**Decision**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` added to `next.config.mjs`, gated by `isDev` check.

**Addition to headers array**:
```javascript
{
  key: 'Strict-Transport-Security',
  value: isDev ? 'max-age=0' : 'max-age=31536000; includeSubDomains; preload',
},
```

The `preload` flag enables submission to the browser HSTS preload list — browsers will enforce HTTPS before even making a request. The 1-year `max-age` is the minimum for preload list inclusion.
