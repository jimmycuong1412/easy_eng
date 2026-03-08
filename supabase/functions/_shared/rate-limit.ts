/**
 * Rate Limiting Middleware for Supabase Edge Functions (T236)
 *
 * Implements token bucket algorithm with Redis-like storage using Supabase
 * Prevents abuse and ensures fair usage of API endpoints
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier for this rate limit (e.g., 'api:booking', 'api:payment') */
  limitKey: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Public endpoints (no auth required)
  PUBLIC: { maxRequests: 100, windowSeconds: 60, limitKey: 'public' },

  // Authentication endpoints
  AUTH: { maxRequests: 5, windowSeconds: 60, limitKey: 'auth' },

  // Student endpoints
  STUDENT_READ: { maxRequests: 100, windowSeconds: 60, limitKey: 'student:read' },
  STUDENT_WRITE: { maxRequests: 30, windowSeconds: 60, limitKey: 'student:write' },
  BOOKING: { maxRequests: 10, windowSeconds: 60, limitKey: 'booking' },

  // Teacher endpoints
  TEACHER_READ: { maxRequests: 100, windowSeconds: 60, limitKey: 'teacher:read' },
  TEACHER_WRITE: { maxRequests: 50, windowSeconds: 60, limitKey: 'teacher:write' },

  // Admin endpoints
  ADMIN: { maxRequests: 200, windowSeconds: 60, limitKey: 'admin' },

  // Payment endpoints (strict)
  PAYMENT: { maxRequests: 5, windowSeconds: 60, limitKey: 'payment' },

  // Gem transactions (strict to prevent fraud)
  GEM_TRANSACTION: { maxRequests: 10, windowSeconds: 60, limitKey: 'gem:transaction' },

  // Analytics endpoints
  ANALYTICS: { maxRequests: 50, windowSeconds: 60, limitKey: 'analytics' },

  // Video streaming
  VIDEO: { maxRequests: 20, windowSeconds: 60, limitKey: 'video' },

  // Webhook endpoints (external services)
  WEBHOOK: { maxRequests: 100, windowSeconds: 60, limitKey: 'webhook' },
} as const;

/**
 * Extract identifier from request (IP address or user ID)
 */
function getIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Check and enforce rate limit
 */
export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId?: string
): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const identifier = getIdentifier(req, userId);
  const key = `ratelimit:${config.limitKey}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  try {
    // Get or create rate limit record
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Rate limit check error:', fetchError);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date((now + config.windowSeconds) * 1000),
      };
    }

    let requestCount = 0;
    let resetAt: Date;

    if (!existing || existing.window_start < windowStart) {
      // Create new window
      requestCount = 1;
      resetAt = new Date((now + config.windowSeconds) * 1000);

      const { error: upsertError } = await supabase
        .from('rate_limits')
        .upsert({
          key,
          request_count: requestCount,
          window_start: now,
          reset_at: resetAt.toISOString(),
          limit_key: config.limitKey,
          identifier,
        });

      if (upsertError) {
        console.error('Rate limit upsert error:', upsertError);
        // Fail open
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt,
        };
      }
    } else {
      // Increment existing window
      requestCount = existing.request_count + 1;
      resetAt = new Date(existing.reset_at);

      if (requestCount > config.maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // Update count
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({ request_count: requestCount })
        .eq('key', key);

      if (updateError) {
        console.error('Rate limit update error:', updateError);
        // Fail open
        return {
          allowed: true,
          remaining: config.maxRequests - requestCount,
          resetAt,
        };
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit exception:', error);
    // Fail open - allow request if unexpected error
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date((now + config.windowSeconds) * 1000),
    };
  }
}

/**
 * Middleware wrapper for rate limiting
 * Returns Response if rate limited, null if allowed
 */
export async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig,
  userId?: string
): Promise<Response | null> {
  const result = await checkRateLimit(req, config, userId);

  // Add rate limit headers
  const headers = new Headers({
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  });

  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter!.toString());

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        resetAt: result.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: {
          ...Object.fromEntries(headers.entries()),
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Helper to add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-RateLimit-Limit', result.remaining.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', result.resetAt.toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Clean up old rate limit records (call periodically)
 */
export async function cleanupRateLimits(): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  await supabase
    .from('rate_limits')
    .delete()
    .lt('reset_at', cutoffDate.toISOString());
}
