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

### 3.1 Tạo package + Adapter interfaces (làm trước, blocking)

- [ ] T036 Tạo `packages/core/` (`name: "@easyeng/core"`); `package.json` deps: `@easyeng/types` (workspace), `zustand`, `date-fns`, `date-fns-tz`; peerDeps: `react`, `@supabase/supabase-js`
- [ ] T037 Tạo `packages/core/src/adapters/storage.ts`: interface `StorageAdapter { getItem(key): Promise<string|null>; setItem(key, value): Promise<void>; removeItem(key): Promise<void> }`
- [ ] T038 Tạo `packages/core/src/adapters/supabase.ts`: type `SupabaseClient` (từ `@easyeng/types`/`@supabase/supabase-js`); interface để inject client instance qua context (KHÔNG khởi tạo client trong core — mỗi app tự tạo)
- [ ] T039 Tạo `packages/core/src/adapters/platform.ts`: interface `PlatformAdapter { redirect(url): void; openUrl(url): void; getOrigin(): string; env: Record<string,string|undefined> }` — bọc các API web-only mà `useAuth` cần
- [ ] T040 Tạo `packages/core/src/providers/CoreProvider.tsx`: React Context Provider nhận `{ supabase, storage, platform }` qua props, cung cấp hook `useSupabase()`, `useStorage()`, `usePlatform()` cho hooks bên trong

### 3.2 Migrate Stores (3 file)

- [ ] T041 `git mv apps/web/src/stores/notificationStore.ts packages/core/src/stores/`; không cần đổi (in-memory, không persist)
- [ ] T042 `git mv apps/web/src/stores/authStore.ts packages/core/src/stores/`; refactor `persist` middleware nhận `storage` từ adapter thay `localStorage` mặc định (factory function nhận StorageAdapter)
- [ ] T043 `git mv apps/web/src/stores/videoCallStore.ts packages/core/src/stores/`; refactor persist tương tự T042

### 3.3 Migrate Lib portable (6 nhóm)

- [ ] T044 [P] `git mv apps/web/src/lib/utils.ts packages/core/src/lib/`; verify không import `next/*` hay DOM
- [ ] T045 [P] `git mv apps/web/src/lib/sanitization.ts packages/core/src/lib/`
- [ ] T046 [P] `git mv apps/web/src/lib/timezone.ts packages/core/src/lib/`
- [ ] T047 [P] `git mv apps/web/src/lib/grammar/rules.ts packages/core/src/lib/grammar/`
- [ ] T048 [P] `git mv apps/web/src/lib/queries.ts` + `apps/web/src/lib/queries/materials.ts packages/core/src/lib/queries/`
- [ ] T049 **Để lại** trong `apps/web/src/lib/` (KHÔNG move): `supabase/server.ts`, `supabase/middleware.ts`, `csrf*.ts(x)`, `server-only-secrets.ts`, `analytics.ts`, `sentry.ts`, `vitals.ts`, `env.ts` — verify chúng vẫn import được sau khi lib portable đã move

### 3.4 Migrate Hooks portable (18 hook — làm theo nhóm nhỏ + smoke test)

- [ ] T050 Nhóm gamification: `git mv` `useGemsBalance`, `useStreak`, `useXpSummary`, `useWeeklyGoal` → `packages/core/src/hooks/`; bỏ `'use client'`; verify không còn import `next/navigation`; refactor để gọi `useSupabase()` từ CoreProvider
- [ ] T051 Nhóm learning: `git mv` `useSavedWords`, `useProgressReport`, `useActivityDates`, `usePreferences` → core; refactor như T050
- [ ] T052 Nhóm notifications: `git mv` `useNotificationPreferences`, `useRealtimeNotifications`, `useGemNotifications` → core; refactor + verify realtime subscription dùng injected client
- [ ] T053 Nhóm booking/schedule: `git mv` `useScheduleDraft`, `useSlotSelection`, `useClassSearch`, `useClassReminder`, `useAnalyticsFilters` → core; refactor như T050
- [ ] T054 **`useAuth` refactor (cẩn thận nhất)**: tách logic Supabase session + role lookup từ `profiles` vào `packages/core/src/hooks/useAuth.ts`; đẩy `window.location.origin`, `document.cookie` (OAuth callback URL + sign-out cookie clear), redirect ra `PlatformAdapter`; web tự cung cấp implementation `window`-based

### 3.5 Web app implement adapters + wire CoreProvider

- [ ] T055 Tạo `apps/web/src/adapters/storage.web.ts`: implement `StorageAdapter` bằng `localStorage` (sync wrap thành Promise)
- [ ] T056 [P] Tạo `apps/web/src/adapters/platform.web.ts`: implement `PlatformAdapter` bằng `window.location`/`window.open`
- [ ] T057 Bọc root layout web (`apps/web/src/app/[locale]/layout.tsx` hoặc provider tree) trong `<CoreProvider supabase={browserClient} storage={webStorage} platform={webPlatform}>`; `browserClient` vẫn từ `apps/web/src/lib/supabase/client.ts` (createBrowserClient — ở lại web)
- [ ] T058 Thêm `"@easyeng/core": "workspace:*"` vào `apps/web/package.json`; `pnpm install`
- [ ] T059 Find-replace import trong `apps/web/src/**`: `@/hooks/*` (18 hook đã move) → `@easyeng/core`; `@/stores/*` → `@easyeng/core`; lib đã move → `@easyeng/core`; Grep verify không sót

### Verification Gate — Phase 3

- [ ] T060 `turbo run type-check` pass toàn workspace
- [ ] T061 `turbo run build --filter=web` pass
- [ ] T062 Smoke test web ĐẦY ĐỦ: login teacher + student (useAuth refactor — quan trọng nhất), gems balance hiển thị đúng, streak, vocabulary/saved words, weekly goal, progress report, notifications realtime (mở 2 tab thử), booking flow trừ gems thành công
- [ ] T063 Chạy E2E hiện có `cd apps/web && node e2e-booking-call.mjs` — phải pass (xác nhận realtime + booking + video call web không gãy)
- [ ] T064 Grep xác nhận 0 import `@/hooks/{18 hook}` và `@/stores/*` còn lại trong `apps/web`
- [ ] T065 Commit: `refactor(core): extract shared hooks/stores/lib into @easyeng/core with adapter layer`

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
