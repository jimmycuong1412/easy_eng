# EasyEng Mobile — Handoff

**Branch**: `002-mobile-apps` (18 commits, all pushed) · **Base**: `001-english-learning-platform`
**Status**: Phase 1–7 foundation complete. App type-checks and Metro-bundles on every commit. Native runtime (CometChat video, push on device) + store release require a device/EAS/accounts — see [Outstanding](#outstanding-needs-device--accounts).

---

## 1. What this is

EasyEng was a single Next.js web app. It's now a **pnpm + Turborepo monorepo** with a React Native (Expo) mobile app that **shares ~all business logic** with web through `@easyeng/core`. Web behaviour is unchanged.

```
easy_eng/
├── apps/
│   ├── web/      ← Next.js 14 (was frontend/)
│   └── mobile/   ← Expo SDK 52 / RN 0.76 / expo-router
├── packages/
│   ├── types/    ← @easyeng/types  (Supabase DB types)
│   ├── core/     ← @easyeng/core   (hooks, stores, queries, adapters)
│   └── config/   ← @easyeng/config (tsconfig base, shared tailwind preset)
├── supabase/     ← migrations + edge functions (shared backend)
├── pnpm-workspace.yaml · turbo.json · tsconfig.base.json
```

---

## 2. Toolchain (read before touching mobile)

| Tool | Version | Why |
|------|---------|-----|
| Node | **20** (`.nvmrc`=20, engines `>=20 <21`) | Expo SDK 52 CLI breaks on Node 22.18+/24 (auto `.ts` type-stripping crashes `expo-modules-core`). |
| pnpm | **9** (`packageManager: pnpm@9.15.9`) | pnpm 11 requires Node ≥22.13, incompatible with Node 20. |
| nvm | nvm-windows at `C:\nvm4w\nodejs` | Tool shells don't inherit nvm PATH — prepend `C:\nvm4w\nodejs` to PATH for node/pnpm in scripts. |

**Web** runs fine on any Node 20/22/24; only the mobile/Expo toolchain is version-sensitive.

**Commits**: the husky pre-commit hook + git auto-push hook run in Git Bash, which has no node on PATH — commit/push from a shell where node 20 is available (the interactive PowerShell after `nvm use 20`), or the hook fails.

### Common commands (from repo root, Node 20 active)
```bash
pnpm install
pnpm --filter web type-check        # or: pnpm turbo run type-check --filter=web
pnpm --filter web build
pnpm --filter mobile type-check
cd apps/mobile && pnpm exec expo export --platform ios --output-dir .expo-export-check   # bundle check
cd apps/mobile && pnpm start        # dev (needs dev-client for native modules)
```

---

## 3. Architecture — adapter injection (the core idea)

`@easyeng/core` imports **no** platform-specific code. Each app registers adapters once at startup; core hooks/stores call injected getters.

- `setSupabaseClientFactory()` / `getSupabaseClient()` — web: `createBrowserClient` (cookies); mobile: `createClient` + AsyncStorage.
- `setStorage()` — Zustand persist storage. web: localStorage; mobile: AsyncStorage.
- `setPlatform()` — `getOrigin` / `clearAuthCookies` / `redirect` for useAuth. web: window/document; mobile: expo-linking.

Registration: web `apps/web/src/lib/core-bootstrap.ts` (via `CoreBootstrap` client component rendered before children in the locale layout); mobile `apps/mobile/src/lib/core-bootstrap.ts` (imported in `app/_layout.tsx`).

**RSC gotcha (web)**: core-bootstrap runs in a Server Component, so it imports adapter setters from the subpath `@easyeng/core/adapters` (not the main barrel, which would pull `'use client'` hooks into the RSC graph). Every core hook has `'use client'` on line 1.

Shared in core: 15 hooks (useAuth, useGemsBalance, useStreak, useWeeklyGoal, useProgressReport, useSavedWords, useRealtimeNotifications, …), 2 stores (auth, notification), lib (queries, sanitization, timezone, grammar, cometchat helper). **Deferred to web** (platform-coupled): `videoCallStore`, `useCometChat*`, `useVideoCall`, `useClassSearch`, `usePreferences`, `utils.ts` (Tailwind `cn`), `globals.d.ts`.

---

## 4. Mobile app (apps/mobile) — 16 screens, expo-router

Tabs: 🏠 Trang chủ · 📝 Từ vựng · 👨‍🏫 Tìm GV · 📈 Tiến độ · 📖 Bài học

| Area | Screens | Core data used |
|------|---------|----------------|
| Auth | `(auth)/login`, `register`, `forgot-password` | useAuth (signIn/signUp/resetPassword) |
| Dashboard | `(tabs)/index` | useGemsBalance, useStreak, useWeeklyGoal, useProgressReport |
| Vocabulary | `(tabs)/vocabulary`, `vocabulary/review` (flashcard SRS) | useSavedWords (review RPC) |
| Teachers/Booking | `(tabs)/teachers`, `teachers/[id]` (date+slot picker) | getTeachers, **bookSlot** |
| Progress | `(tabs)/progress` | useProgressReport |
| Lessons | `(tabs)/lessons` (static B2 curriculum) | — |
| Onboarding | `onboarding/quiz` (10-Q level test) | **saveLearningProfile** |
| Gems | `gems` (balance + web-only top-up) | useGemsBalance |
| Live class | `class/[id]` (CometChat token fetch; video UI TODO) | getCometChatAuthToken |

UI: **NativeWind 4.1.23** (pinned) + **gluestack-ui**, shared editorial color tokens from `@easyeng/config/tailwind-preset`.

---

## 5. Backend added (already applied/deployed to Supabase `evrcwtsexlamacawofxo`)

| Object | Type | Purpose |
|--------|------|---------|
| `book_slot(teacher_id, date, time)` | RPC (SECURITY DEFINER) | Atomic 1-on-1 booking: balance check → class+booking → −200 gems, idempotent. Replaces web admin-client route. |
| `save_learning_profile(...)` | RPC | Persist onboarding quiz result (level, score, weak areas). |
| `register_expo_push_token(token, platform, device)` | RPC (SECURITY DEFINER) | Upsert mobile push token. |
| `expo_push_tokens` | table (RLS, own-rows) | Mobile push tokens (separate from web `push_subscriptions`). |
| `cometchat-auth-token` | edge function (verify_jwt off, self-checks JWT) | Mint CometChat auth token; holds admin API key. Replaces web-only route. |

Core helpers wrapping these: `bookSlot()`, `saveLearningProfile()`, `registerExpoPushToken()`, `getCometChatAuthToken()` in `packages/core/src/lib/`.

---

## 6. Key decisions

- **Booking & CometChat moved to shared RPC/edge function** — the old web routes used the service-role admin key (mobile can't). Now web+mobile call one secure path. (Web routes still exist; a chip/follow-up tracks migrating web to the RPC.)
- **Gems are NOT sold in-app** — Apple/Google would force IAP (15–30%) on digital currency. Mobile shows balance + opens the web purchase flow via `expo-web-browser`. Booking (a real service) still spends gems normally.
- **NativeWind pinned to 4.1.23** + pnpm override `react-native-css-interop@0.1.22` — 4.2.x targets reanimated 4 and hard-requires `react-native-worklets/plugin` which conflicts with SDK 52's reanimated 3.16. **If you bump NativeWind, match the reanimated version.**

---

## 7. Outstanding (needs device / accounts)

Full runbook in `research.md` → "Phase 6-7 outcome + Release runbook". Summary:

1. **Supabase function secrets**: set `COMETCHAT_APP_ID`, `COMETCHAT_REGION`, `COMETCHAT_API_KEY` (copy from web env) — `cometchat-auth-token` returns "not configured" until then.
2. **EAS**: `eas login`; `eas init` (sets projectId — also add to `app.json` `extra.eas.projectId` so push tokens mint); set EAS secrets `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_COMETCHAT_*`.
3. **Dev-client build** (for native CometChat + push): `cd apps/mobile && eas build --profile development --platform ios|android`, install on device, `pnpm --filter mobile start`.
4. **CometChat video/chat UI**: implement in `class/[id]` with `@cometchat/chat-sdk-react-native` + calls SDK (init appId/region → login with token from `getCometChatAuthToken` → join call). Test A/V on 2 devices (mirror web `e2e-booking-call.mjs`).
5. **Store release**: Apple Developer ($99/yr) + Google Play ($25); `eas submit --profile production`; provide icon/splash/screenshots.
6. **newArch caveat**: `app.json` has `newArchEnabled: true`. Verify CometChat calls SDK works under new arch on the dev-client; if it crashes, set false and rebuild.

### Smaller follow-ups
- Migrate web `apps/web/src/app/api/bookings/book-slot/route.ts` to call the `book_slot` RPC (chip already filed) — the old route lacks the balance check the RPC adds.
- CI: `accessibility.yml` / `perf-regression.yml` still use npm + the removed `apps/web/package-lock.json`; convert to pnpm before merging to a deploy branch.
- Vercel: set Root Directory → `apps/web` in the dashboard (local `.vercel/` is gitignored).

---

## 8. Verification status

Every commit: `pnpm --filter mobile type-check` + `pnpm --filter web type-check` pass; `expo export --platform ios` produces a ~7.7 MB bundle. **Not yet run**: on a real iOS/Android device or simulator (no Xcode/Android Studio in the dev environment). A successful Metro bundle is strong evidence the app loads, but native modules (CometChat, push) are only exercised by a dev-client build on hardware.
