# Implementation Plan: Security Hardening

**Branch**: `001-english-learning-platform` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Security review findings — 10 priority actions covering credentials, CSRF, rate limiting, CometChat key exposure, webhook idempotency, RLS performance, file safety, HSTS, payment webhook verification, and timing-safe comparisons.

---

## Summary

Apply 10 targeted security fixes to the production-ready EasyEng platform. The fixes are grouped into 4 phases ordered by severity: (1) credentials & secret leaks, (2) missing CSRF enforcement on state-changing API routes, (3) rate limiting and payment integrity, (4) performance & hardening polish. No new user-facing features — these are infrastructure changes that make the existing system production-safe.

---

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20, Deno (Supabase Edge Functions)
**Primary Dependencies**: Next.js 14.2, Supabase JS v2, Express 4 (backend), `lru-cache` (new), `server-only` (new)
**Storage**: Supabase PostgreSQL — new migration for `processed_webhooks` table and JWT claims trigger
**Testing**: Jest (unit), Playwright (e2e) — new tests for CSRF bypass attempts, rate limit behavior, idempotency
**Target Platform**: Vercel (frontend), Node.js server (backend), Supabase Edge Functions
**Project Type**: Web application (frontend + backend + Supabase functions)
**Performance Goals**: RLS query time reduced from ~150ms to ~10ms via JWT claims; no regression on existing benchmarks
**Constraints**: Zero breaking changes to existing API surface; no user-visible UI changes; all fixes backward-compatible
**Scale/Scope**: Affects 6 Next.js API routes, 4 payment webhook handlers, 2 Supabase migrations, 1 config file, 2 new utility modules

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|-----------|--------|
| **I. Code Quality** | All new helpers (rate-limiter, timing-safe compare) must be single-purpose functions <50 lines | ✅ PASS — each fix is a focused utility |
| **II. Testing Discipline** | Security fixes require tests: CSRF bypass test, rate limit test, idempotency test | ✅ PASS — test tasks included in each phase |
| **III. UX Consistency** | No UI changes; error messages for 403/429 must be user-friendly | ✅ PASS — existing error format maintained |
| **IV. Performance** | JWT claims replace subquery RLS — measurable improvement, no regression | ✅ PASS — benchmarked improvement expected |
| **V. Role-Based Access Control** | CSRF + rate limiting enforced at API level (server-side) for all roles | ✅ PASS — all state-changing routes covered |
| **VI. Virtual Currency Integrity** | Webhook idempotency prevents double gem credits; timing-safe comparison prevents injection | ✅ PASS — financial operations hardened |
| **VII. UI Design Excellence** | N/A — no UI changes in this plan | ✅ N/A |

**Gate result: PASS** — proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output (security patterns)
├── data-model.md        # Phase 1 output (processed_webhooks table, JWT trigger)
├── quickstart.md        # Phase 1 output (credential rotation + fix guide)
├── contracts/           # Phase 1 output (rate-limit middleware API)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (affected files)

```text
frontend/
├── .env.local                                  # REMOVE from git, rotate secrets
├── next.config.mjs                             # Add HSTS header
├── package.json                                # Add: lru-cache, server-only
├── src/
│   ├── lib/
│   │   ├── rate-limit.ts                       # NEW: LRU-map rate limiter
│   │   ├── server-only-secrets.ts              # NEW: server-only module wrapper
│   │   └── cometchat/
│   │       └── config.ts                       # Remove NEXT_PUBLIC_COMETCHAT_AUTH_KEY ref
│   └── app/api/
│       ├── cometchat/auth-token/route.ts       # Add CSRF; use server-only key
│       ├── payments/
│       │   ├── gem-purchase/route.ts           # Add CSRF + rate limit
│       │   └── gem-purchase-complete/route.ts  # Add CSRF + timing-safe compare
│       └── admin/
│           ├── gems-rules/route.ts             # Add CSRF + rate limit
│           └── gems-rules/[id]/route.ts        # Add CSRF + rate limit

backend/
├── .env                                        # REMOVE from git, rotate secrets
└── src/
    ├── routes/
    │   └── payment-webhook.routes.ts           # Add early-return on sig fail + idempotency
    └── services/
        └── payment.unified.service.ts          # Add idempotency helper

supabase/
└── migrations/
    ├── 056_jwt_claims_trigger.sql              # NEW: role → JWT claims trigger
    └── 057_processed_webhooks.sql             # NEW: webhook idempotency table
```

**Structure Decision**: Web application (Option 2). Existing frontend/backend split retained. Two new Supabase migrations added. New frontend utility modules added in `src/lib/`.

---

## Complexity Tracking

> No constitution violations.

---

## Implementation Phases

### Phase 1 — Credentials & Secret Leaks (CRITICAL, Day 1)

**Goal**: Eliminate all committed secrets and close the `NEXT_PUBLIC_` auth key exposure.

**Actions**:
1. Add `.env`, `.env.local`, `.env.*.local` to `.gitignore`
2. Run `git filter-repo` to purge both files from all git history
3. Rotate all exposed credentials (Supabase keys, CometChat keys, JWT secret, payment gateway keys)
4. Remove `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` from `.env.local` and `cometchat/config.ts`
5. Install `server-only` package; create `src/lib/server-only-secrets.ts`
6. Update `cometchat/config.ts` to use non-public env var; reference only from API routes

**Files**: `.gitignore`, `.env.local`, `frontend/src/lib/cometchat/config.ts`, `frontend/src/lib/server-only-secrets.ts`

---

### Phase 2 — CSRF on All State-Changing API Routes (CRITICAL, Day 1–2)

**Goal**: Apply existing `csrfMiddleware` (already built in `csrf.tsx`) to all POST/PUT/DELETE routes.

**Routes to fix**:

| Route | Method(s) | Current state |
|-------|-----------|---------------|
| `/api/payments/gem-purchase` | POST | No CSRF |
| `/api/payments/gem-purchase-complete` | POST | No CSRF |
| `/api/admin/gems-rules` | POST | No CSRF |
| `/api/admin/gems-rules/[id]` | PUT, DELETE | No CSRF |
| `/api/cometchat/auth-token` | POST | No CSRF |

**Pattern** — wrap each handler:
```typescript
import { withCsrfProtection } from '@/lib/csrf';

export const POST = withCsrfProtection(async (request) => {
  // existing handler body unchanged
});
```

**Note**: The `csrfMiddleware` in `csrf.tsx` targets Express (req/res). A Next.js Route Handler adapter `withCsrfProtection` will be added to `csrf.tsx` using `NextRequest` cookies.

---

### Phase 3 — Rate Limiting & Payment Integrity (HIGH, Day 2–3)

**Goal**: Add in-process rate limiting to all frontend API routes; fix payment webhook verification and idempotency.

**3a. Rate Limiting**

New file: `frontend/src/lib/rate-limit.ts`
```typescript
// LRU-cache based, per-IP + per-user-ID rate limiter
// No external dependency on Redis
import { LRUCache } from 'lru-cache';

const rateWindows = new LRUCache<string, number[]>({ max: 500, ttl: 15 * 60 * 1000 });

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (rateWindows.get(key) ?? []).filter(t => now - t < windowMs);
  if (hits.length >= maxRequests) return false;
  rateWindows.set(key, [...hits, now]);
  return true;
}
```

Limits per route:
- `/api/payments/gem-purchase` — 5 req/min per user
- `/api/payments/gem-purchase-complete` — 10 req/min per IP
- `/api/admin/gems-rules` — 30 req/min per user
- `/api/cometchat/auth-token` — 20 req/min per user

**3b. Webhook Signature — Early Return**

In `payment-webhook.routes.ts`, change:
```typescript
// BEFORE — logs but continues
if (!isValid) {
  logger.warn('...');
  return res.json({ RspCode: '97', Message: 'Invalid signature' });  // ← return already there
}
```

Audit all 4 gateway handlers to confirm `return` is present immediately after failed verification. Fix any that fall through.

**3c. Webhook Idempotency**

New migration: `supabase/migrations/057_processed_webhooks.sql`
```sql
CREATE TABLE public.processed_webhooks (
  webhook_source          VARCHAR(50)  NOT NULL,
  external_transaction_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (webhook_source, external_transaction_id),
  booking_id    UUID        REFERENCES public.bookings(id),
  status        VARCHAR(50) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

In webhook handler — check before processing:
```typescript
const { data: existing } = await supabase
  .from('processed_webhooks')
  .select('status')
  .eq('webhook_source', 'vnpay')
  .eq('external_transaction_id', transactionId)
  .maybeSingle();

if (existing) return res.json({ success: true }); // idempotent
```

**3d. Timing-Safe Internal Secret**

In `gem-purchase-complete/route.ts`, replace `!== ` comparison with `crypto.timingSafeEqual`. Also throw if env var is missing (remove empty default).

---

### Phase 4 — Hardening Polish (MEDIUM, Day 3–4)

**Goal**: Close remaining medium-priority gaps.

**4a. HSTS Header**

In `next.config.mjs`, add to the headers array:
```javascript
{
  key: 'Strict-Transport-Security',
  value: isDev ? 'max-age=0' : 'max-age=31536000; includeSubDomains; preload',
},
```

**4b. Supabase RLS — JWT Claims**

New migration: `supabase/migrations/056_jwt_claims_trigger.sql`
- Trigger on `profiles` INSERT/UPDATE of `role` column
- Updates `auth.users.raw_app_meta_data.user_role`
- Replaces subquery RLS checks with `auth.jwt() ->> 'user_role'` on the 5 most-called policies (admin policies on `profiles`, `bookings`, `classes`)

**4c. Filename Sanitization**

In `ClassMaterialsUploader.tsx`, replace:
```typescript
const filePath = `class-materials/${classId}/${Date.now()}-${file.name}`;
```
with:
```typescript
import { sanitizeFilename } from '@/lib/sanitization';
const safeFilename = sanitizeFilename(file.name);
const filePath = `class-materials/${classId}/${Date.now()}-${safeFilename}`;
```

**4d. Zustand LocalStorage Persistence**

Reduce `authStore` persistence to non-sensitive fields only:
```typescript
partialize: (state) => ({
  // Only persist non-sensitive UI preferences
  locale: state.locale,
  // Remove: profile, role, tokens
}),
```

---

## Risk & Rollback

| Fix | Risk | Rollback |
|-----|------|----------|
| Credential rotation | Gateway APIs stop working if keys wrong | Revert env vars; re-rotate |
| CSRF on API routes | Frontend must send CSRF token header — already done by existing fetch util | Remove wrapper if clients fail |
| Rate limiting | Legitimate users may hit limits if too strict | Increase limits; add user-ID bypass |
| Webhook idempotency | Duplicate processing blocked | Check `processed_webhooks` table for false positives |
| RLS JWT claims | Role not in JWT until user logs out/in | Backfill with migration data function |
| HSTS | Commits HTTPS for 1 year — dev users affected | Use `isDev` guard (already in plan) |

---

## Success Criteria

- [x] `.env` and `.env.local` absent from `git log --all -- .env.local` (not tracked; confirmed)
- [x] `NEXT_PUBLIC_COMETCHAT_AUTH_KEY` absent from all source files (removed from config.ts, env.ts, cometchat.ts)
- [x] All 5 state-changing API routes return 403 without valid CSRF token (withCsrfRouteProtection applied)
- [ ] All 5 state-changing API routes return 429 after limit exceeded (Phase 3 — pending)
- [ ] Second identical webhook call returns 200 without processing (idempotency confirmed) (Phase 3 — pending)
- [ ] `Strict-Transport-Security` header present in production response (Phase 4 — pending)
- [ ] RLS admin policy uses `auth.jwt()` not subquery (verified in Supabase dashboard) (Phase 4 — pending)
- [ ] File upload with `../../secret` filename is sanitized (Phase 4 — pending)
- [x] TypeScript `tsc --noEmit` passes with 0 new errors (verified)
