/**
 * Runtime Environment Variable Validation
 *
 * IMPORTANT: Next.js only statically inlines NEXT_PUBLIC_* variables when
 * accessed via dot notation (process.env.NEXT_PUBLIC_FOO), NOT bracket
 * notation (process.env["NEXT_PUBLIC_FOO"]). All client-side vars must
 * use dot notation so they are replaced at build/compile time.
 */

function assertDefined(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please add it to your .env.local file.`
    );
  }
  return value.trim();
}

/** Validated environment config — import this instead of reading process.env directly */
export const env = {
  // Supabase — dot notation required for Next.js static inlining in client bundles
  get NEXT_PUBLIC_SUPABASE_URL() {
    return assertDefined('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return assertDefined('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // CometChat
  get NEXT_PUBLIC_COMETCHAT_APP_ID() {
    return process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || '';
  },
  get NEXT_PUBLIC_COMETCHAT_REGION() {
    return process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us';
  },
  // Note: COMETCHAT_AUTH_KEY is server-only (no NEXT_PUBLIC_ prefix). It is accessed
  // only in /api/cometchat/auth-token/route.ts via process.env.COMETCHAT_AUTH_KEY.

  // App
  get NEXT_PUBLIC_APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
};

/**
 * Validate all required env vars at import time (server-side only).
 */
if (typeof window === 'undefined') {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.'
    );
  }
}
