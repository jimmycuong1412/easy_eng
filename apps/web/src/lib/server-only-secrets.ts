/**
 * Server-Only Secrets
 *
 * This module is protected by the 'server-only' package.
 * Importing it in a Client Component will cause a build error.
 *
 * Use this for environment variables that must NEVER reach the browser bundle.
 */
import 'server-only';

/** CometChat admin auth key — server-side user registration only */
export const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY ?? '';

/** Supabase service role key — bypasses RLS, server-side only */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Internal secret for Next.js → backend communication */
export const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? '';
