# Research & Decisions — Mobile Apps (Phase 0)

**Date**: 2026-06-20 | **Branch**: `002-mobile-apps`

---

## Toolchain (T002)

| Tool | Version | Notes |
|------|---------|-------|
| Node | v24.11.1 (local) | CI pins Node 20; pin `engines.node >=20` in root package.json |
| npm | 11.6.2 | being replaced by pnpm |
| pnpm | 11.8.0 | installed via `npm i -g pnpm` (corepack failed: EPERM on `C:\Program Files\nodejs`) |

## Baseline (T001)
- Source files in `frontend/src`: **321** `.ts`/`.tsx` files
- Prior `.next` build artifact: ~72 MB
- Web app on branch `001-english-learning-platform` builds & deploys (Vercel project `frontend`, projectId `prj_WeL5yZKaAovfDGR1HYJYNR1tP2Nj`)

## Repo facts discovered
- `frontend/.vercel/` is **gitignored** (not in VCS) — Vercel project linkage is local only. Deploy config must be updated in Vercel dashboard (Root Directory → `apps/web`).
- CI workflows exist in **two** places:
  - Root `.github/workflows/`: `accessibility.yml`, `deploy.yml`, `docker-build.yml`, `lighthouse.yml`, `perf-regression.yml`, `reconcile-gems.yml`, `test.yml` — these reference `frontend/` paths + `npm` + Node 20.
  - `frontend/.github/workflows/`: `ci.yml`, `deploy.yml` (will move with frontend → `apps/web/.github`; likely redundant, review later).
- No nested `.git` inside `frontend/` — safe to `git mv`.
- `next.config.mjs` uses `output: 'standalone'`, next-intl plugin (`./src/i18n/request.ts`), webpack bundle analyzer — needs `transpilePackages` added for workspace packages.

## IAP Policy for Gems (T003) — ⚠️ REVENUE-CRITICAL, needs legal/product confirmation

**Preliminary findings (must verify against current store guidelines before Phase 7):**
- **Apple App Store** (Guideline 3.1.1): Selling "digital content/currency consumed within the app" generally **must** use Apple In-App Purchase (15-30% fee). Gems used for in-app discounts likely fall here → risk of forced IAP.
- **Booking real tutoring sessions** (a real-world service delivered by a human) typically qualifies for the "physical goods & services" exemption (Guideline 3.1.3) → may use external payment (VNPay/MoMo/Stripe). Must confirm gems-as-discount-on-real-service framing.
- **Google Play** (Payments policy): similar — in-app digital goods require Play Billing; real-world services exempt.
- **Strategy options to research**: (a) frame gems strictly as discount tokens on real services; (b) offer gems purchase web-only (not in app, "reader" rules — also restricted); (c) absorb IAP fee on mobile; (d) gate gems purchase behind web.

**Action**: Product + legal review before Phase 7. Does NOT block Phase 1-3 (monorepo + shared packages).

## Dependency hoisting watch (T004)
Packages with strict version/peer requirements to watch during pnpm hoist:
- `@cometchat/chat-sdk-javascript@^4.1.6`, `@cometchat/calls-sdk-javascript@^5.0.1` (web SDKs)
- `next@^14.2.0` + `react@^18.2.0`/`react-dom@^18.2.0` (must stay aligned with eslint-config-next)
- When mobile is added, RN pins React to a specific version — watch for React version conflict between Next (web, React 18) and Expo (mobile, its own React). Mitigated by per-app `node_modules` (pnpm isolates by default; do NOT force a single hoisted React across both apps).

## Phase 2 outcome (types)
- Extracted ONLY `database.ts` → `packages/types/src/database.ts` (43KB, Supabase DB types). Self-contained, 0 internal imports. 8 web files re-pointed to `@easyeng/types`.
- **`globals.d.ts` deliberately NOT moved** — it is an ambient global declaration (augments `Window`), applies via tsconfig `include` not import, and is web-only (plausible/gtag/Sentry/webkitAudioContext). Stays in `apps/web/src/types/`.
- **No automated Supabase type-regen script exists** — `database.ts` was hand-generated from migrations. Future regen should target `packages/types/src/database.ts` to keep one source of truth.
- TODO (CI follow-up, deferred from Phase 1): `accessibility.yml` and `perf-regression.yml` still use npm + (now non-existent) `apps/web/package-lock.json`. They only run on deploy branches, not `002-mobile-apps`. Convert to pnpm before merging to a deploy branch.
