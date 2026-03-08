# Rate Limiting Implementation Guide (T236)

## Overview

Rate limiting protects the Easy Eng platform from abuse by limiting the number of requests a user or IP address can make in a given time window.

---

## Implementation

### Rate Limiting Middleware

All Edge Functions should use the shared rate limiting middleware located at:
`supabase/functions/_shared/rate-limit.ts`

### Database Table

Rate limit data is stored in the `rate_limits` table created by migration `050_rate_limits.sql`.

---

## Usage in Edge Functions

### Basic Example

```typescript
import { rateLimitMiddleware, RATE_LIMITS } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    RATE_LIMITS.BOOKING,
    userId // Optional: pass user ID if authenticated
  );

  if (rateLimitResponse) {
    return rateLimitResponse; // Return 429 Too Many Requests
  }

  // Process request normally
  // ...
});
```

### With Authentication

```typescript
import { rateLimitMiddleware, RATE_LIMITS } from '../_shared/rate-limit.ts';
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Apply rate limiting with user ID
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    RATE_LIMITS.PAYMENT,
    user?.id
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Process authenticated request
  // ...
});
```

---

## Rate Limit Configurations

### Predefined Limits

| Endpoint Type | Max Requests | Window | Use Case |
|---------------|--------------|--------|----------|
| PUBLIC | 100 | 60s | Public API endpoints |
| AUTH | 5 | 60s | Login/signup attempts |
| STUDENT_READ | 100 | 60s | Student data queries |
| STUDENT_WRITE | 30 | 60s | Student data updates |
| BOOKING | 10 | 60s | Class bookings |
| TEACHER_READ | 100 | 60s | Teacher data queries |
| TEACHER_WRITE | 50 | 60s | Class creation/updates |
| ADMIN | 200 | 60s | Admin operations |
| PAYMENT | 5 | 60s | Payment processing |
| GEM_TRANSACTION | 10 | 60s | Gem transactions |
| ANALYTICS | 50 | 60s | Analytics queries |
| VIDEO | 20 | 60s | Video streaming |
| WEBHOOK | 100 | 60s | External webhooks |

### Custom Limits

Create custom rate limit configurations:

```typescript
const customLimit = {
  maxRequests: 20,
  windowSeconds: 300, // 5 minutes
  limitKey: 'custom:operation',
};

const rateLimitResponse = await rateLimitMiddleware(req, customLimit, userId);
```

---

## Response Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2026-02-03T10:30:00Z
```

When rate limited (429 response):

```http
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-02-03T10:30:00Z
```

---

## Client-Side Handling

### JavaScript/TypeScript Example

```typescript
async function makeRequest(url: string) {
  const response = await fetch(url);

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    console.log(`Resets at: ${data.resetAt}`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeRequest(url);
  }

  return response;
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

export function useRateLimitedRequest() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const makeRequest = useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retrySeconds = parseInt(response.headers.get('Retry-After') || '60');
      setIsRateLimited(true);
      setRetryAfter(retrySeconds);

      // Auto-retry after cooldown
      setTimeout(() => {
        setIsRateLimited(false);
        setRetryAfter(0);
      }, retrySeconds * 1000);

      throw new Error(`Rate limited. Retry in ${retrySeconds} seconds`);
    }

    return response;
  }, []);

  return { makeRequest, isRateLimited, retryAfter };
}
```

---

## Edge Function Examples

### Booking Endpoint

```typescript
// supabase/functions/create-booking/index.ts
import { rateLimitMiddleware, RATE_LIMITS } from '../_shared/rate-limit.ts';
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Rate limit bookings to prevent spam
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    RATE_LIMITS.BOOKING,
    user.id
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Process booking...
  const { classId } = await req.json();
  // ... booking logic ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Payment Endpoint

```typescript
// supabase/functions/process-payment/index.ts
import { rateLimitMiddleware, RATE_LIMITS } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Strict rate limiting for payments
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    RATE_LIMITS.PAYMENT,
    userId
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Process payment...
  // ... payment logic ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Gem Transaction Endpoint

```typescript
// supabase/functions/award-gems/index.ts
import { rateLimitMiddleware, RATE_LIMITS } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  // Rate limit gem transactions to prevent fraud
  const rateLimitResponse = await rateLimitMiddleware(
    req,
    RATE_LIMITS.GEM_TRANSACTION,
    userId
  );

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Award gems...
  // ... gem logic ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Monitoring

### View Rate Limit Activity

```sql
-- Top rate limited users
SELECT
  identifier,
  limit_key,
  COUNT(*) as hit_count,
  MAX(request_count) as max_requests
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier, limit_key
ORDER BY hit_count DESC
LIMIT 20;
```

### Check Current Rate Limits

```sql
-- Active rate limits
SELECT
  limit_key,
  identifier,
  request_count,
  reset_at
FROM rate_limits
WHERE reset_at > NOW()
ORDER BY request_count DESC;
```

### Cleanup Old Records

```sql
-- Manual cleanup (runs automatically via cron)
SELECT cleanup_old_rate_limits();
```

---

## Testing

### Test Rate Limiting

```typescript
// tests/rate-limiting.test.ts
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Deno.test('Rate limiting enforces limits', async () => {
  const url = 'http://localhost:54321/functions/v1/create-booking';
  const headers = { Authorization: `Bearer ${token}` };

  // Make 10 requests (limit)
  for (let i = 0; i < 10; i++) {
    const res = await fetch(url, { headers });
    assertEquals(res.status, 200);
  }

  // 11th request should be rate limited
  const res = await fetch(url, { headers });
  assertEquals(res.status, 429);

  const data = await res.json();
  assertEquals(data.error, 'Rate limit exceeded');
});
```

---

## Best Practices

### 1. Choose Appropriate Limits
- **Critical operations** (payment, booking): Low limits (5-10/min)
- **Read operations**: Higher limits (100/min)
- **Admin operations**: Higher limits (200/min)
- **Public endpoints**: Moderate limits (100/min)

### 2. Use User-Based Limits When Possible
Always pass `userId` for authenticated requests to track per-user limits.

### 3. Fail Open on Errors
The rate limiter fails open if there's a database error to avoid blocking legitimate traffic.

### 4. Monitor Rate Limit Hits
Track rate limit hits to identify:
- Potential abuse
- Too strict limits
- API client issues

### 5. Communicate Clearly
Always include `Retry-After` header and clear error messages.

---

## Security Considerations

### IP Spoofing Protection
The rate limiter checks multiple headers:
1. `CF-Connecting-IP` (Cloudflare)
2. `X-Real-IP`
3. `X-Forwarded-For`

### Distributed Rate Limiting
Current implementation uses database for rate limit storage, which:
- ✅ Works across multiple Edge Function instances
- ✅ Survives function restarts
- ⚠️ May have slight race conditions under extreme load
- ⚠️ Database is a bottleneck for very high traffic

For higher scale, consider Redis or Cloudflare Rate Limiting.

---

## Troubleshooting

### Rate Limit Not Working
1. Check database migration applied: `050_rate_limits.sql`
2. Verify rate limit middleware is called before other logic
3. Check Supabase service role key is set
4. Review logs for errors

### Too Many Rate Limits
1. Check if limits are too strict
2. Verify correct `limitKey` used
3. Check if cleanup function is running

### False Positives
1. Verify user ID is passed for authenticated requests
2. Check if multiple users share same IP (NAT)
3. Consider increasing limits for affected endpoints

---

## Future Improvements

- [ ] Redis-based rate limiting for higher performance
- [ ] Per-role rate limits (admin, teacher, student)
- [ ] Dynamic rate limiting based on load
- [ ] Rate limit analytics dashboard
- [ ] Automatic ban for excessive violations

---

**Implementation Status**: ✅ Complete (T236)
**Migration**: `050_rate_limits.sql`
**Middleware**: `supabase/functions/_shared/rate-limit.ts`
**Last Updated**: February 3, 2026
