 Here's a prioritized breakdown of what you can do to improve the project:

  ---
  Critical (Functional Gaps)

  1. Replace mock data with real Supabase queries — ~35 pages (including the class catalog and dashboard) use hardcoded
  mock data. This is the biggest gap; your core user flow runs on fake data.
  2. Generate real database types — frontend/src/types/database.ts is fully any-typed. Run supabase gen types typescript
   to get real schema types. This alone will surface hidden bugs across the codebase.
  3. Implement CometChat video controls — In ClassRoom.tsx, audio mute, video toggle, and screen sharing are all TODO
  stubs. The buttons exist but do nothing. In-class chat (InCallChat.tsx) is also fully stubbed.
  4. Implement the cash refund path — In supabase/functions/refund-gems/index.ts, cancelled bookings that took cash
  payment never refund the fiat portion. Only gem refunds work. This is a financial correctness issue.

  ---
  Security

  5. Fix parent-child RLS policy — 003_rls_policies.sql has a TODO where any parent can view any student profile (no
  family relationship check).
  6. CSRF token in sessionStorage — Readable by any JS on the page; should use HttpOnly cookie double-submit pattern.
  7. CSP allows unsafe-eval + unsafe-inline — Negates most XSS protection.
  8. Add runtime env var validation — All Supabase/CometChat configs use ! non-null assertions with no startup
  validation.

  ---
  Performance

  9. Middleware makes 2 DB calls per request — getUser() + profiles.select('role') on every authenticated route. Cache
  the role in JWT claims or a short-lived cookie.

  ---
  DevOps / CI

  10. Create a deployment workflow — No deploy.yml exists. The entire release process is manual.
  11. Fix CI URLs — Lighthouse and perf tests target non-locale-prefixed URLs, hitting redirects instead of actual
  pages.
  12. Fix migration ordering — 003_fix_rls_policies.sql runs before 003_rls_policies.sql alphabetically, breaking the
  intended order.

  ---
  Code Quality Quick Wins

  13. Remove dead dependency @supabase/auth-helpers-nextjs (superseded by @supabase/ssr, never imported).
  14. Enable noUnusedLocals / noUnusedParameters in tsconfig to catch dead code.
  15. Add loading.tsx / error.tsx route segment files for proper App Router streaming and error boundaries.
  16. Fix gem balance — Dashboard sidebar hardcodes cookieCount = 150 instead of fetching from Supabase.

  ---
  Nice-to-Have

  - Update dependencies (Next.js 15, React 19, Playwright 1.49+, ESLint 9)
  - Run E2E tests against production build instead of npm run dev
  - Add engines field to package.json to enforce Node version
  - Implement push notification delivery (currently stubbed)