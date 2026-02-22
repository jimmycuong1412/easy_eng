# Contract: CSRF Protection Adapter

**Feature**: Security Hardening
**Date**: 2026-02-22

## Function: `withCsrfProtection`

**Location**: `frontend/src/lib/csrf.tsx` (addition)

**Signature**:
```typescript
function withCsrfProtection<T extends NextRequest>(
  handler: (req: T) => Promise<NextResponse>
): (req: T) => Promise<NextResponse>
```

**Purpose**: Higher-order function that wraps a Next.js Route Handler with CSRF token validation using the existing double-submit cookie pattern.

**Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `handler` | `(req: T) => Promise<NextResponse>` | The original Next.js route handler |

**Returns**: A new route handler with CSRF check prepended.

---

## Validation Logic

1. Read `X-CSRF-Token` header from incoming request (`CSRF_HEADER_NAME` constant)
2. Read CSRF cookie from request cookies (`CSRF_COOKIE_NAME` constant)
3. Call existing `verifyCsrfToken(headerToken, cookieToken)` (constant-time comparison)
4. If invalid → return `403 Forbidden` immediately
5. If valid → call original `handler(req)` and return its response

**Error Response**:
```json
{ "error": "CSRF token validation failed" }
// HTTP 403 Forbidden
```

---

## Routes Protected

| Route | Methods |
|-------|---------|
| `/api/payments/gem-purchase` | POST |
| `/api/payments/gem-purchase-complete` | POST |
| `/api/admin/gems-rules` | POST |
| `/api/admin/gems-rules/[id]` | PUT, DELETE |
| `/api/cometchat/auth-token` | POST |

---

## Usage Pattern

```typescript
// frontend/src/app/api/payments/gem-purchase/route.ts
import { withCsrfProtection } from '@/lib/csrf';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function handler(request: NextRequest): Promise<NextResponse> {
  // ... existing handler logic unchanged
  return NextResponse.json({ success: true });
}

export const POST = withCsrfProtection(handler);
```

---

## Client-Side Requirements

The frontend must send the CSRF token header on all mutating requests. The token is obtained from the CSRF cookie set by the server on page load.

```typescript
// Fetch wrapper (already implemented in api-client.ts or similar)
const csrfToken = getCookie(CSRF_COOKIE_NAME);
fetch('/api/payments/gem-purchase', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    [CSRF_HEADER_NAME]: csrfToken ?? '',
  },
  body: JSON.stringify(payload),
});
```

---

## Non-Goals

- Does NOT replace authentication (Supabase JWT auth still required)
- Does NOT protect GET/HEAD/OPTIONS requests (safe methods, per RFC 7231)
- Does NOT protect the Express backend (`/api/v1/` routes — covered by existing `csrfMiddleware`)
- Does NOT generate CSRF tokens — token generation already handled by existing `csrf.tsx` middleware
