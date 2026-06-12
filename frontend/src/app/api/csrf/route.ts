/**
 * CSRF Token Provisioning
 *
 * GET /api/csrf — issues the CSRF cookie pair (HttpOnly source-of-truth +
 * JS-readable mirror). Referenced by lib/csrf.tsx (refreshCsrfToken/csrfFetch)
 * but was never implemented, so every CSRF-protected endpoint rejected all
 * requests with 403.
 */

import { NextResponse } from 'next/server';
import { setCsrfCookies } from '@/lib/csrf.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = NextResponse.json({ success: true });
  setCsrfCookies(response);
  return response;
}
