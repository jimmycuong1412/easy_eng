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

## Phase 6-7 outcome + Release runbook (needs device/store accounts to finish)

**Done (device-independent):**
- Phase 6 CometChat: edge function `cometchat-auth-token` (deployed), core `getCometChatAuthToken()`, mobile RN SDK deps + cam/mic perms + `class/[id]` token-fetch screen. Video/chat UI = TODO (native module, needs dev-client).
- Phase 7 payments: gems sold web-only (no IAP) — mobile `app/gems.tsx` opens web purchase via expo-web-browser. Mobile shows balance + uses gems (booking).
- Phase 7 push: `expo_push_tokens` table + `register_expo_push_token` RPC (applied), core `registerExpoPushToken()`, mobile `src/lib/push.ts` (expo-notifications) called from AuthGate after login.
- Phase 7 release: `apps/mobile/eas.json` with development(dev-client, ios simulator)/preview/production profiles.

**Prerequisites to actually ship (need device + accounts):**
1. **Supabase function secrets** for cometchat-auth-token: set `COMETCHAT_APP_ID`, `COMETCHAT_REGION`, `COMETCHAT_API_KEY` (copy from web env). Function returns "not configured" until set.
2. **EAS**: `eas login`; `eas init` to set the projectId (also add to app.json `extra.eas.projectId` so push tokens mint); set EAS secrets `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_COMETCHAT_APP_ID`, `EXPO_PUBLIC_COMETCHAT_REGION`.
3. **Dev client build** (for native CometChat + push test): `cd apps/mobile && eas build --profile development --platform ios|android`; install on device; `pnpm --filter mobile start`.
4. **CometChat video/chat UI**: implement with `@cometchat/chat-sdk-react-native` + calls SDK in `class/[id]` (init with appId/region, login via authToken from getCometChatAuthToken, join call). Test A/V on 2 devices (mirror web e2e-booking-call.mjs).
5. **Store accounts**: Apple Developer ($99/yr) + Google Play ($25). `eas submit --profile production`. Provide icon/splash/screenshots.

**Note on newArchEnabled**: app.json has `newArchEnabled: true` (SDK 52 default). Verify CometChat calls SDK works with new arch on the dev-client build; if it crashes, set false and rebuild.
