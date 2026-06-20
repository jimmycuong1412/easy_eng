# Tasks: EasyEng Mobile Apps — Phase 1-3 (Monorepo Foundation)

**Feature**: Mobile Apps (Android + iOS) via React Native/Expo
**Branch**: `002-mobile-apps`
**Plan**: plan.md | **Scope of this file**: Phase 1 (Monorepo skeleton), Phase 2 (packages/types), Phase 3 (packages/core + adapters)
**Total tasks**: 41

**Conventions**:
- `[P]` = có thể làm song song với task khác (file/scope độc lập).
- Mỗi phase kết thúc bằng **Verification Gate** — BẮT BUỘC pass trước khi sang phase sau.
- "Web không được gãy" là điều kiện tiên quyết của mọi gate.
- Path dùng cấu trúc ĐÍCH sau migration: `apps/web/` thay cho `frontend/`.

---

## Phase 0: Pre-flight (làm trước, ngoài scope code)

- [ ] T001 Tạo branch `002-mobile-apps` từ `001-english-learning-platform`; chạy `cd frontend && npm run build` ghi nhận baseline build time + bundle size để so sánh sau migration
- [ ] T002 [P] Cài `pnpm` global (`npm i -g pnpm@latest`); ghi version vào `specs/002-mobile-apps/research.md`
- [ ] T003 [P] Research chính sách IAP của Apple App Store + Google Play cho việc bán "gems" (digital currency) — ghi kết luận vào `specs/002-mobile-apps/research.md` (rủi ro phí 15-30%, có thể buộc dùng IAP cho gems vs miễn cho booking dịch vụ thật)
- [ ] T004 [P] Audit peer-dependency của CometChat + Sentry trong `frontend/package.json` — liệt kê version cứng có thể xung đột hoisting trong monorepo

---

## Phase 1: Monorepo Skeleton (2-3 ngày)

**Purpose**: Di chuyển `frontend/` → `apps/web/`, dựng pnpm workspaces + Turborepo. Web app chạy y hệt sau khi xong.

### 1.1 Cấu trúc & di chuyển

- [ ] T005 Tạo các thư mục đích: `apps/`, `packages/` ở root repo
- [ ] T006 `git mv frontend apps/web` (giữ git history); xác nhận `git status` cho thấy rename chứ không phải delete+add
- [ ] T007 Tạo `pnpm-workspace.yaml` ở root với `packages: ["apps/*", "packages/*"]`

### 1.2 Root config

- [ ] T008 Tạo root `package.json`: `"private": true`, `"packageManager": "pnpm@<version>"`, scripts ủy quyền qua turbo (`"dev": "turbo run dev"`, `"build": "turbo run build"`, `"lint": "turbo run lint"`, `"type-check": "turbo run type-check"`, `"test": "turbo run test"`); thêm `engines.node: ">=20"`
- [ ] T009 Tạo `turbo.json` với pipeline: `build` (outputs `[".next/**", "dist/**"]`, dependsOn `["^build"]`), `dev` (cache false, persistent true), `lint`, `type-check` (dependsOn `["^build"]`), `test`
- [ ] T010 [P] Tạo `packages/config/` (`name: "@easyeng/config"`) chứa `tsconfig.base.json` (target ES2022, strict true, moduleResolution bundler), `eslint-preset.js`, `prettier-preset.js` — di chuyển rule chung từ `apps/web/.eslintrc` + `apps/web/tsconfig.json` lên đây
- [ ] T011 [P] Tạo `tsconfig.base.json` ở root extends `@easyeng/config/tsconfig.base.json`; thêm `paths` cho workspace packages: `"@easyeng/types": ["./packages/types/src"]`, `"@easyeng/core": ["./packages/core/src"]`

### 1.3 apps/web cập nhật

- [ ] T012 Sửa `apps/web/tsconfig.json`: extends `../../tsconfig.base.json`; giữ alias `@/*` → `./src/*`; thêm reference tới `@easyeng/*` paths
- [ ] T013 Sửa `apps/web/package.json`: đổi `name` thành `"web"` (hoặc `@easyeng/web`); giữ nguyên dependencies; thêm script `"dev"`, `"build"`, `"type-check"` để turbo gọi được
- [ ] T014 Kiểm tra `apps/web/next.config.js`: thêm `transpilePackages: ["@easyeng/types", "@easyeng/core", "@easyeng/config"]` (chuẩn bị cho Next transpile workspace packages)

### 1.4 Lockfile & hooks

- [ ] T015 Xoá `apps/web/package-lock.json`; chạy `pnpm install` ở root; xác nhận `pnpm-lock.yaml` được tạo ở root
- [ ] T016 Re-init Husky ở root: di chuyển `.husky/` lên root nếu cần, sửa hook scripts gọi `pnpm` thay `npm`; verify pre-commit hook vẫn chạy lint/type-check trên `apps/web`

### 1.5 CI/Deploy

- [ ] T017 Cập nhật config Vercel (`vercel.json` hoặc dashboard): Root Directory = `apps/web` HOẶC dùng monorepo mode với `turbo run build --filter=web`; Install Command = `pnpm install`; Build Command = `cd ../.. && turbo run build --filter=web`
- [ ] T018 [P] Cập nhật bất kỳ GitHub Actions workflow nào (`.github/workflows/*`) trỏ `frontend/` → `apps/web/`; đổi `npm ci` → `pnpm install --frozen-lockfile`

### Verification Gate — Phase 1

- [ ] T019 `pnpm install` ở root thành công, không lỗi peer deps nghiêm trọng
- [ ] T020 `turbo run type-check --filter=web` pass
- [ ] T021 `turbo run build --filter=web` pass; so sánh bundle size với baseline T001 (không tăng bất thường)
- [ ] T022 `pnpm --filter web dev` chạy; smoke test thủ công: login (teacher + student), dashboard load, booking flow mở được, sidebar links hoạt động
- [ ] T023 Push branch → Vercel preview deploy thành công, preview URL truy cập + login được
- [ ] T024 Commit: `chore(monorepo): migrate frontend to apps/web with pnpm + turborepo`

---

## Phase 2: packages/types (1-2 ngày)

**Purpose**: Tách TypeScript types dùng chung ra package độc lập. An toàn nhất, ít phụ thuộc.

### 2.1 Tạo package

- [x] T025 Tạo `packages/types/` với `package.json` (`name: "@easyeng/types"`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, `exports`); `tsconfig.json` extends base
- [x] T026 `git mv apps/web/src/types/database.ts packages/types/src/database.ts` (giữ history). **THAY ĐỔI so với plan**: KHÔNG move `globals.d.ts` — nó là ambient global declaration (augment `Window` với plausible/gtag/Sentry/webkitAudioContext), chỉ hoạt động qua tsconfig `include` chứ không qua import, và là web-only. Để lại trong `apps/web/src/types/`.
- [x] T027 Tạo `packages/types/src/index.ts` barrel `export * from './database'`
- [x] T028 **KHÔNG move** `cometchat*.d.ts`, `cometchat.types.ts`, `sentry.d.ts`, `globals.d.ts` — để lại trong `apps/web/src/types/` (SDK-binding + ambient web globals)

### 2.2 Wire vào web

- [x] T029 Thêm `"@easyeng/types": "workspace:*"` vào `apps/web/package.json` dependencies; `pnpm install`. `database.ts` self-contained (0 internal imports).
- [x] T030 Find-replace 8 file import `@/types/database` → `@easyeng/types` trong `apps/web/src/**`; Grep verify 0 import cũ
- [x] T031 [P] N/A — không có script regen tự động (database.ts gen thủ công từ migrations). Đã ghi note trong research.md: regen tương lai output thẳng `packages/types/src/database.ts`.

### Verification Gate — Phase 2

- [x] T032 `turbo run type-check --filter=web` pass
- [ ] T033 `turbo run build --filter=web` pass (đang chạy)
- [x] T034 Grep xác nhận 0 import `@/types/database` còn lại trong `apps/web`
- [ ] T035 Commit: `refactor(types): extract shared DB types into @easyeng/types`

---

## Phase 3: packages/core + Adapter Layer (4-6 ngày) ⚠️ RỦI RO CAO

**Purpose**: Đưa hooks/stores/lib portable ra `@easyeng/core`, định nghĩa adapter interface để inject implementation theo platform. **Đụng vào useAuth + data layer của web — làm incremental, smoke test sau mỗi nhóm.**

> **THAY ĐỔI lớn so với plan**: dùng **module-level factory injection** thay vì React Context `CoreProvider`. Core expose `setSupabaseClientFactory`/`setStorage`/`setPlatform` + getter `getSupabaseClient()`/`getStorage()`/`getPlatform()`. Hook giữ nguyên call-site `getSupabaseClient()` → ít churn cho 82 file. (Lý do: xem research.md.)

### 3.1 Tạo package + Adapter interfaces (làm trước, blocking)

- [x] T036 Tạo `packages/core/` (`@easyeng/core`); deps `@easyeng/types`/date-fns; devDeps zustand/react/@supabase/supabase-js (để type-check standalone — peer deps pnpm không auto-install)
- [x] T037 `adapters/storage.ts`: `StorageAdapter` + `setStorage`/`getStorage` (memory fallback nếu chưa set)
- [x] T038 `adapters/supabase.ts`: `setSupabaseClientFactory` + `createClient`/`getSupabaseClient` (delegate factory, throw nếu chưa set)
- [x] T039 `adapters/platform.ts`: `PlatformAdapter { getOrigin, clearAuthCookies, redirect }` + `setPlatform`/`getPlatform`
- [x] T040 **KHÔNG dùng CoreProvider Context** — thay bằng factory injection (xem note trên). `adapters/index.ts` export riêng (subpath `@easyeng/core/adapters`) để core-bootstrap import được mà KHÔNG kéo `'use client'` hooks vào Server Component.

### 3.2 Migrate Stores (2 file — videoCallStore defer Phase 6)

- [x] T041 `git mv notificationStore.ts` → core (in-memory, không đổi)
- [x] T042 `git mv authStore.ts` → core; persist dùng `createJSONStorage(() => getStorage())`
- [x] T043 **DEFER Phase 6**: `videoCallStore.ts` phụ thuộc `@/types/cometchat` (web SDK) — để lại web.

### 3.3 Migrate Lib portable

- [x] T044 **KHÔNG move** `utils.ts` — coupled Tailwind (`clsx`+`tailwind-merge`, hàm `cn`), 35 consumers, mobile dùng NativeWind riêng. Để lại web.
- [x] T045-T048 `git mv` `sanitization`, `timezone`, `grammar/rules`, `queries`, `queries/materials` → core; `queries.ts` đổi import client → `../adapters/supabase`
- [x] T049 Để lại web: `supabase/server`, `middleware`, `csrf*`, `server-only-secrets`, `analytics`, `sentry`, `vitals`, `env`, `utils`

### 3.4 Migrate Hooks (15 hook moved; 4 deferred)

- [x] T050-T053 Move 13 hook portable (gamification/learning/notifications/booking) → core; đổi `@/lib/supabase/client` → `../adapters/supabase`; thêm `'use client'` (bắt buộc cho RSC boundary). Rename `Notification` interface trong `useRealtimeNotifications` → `RealtimeNotification` (tránh collision với notificationStore qua barrel).
- [x] T054 **useAuth** → core: `getSupabaseClient` từ adapter; `window.location.origin`/`document.cookie`/redirect → `getPlatform()`.
- [x] **DEFER**: `useClassSearch` (import type từ web component `ClassFilters`), `usePreferences` (Next Server Action), `useCometChat*`/`useVideoCall` (CometChat web SDK → Phase 6).

### 3.5 Web app implement adapters + bootstrap

- [x] T055 `apps/web/src/adapters/storage.web.ts`: `localStorage` (guard SSR)
- [x] T056 `apps/web/src/adapters/platform.web.ts`: window/document impl
- [x] T057 **`components/CoreBootstrap.tsx`** (`'use client'`, renders null, gọi `registerAdapters()` ở module-load + render body) đặt TRƯỚC `{children}` trong layout → đảm bảo factory set trước khi page hook (useAuth) chạy ở SSR. (Bug đã gặp: page SSR trước layout side-effect → "factory not set". Fix bằng render order.) `core-bootstrap.ts` cũng import từ `@/lib/supabase/client`.
- [x] T058 Thêm `@easyeng/core: workspace:*` vào web
- [x] T059 Find-replace toàn bộ import moved hooks/stores/lib → `@easyeng/core`; subpath `@easyeng/core/adapters` cho bootstrap; Grep verify 0 sót

### Verification Gate — Phase 3

- [x] T060 `turbo run type-check --filter=web` pass
- [x] T061 `turbo run build --filter=web` pass (sau khi fix RSC boundary + CoreBootstrap)
- [x] T062 Smoke test: landing `/vi`, login `/vi/auth/login` (useAuth + factory — KHÔNG còn "factory not set"), dashboard redirect (middleware) — tất cả 200, 0 console error liên quan core. (Hydration warning của next-intl là pre-existing, không liên quan.)
- [ ] T063 E2E `e2e-booking-call.mjs` chạy trên Vercel deploy (không phải local) — defer tới khi deploy preview branch
- [x] T064 Grep 0 import moved hooks/stores/lib còn lại trong web
- [x] T065 Commit `refactor(core): extract shared hooks/stores/lib into @easyeng/core` (f397310)

---

## Phase 4: Khởi tạo Expo app (DONE)

**Purpose**: Dựng `apps/mobile` (Expo SDK 52, RN 0.76) kết nối Supabase qua `@easyeng/core` bằng adapter mobile.

- [x] T066 Scaffold `apps/mobile` thủ công (tránh prompt interactive của `create expo`): package.json (expo ~52, react 18.3.1, RN 0.76.5, async-storage, expo-linking, url-polyfill), app.json, babel.config.js, index.ts
- [x] T067 `metro.config.js` cho monorepo: `watchFolders=[workspaceRoot]`, `nodeModulesPaths` app+root, `unstable_enableSymlinks` + `unstable_enablePackageExports` (pnpm symlink)
- [x] T068 `src/adapters/storage.native.ts` (AsyncStorage), `src/adapters/platform.native.ts` (expo-linking deep-link getOrigin/redirect, clearAuthCookies no-op)
- [x] T069 `src/lib/core-bootstrap.ts`: register factory `createClient` (supabase-js) + AsyncStorage auth storage + `detectSessionInUrl:false` + url-polyfill; import ở `index.ts` trước App
- [x] T070 `App.tsx` smoke screen: login bằng `useAuth` + hiển thị `useGemsBalance` từ core (chứng minh data layer share chạy trên RN)
- [x] T071 `.env.local.example` (EXPO_PUBLIC_SUPABASE_*)

### 2 bug cross-platform phát hiện qua `tsc` mobile (đã fix):
1. `queries/materials.ts` có inline `import('@/components/materials/editor/MaterialEditor').MaterialEditorDraft` — web component type rò vào core. Fix: move interface `MaterialEditorDraft` vào core `materials.ts`, web component re-export từ core.
2. `useRealtimeNotifications.ts` dùng browser global `window`/`Notification` (không có DOM lib ở RN). Fix: access qua `globalThis.window` có guard → web vẫn chạy, native skip (mobile push để Phase 7).

### Verification Gate — Phase 4
- [x] T072 `pnpm --filter mobile type-check` pass (core hooks + types resolve trên RN qua adapter)
- [x] T073 Web không gãy: `turbo type-check --filter=web` pass, `turbo build --filter=web` pass
- [ ] T074 Chạy thật trên simulator/device — CẦN MÁY (Xcode/Android Studio) + EAS dev-client cho native module. Defer (môi trường hiện tại không có simulator).
- [x] T075 Commit (auto-push)

> **Phase 4 chứng minh kiến trúc adapter hoạt động**: cùng `useAuth`/`useGemsBalance` chạy được trên cả web (Next) và mobile (RN), chỉ khác adapter inject. Chạy runtime trên thiết bị thật là bước tiếp theo cần môi trường có simulator.

---

## Phase 5: UI mobile (foundation + dashboard) — IN PROGRESS

**Purpose**: NativeWind + gluestack-ui + Expo Router làm nền, rồi build từng màn hình mobile dùng core hooks.

- [x] T076 Shared Tailwind preset `packages/config/tailwind-preset.js` (editorial color tokens) — web + mobile dùng chung
- [x] T077 NativeWind 4: tailwind.config (extends preset), global.css, babel jsxImportSource, metro withNativeWind, nativewind-env.d.ts
- [x] T078 gluestack-ui Providers (theme + safe-area) ở app root
- [x] T079 Expo Router: root `_layout` + AuthGate (route theo session giữa (auth)/(tabs)), `(auth)/login` (NativeWind + core useAuth), `(tabs)` skeleton; entry → `expo-router/entry`
- [x] T080 **Dashboard student** `(tabs)/index.tsx`: gems, streak, XP, buổi đã học, weekly goal (progress bars), nav links — dùng useGemsBalance/useStreak/useWeeklyGoal/useProgressReport từ core
- [x] T081 Pin Node <21 (.nvmrc=20, engines) + RN 0.76.9 (expo install --fix align SDK 52)

### ⚠️ Toolchain saga (đã giải quyết phần verify được)
- Expo SDK 52 CLI KHÔNG chạy trên Node 22.18+/24 (auto type-strip `.ts`). → Node 20.
- pnpm 11 cần Node ≥22.13 → trên Node 20 dùng **pnpm 9** (global hoặc npx). Lockfile tương thích.
- nvm-windows: tool shells phải prepend `C:\nvm4w\nodejs` vào PATH.

### Verification Gate — Phase 5
- [x] T082 `pnpm --filter mobile type-check` pass (Node 20) — dashboard + router + nativewind className type OK
- [x] T083 Web không gãy: `pnpm --filter web type-check` pass
- [ ] T084 **BLOCKED — Metro bundle (`expo export`)**: version-matrix mismatch trong toolchain Expo SDK 52, KHÔNG phải lỗi code (type-check pass cả 2 app). Đã debug sâu, peel từng layer:
  - **Config phase fix (đã làm)**: `app.json` bỏ `expo-linking` khỏi `plugins` (nó không phải config plugin → `@expo/config-plugins` require fail). `@easyeng/config` thêm `exports` map cho `./tailwind-preset` (NativeWind require được). → Metro vào được transform phase.
  - **Blocker còn lại (transform phase)**: `babel-preset-expo@12.0.12` (resolve từ `expo@52.0.49`) + NativeWind's `react-native-css-interop@0.2.5` yêu cầu `react-native-worklets/plugin`. Nhưng SDK 52 `bundledNativeModules` nói reanimated `~3.16.1`, **worklets = (none)** — reanimated 3.16 plugin self-contained, không cần worklets. Cài `react-native-worklets@0.9.2` (bản duy nhất có) thì babel load được nhưng **crash khi traverse** (0.9.2 dành cho reanimated 4 / RN 0.83, không tương thích RN 0.76). → mâu thuẫn không gỡ tay được.
  - Đã thử: Node 24/22/20, pnpm 11/9, node-linker isolated/hoisted, `babel reanimated:false`, pnpm override babel-preset-expo (không apply được do exact-pin của expo), cài/gỡ worklets.
  - **Fix đúng**: chạy `expo install --fix` để Expo align đồng bộ babel-preset-expo ↔ reanimated ↔ worklets — nhưng nó dùng `npm install` → fail trên `workspace:*` của pnpm. Cần: (a) môi trường Expo+pnpm sạch chạy `pnpm dlx expo-doctor` + align thủ công versions theo bundledNativeModules, hoặc (b) tạm bỏ NativeWind reanimated dependency. Để lại cho bước có thời gian + môi trường mobile chuẩn.
- [x] T085 Commit (auto-push) — Phase 5.5 dashboard (commit trước) + Phase 5 toolchain/config fixes (commit này)

---

## Tổng kết Phase 1-3

| Phase | Tasks | Effort | Gate chính |
|-------|-------|--------|------------|
| 0 (pre-flight) | T001-T004 | 1-2 ngày | Research IAP xong |
| 1 (monorepo) | T005-T024 | 2-3 ngày | Web build + deploy + smoke pass |
| 2 (types) | T025-T035 | 1-2 ngày | type-check + build pass |
| 3 (core+adapters) | T036-T065 | 4-6 ngày | **E2E + full smoke pass** (web không gãy) |

**Sau Phase 3:** `@easyeng/types` + `@easyeng/core` sẵn sàng cho mobile import. Web app chạy 100% trên core qua adapter web. Phase 4 (Expo init) chỉ cần implement adapter mobile (AsyncStorage + Supabase RN client) và bọc cùng `CoreProvider`.

**Nhắc lại 3 điểm nóng:**
1. **T054 (useAuth)** — dễ gãy auth web nhất; làm riêng, test login/logout/OAuth kỹ.
2. **T052 (realtime hooks)** — subscription Supabase phải dùng injected client, dễ sai context.
3. **T017 (Vercel monorepo config)** — sai là deploy đỏ; test preview ngay.
