# Contract: Rate Limiting Middleware

**Feature**: Security Hardening
**Date**: 2026-02-22

## Module: `frontend/src/lib/rate-limit.ts`

### `createRateLimiter(max, windowMs)`

**Signature**:
```typescript
function createRateLimiter(max: number, windowMs: number): RateLimiter
type RateLimiter = (key: string) => { allowed: boolean; remaining: number }
```

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `max` | `number` | Max requests allowed in the window |
| `windowMs` | `number` | Window duration in milliseconds |

**Returns**: A `check(key)` function.

**`check(key)` Returns**:
| Field | Type | Description |
|-------|------|-------------|
| `allowed` | `boolean` | `true` if request is within limit |
| `remaining` | `number` | Requests remaining in current window (0 if blocked) |

**Behavior**:
- Uses `LRUCache<string, RateLimitEntry>` from `lru-cache` v10
- TTL = `windowMs` — entries auto-expire
- Cache max size = 10,000 entries
- Per-instance (in-process): resets on server restart (Vercel cold start)
- NOT distributed: each serverless instance has independent counts

**Error response format** (returned by route handler, not by this function):
```json
{ "error": "Too many requests" }
// HTTP 429 Too Many Requests
// Header: Retry-After: 60
```

---

## Applied Limits

| Route | Method | Key | Max | Window |
|-------|--------|-----|-----|--------|
| `/api/payments/gem-purchase` | POST | JWT user ID | 5 | 60s |
| `/api/payments/gem-purchase-complete` | POST | Client IP | 10 | 60s |
| `/api/admin/gems-rules` | POST | JWT user ID | 30 | 60s |
| `/api/admin/gems-rules/[id]` | PUT | JWT user ID | 30 | 60s |
| `/api/admin/gems-rules/[id]` | DELETE | JWT user ID | 30 | 60s |
| `/api/cometchat/auth-token` | POST | JWT user ID | 20 | 60s |

**Key selection logic**:
```typescript
// Prefer user ID (authenticated), fall back to IP
const key = session?.user?.id ?? request.headers.get('x-forwarded-for') ?? 'anon';
```

---

## Usage Pattern

```typescript
// In a Next.js route handler file:
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter(5, 60_000); // module-level singleton

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  const key = session?.user?.id ?? request.headers.get('x-forwarded-for') ?? 'anon';
  const { allowed, remaining } = limiter(key);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    );
  }

  // ... rest of handler
}
```

---

## Non-Goals

- NOT a replacement for server-side rate limiting (express-rate-limit on backend)
- NOT accurate across multiple Vercel instances (use Upstash Redis for that)
- NOT a WAF — does not block IPs permanently
