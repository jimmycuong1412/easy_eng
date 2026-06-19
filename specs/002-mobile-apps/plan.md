# Implementation Plan: EasyEng Mobile Apps (Android + iOS)

**Branch**: `002-mobile-apps` (đề xuất) | **Date**: 2026-06-20 | **Spec**: this file
**Input**: Phát triển song song app Android + iOS, tái dụng tối đa code từ Next.js web app hiện tại.

---

## Summary

Chuyển repo single-package (`frontend/` Next.js) sang **monorepo** (pnpm + Turborepo), tách business logic dùng chung (types, hooks, stores, Supabase/API adapters) ra các `packages/*`, rồi dựng app mobile native bằng **Expo (Managed + Dev Client)** với **NativeWind + gluestack-ui** cho UI. Web app tiếp tục chạy bình thường trong suốt quá trình.

**Quyết định kiến trúc đã chốt:**
- Package manager: **pnpm workspaces + Turborepo**
- Mobile framework: **Expo Managed + custom Dev Client** (để cài native module CometChat)
- Mobile UI: **NativeWind** (tái dụng tư duy Tailwind) + **gluestack-ui** (thay Radix primitives)
- Output kế hoạch: file markdown trong `specs/002-mobile-apps/`

---

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20
**Web Dependencies (giữ nguyên)**: Next.js 14.2, React 18.2, Tailwind 3, next-intl 4, framer-motion 11, Radix UI, `@supabase/ssr`, `@cometchat/chat-sdk-javascript`
**Mobile Dependencies (mới)**: Expo SDK 52+, React Native 0.76+, NativeWind 4, gluestack-ui, `@supabase/supabase-js` + `@react-native-async-storage/async-storage`, `@cometchat/chat-sdk-react-native`, `@sentry/react-native`, `expo-localization` + `i18n-js` (thay next-intl)
**Storage**: Supabase PostgreSQL (dùng chung, không đổi schema)
**Target Platform**: Web (giữ) + iOS 15+ + Android 8+ (mới)
**Project Type**: Monorepo — 2 apps (`web`, `mobile`) + shared `packages/*`
**Constraints**: Không phá vỡ web app trong suốt migration; mỗi phase phải build/deploy được độc lập
**Scale/Scope**: ~22 hooks, 3 stores, 7 type files, ~25 lib files cần phân loại; 125 component cần viết lại UI cho mobile

---

## Portability Baseline (từ audit codebase)

| Layer | Portable as-is | Cần adapter | Web-only (ở lại `apps/web`) |
|-------|----------------|-------------|------------------------------|
| **Types** (7 file) | `database.ts` (1382 dòng), `globals.d.ts` | — | cometchat/sentry `.d.ts` (thay bằng RN typings) |
| **Stores** (3 file) | `notificationStore` (in-memory) | `authStore`, `videoCallStore` (đổi storage → AsyncStorage) | — |
| **Hooks** (22 file) | 18 hook (gems, streak, vocab, xp, goal, report, notifications, schedule, search...) | `useAuth` (tách `window`/`cookie`), `useCometChat*`, `useVideoCall` (swap SDK) | — |
| **Lib** (25 file) | utils, sanitization, timezone, grammar/rules, queries | `supabase/client`, `api-client` (storage), cometchat wrappers | `supabase/server`, `middleware`, csrf*, `server-only-secrets`, analytics, sentry, vitals |
| **Components** (125 file) | 0% markup | — | 100% (Tailwind/Radix/RSC — viết lại bằng NativeWind/gluestack) |

---

## Phase 0 — Chuẩn bị & quyết định (1-2 ngày)

**Mục tiêu:** Không động vào code, chỉ chuẩn bị nền tảng để migration an toàn.

### 0.1 Tạo branch & backup
- Tạo branch `002-mobile-apps` từ `001-english-learning-platform`.
- Đảm bảo web app build/deploy được ở trạng thái hiện tại (chạy `npm run build` trong `frontend/`, ghi nhận baseline).

### 0.2 Cài pnpm & chuẩn bị migration npm → pnpm
- Cài pnpm global (`npm i -g pnpm`).
- Xác định Node version pin: thêm `.nvmrc` hoặc `engines` field (Node 20).
- Ghi chú: project hiện dùng `package-lock.json` (npm). Sẽ thay bằng `pnpm-lock.yaml`. Husky hooks (`.husky/`) cần re-init sau migration.

### 0.3 Audit dependencies bị hoist nhạy cảm
- Liệt kê các package mà CometChat/Sentry yêu cầu version cụ thể, tránh xung đột peer deps khi hoist trong monorepo.

**Deliverable Phase 0:** branch sạch, pnpm sẵn sàng, checklist deps. **Chưa có thay đổi code chức năng.**

---

## Phase 1 — Dựng skeleton Monorepo (2-3 ngày)

**Mục tiêu:** Di chuyển `frontend/` → `apps/web/` và setup Turborepo, web app vẫn chạy y hệt.

### 1.1 Cấu trúc thư mục đích
```text
easy_eng/
├── apps/
│   └── web/                  ← di chuyển toàn bộ từ frontend/
├── packages/
│   ├── types/                ← (tạo ở Phase 2)
│   ├── core/                 ← (tạo ở Phase 3)
│   └── config/               ← tsconfig base, eslint config dùng chung
├── supabase/                 ← giữ nguyên vị trí
├── package.json              ← root, workspaces + turbo scripts
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### 1.2 Các bước
1. `git mv frontend apps/web` (giữ history).
2. Tạo `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```
3. Tạo root `package.json` với `"private": true`, scripts ủy quyền qua Turbo (`turbo run dev/build/lint/type-check`).
4. Tạo `turbo.json` với pipeline `build`, `dev`, `lint`, `type-check`, `test` + cache outputs (`.next/`, `dist/`).
5. Tạo `packages/config` chứa `tsconfig.base.json` + shared eslint/prettier config; `apps/web/tsconfig.json` extends nó.
6. Cập nhật path alias: `@/*` trong `apps/web` giữ nguyên trỏ `apps/web/src/*`. Thêm alias mới cho packages share (`@easyeng/types`, `@easyeng/core`).
7. Migrate lockfile: xoá `package-lock.json`, chạy `pnpm install` ở root.
8. Re-init Husky ở root (`.husky/` trỏ scripts chạy qua pnpm/turbo).
9. Cập nhật CI/Vercel: root directory build = `apps/web`, install command = `pnpm install`, build = `turbo run build --filter=web`.

### 1.3 Verification gate (BẮT BUỘC trước khi sang Phase 2)
- `pnpm install` ở root thành công.
- `turbo run build --filter=web` build pass.
- `turbo run type-check --filter=web` pass.
- Web app chạy `pnpm --filter web dev` ok, login + dashboard + booking flow hoạt động (smoke test).
- Vercel preview deploy thành công.

**Deliverable Phase 1:** Monorepo chạy được, web app không đổi hành vi.

---

## Phase 2 — Tách `packages/types` (1-2 ngày)

**Mục tiêu:** Đưa TypeScript types dùng chung ra package độc lập (an toàn nhất, ít phụ thuộc).

### 2.1 Các bước
1. Tạo `packages/types` với `package.json` (`name: "@easyeng/types"`), `tsconfig.json` extends base.
2. Move `apps/web/src/types/database.ts` + `globals.d.ts` → `packages/types/src/`.
3. **KHÔNG move** các file SDK-binding (`cometchat*.d.ts`, `sentry.d.ts`) — chúng phụ thuộc SDK web; mobile sẽ có typings riêng từ RN SDK.
4. Export barrel `packages/types/src/index.ts`.
5. Trong `apps/web`: thêm dependency `"@easyeng/types": "workspace:*"`, đổi mọi import `@/types/database` → `@easyeng/types`. (Dùng codemod/find-replace cẩn thận, sau đó type-check.)
6. Cập nhật script regen Supabase types để output thẳng vào `packages/types/src/database.ts` (giữ một nguồn sự thật).

### 2.2 Verification gate
- `turbo run type-check` pass cho cả root.
- `turbo run build --filter=web` pass.
- Không còn import `@/types/database` còn sót (grep).

**Deliverable Phase 2:** `@easyeng/types` dùng chung, web import từ package.

---

## Phase 3 — Tách `packages/core` + Adapter layer (4-6 ngày)

**Mục tiêu:** Đưa hooks + stores + lib portable ra `packages/core`, định nghĩa interface adapter để mỗi platform inject implementation riêng (storage, Supabase client).

### 3.1 Thiết kế Adapter pattern (mấu chốt)
Vấn đề: cùng một hook (`useGemsBalance`) phải chạy ở cả web (Supabase cookie client) và mobile (Supabase AsyncStorage client). Giải pháp: **dependency injection qua React Context**.

```text
packages/core/src/
├── adapters/
│   ├── storage.ts        ← interface StorageAdapter { getItem, setItem, removeItem }
│   ├── supabase.ts       ← interface tạo client + Context Provider
│   └── platform.ts       ← interface PlatformAdapter (redirect, openUrl, env)
├── providers/
│   └── CoreProvider.tsx  ← nhận adapters qua props, cung cấp xuống hooks
├── hooks/                ← 18 hook portable + useAuth refactor
├── stores/               ← 3 store (storage inject từ adapter)
├── lib/                  ← utils, sanitization, timezone, queries, grammar
└── index.ts
```

- **Web** implement: `StorageAdapter` → `localStorage`; Supabase → `createBrowserClient`.
- **Mobile** implement: `StorageAdapter` → `AsyncStorage`; Supabase → `createClient` + AsyncStorage.

### 3.2 Các bước
1. Tạo `packages/core` (`@easyeng/core`), depends `@easyeng/types`, `zustand`, `date-fns`.
2. Định nghĩa interface adapters trong `adapters/`.
3. Move 18 hook portable vào `core/hooks/` — bỏ directive `'use client'` (không cần ở package), đảm bảo không còn import `next/*`.
4. **Refactor `useAuth`**: tách logic auth (Supabase session, role lookup từ `profiles`) vào core; phần `window.location`/`document.cookie`/redirect đẩy qua `PlatformAdapter`.
5. Move 3 store, đổi `persist` để nhận `storage` từ adapter thay vì `localStorage` mặc định.
6. Move lib portable (`utils`, `sanitization`, `timezone`, `grammar/rules`, `queries`, `queries/materials`).
7. **Để lại trong `apps/web`** (không move): `supabase/server`, `middleware`, `csrf*`, `server-only-secrets`, `analytics` (Plausible), `sentry` (Next), `vitals`.
8. Tạo `apps/web` implementations của các adapter, bọc app trong `<CoreProvider>` với web adapters.
9. Đổi mọi import hook/store/lib trong web từ `@/hooks/*`, `@/stores/*` → `@easyeng/core`.

### 3.3 Verification gate
- `turbo run type-check` pass.
- `turbo run build --filter=web` pass.
- Smoke test web đầy đủ: login (useAuth refactor), gems balance, streak, vocabulary, notifications realtime, booking — tất cả phải hoạt động y như trước.
- E2E hiện có (`e2e-booking-call.mjs`) pass.

**Deliverable Phase 3:** `@easyeng/core` dùng chung, web app chạy 100% trên core, adapter layer sẵn sàng cho mobile.

> ⚠️ **Đây là phase rủi ro cao nhất** vì đụng vào `useAuth` và toàn bộ data layer của web. Làm từng hook một, type-check + smoke test sau mỗi nhóm. Cân nhắc dùng `superpowers:systematic-debugging` nếu auth/realtime gãy.

---

## Phase 4 — Khởi tạo Expo app (2-3 ngày)

**Mục tiêu:** Dựng `apps/mobile` chạy được "Hello World" kết nối Supabase qua `@easyeng/core`.

### 4.1 Các bước
1. `pnpm create expo apps/mobile` (Expo SDK mới nhất, template TypeScript).
2. Cấu hình Expo cho monorepo: `metro.config.js` enable `watchFolders` trỏ `packages/*`, `nodeModulesPaths` để resolve workspace packages (pnpm symlink cần `node-linker` config hoặc Metro `resolver.unstable_enableSymlinks`).
3. Thêm deps mobile: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, NativeWind 4, gluestack-ui, `expo-localization`, `i18n-js`.
4. Setup NativeWind: `tailwind.config.js` ở mobile import design tokens (màu editorial, spacing) — tạo `packages/config/tailwind-preset.js` chia sẻ với web để màu sắc đồng nhất.
5. Implement mobile adapters: `StorageAdapter` → AsyncStorage; Supabase client → `createClient` + AsyncStorage + `detectSessionInUrl: false`; `PlatformAdapter` → `expo-linking`/`expo-web-browser`.
6. Bọc app trong `<CoreProvider>` với mobile adapters.
7. Màn hình test: login bằng `useAuth` từ core, hiển thị gems balance — chứng minh data layer share hoạt động trên thiết bị thật.

### 4.2 Verification gate
- `pnpm --filter mobile start` chạy, mở được trên iOS Simulator + Android Emulator.
- Login thành công, đọc được data Supabase qua core hooks.
- Session persist qua AsyncStorage (đóng/mở lại app vẫn đăng nhập).

**Deliverable Phase 4:** Mobile app kết nối backend chung, xác thực + đọc data hoạt động.

---

## Phase 5 — Build UI core flows (nhiều tuần — phase tốn công nhất)

**Mục tiêu:** Viết lại UI mobile cho các luồng chính bằng NativeWind + gluestack-ui.

### 5.1 Thứ tự ưu tiên màn hình
1. **Auth**: Login, register, onboarding (level quiz, career-avatar).
2. **Dashboard student**: home, gems balance, streak, weekly goal, progress.
3. **Find teachers + Booking**: danh sách teacher, profile, chọn slot, xác nhận booking (dùng gems).
4. **Free features** (vừa thêm vào sidebar web): learning path, vocabulary + flashcard SRS, AI tools, progress report.
5. **Navigation**: dùng Expo Router (file-based, tương đồng Next App Router) hoặc React Navigation.

### 5.2 Nguyên tắc
- Mỗi màn hình tái dụng hook từ `@easyeng/core` (data), chỉ viết mới phần JSX/style.
- Dùng `packages/config/tailwind-preset` để giữ màu sắc/spacing khớp web.
- i18n: port message keys từ `next-intl` (`vi.json`/`en.json`) sang `i18n-js` — giữ cùng key structure, có thể share file JSON qua `packages/config` hoặc `packages/i18n`.

### 5.3 Verification gate
- Mỗi luồng test trên cả iOS + Android (simulator + 1 thiết bị thật).
- Booking flow hoàn chỉnh: chọn teacher → book slot → trừ gems → tạo booking trong DB.

**Deliverable Phase 5:** App mobile dùng được cho các luồng học chính (chưa có video call).

---

## Phase 6 — CometChat (video call + chat) trên mobile (1-2 tuần)

**Mục tiêu:** Tích hợp live class — tính năng lõi, phức tạp nhất về native.

### 6.1 Các bước
1. Cài `@cometchat/chat-sdk-react-native` + `@cometchat/calls-sdk-react-native` (cần native code → build custom **Dev Client** qua EAS).
2. Cấu hình permissions: camera, microphone (iOS `Info.plist`, Android manifest) qua Expo config plugins.
3. Refactor `useCometChat*` + `useVideoCall` trong core: tách interface (init, login, join call, messages) khỏi implementation SDK; web giữ JS SDK, mobile dùng RN SDK qua cùng interface.
4. Build màn hình lớp học live (video grid, chat panel, controls).
5. Test 2 thiết bị: student + teacher join cùng lớp, A/V + chat hoạt động (tương đương `e2e-booking-call.mjs` của web).

### 6.2 Verification gate
- Video call 2 chiều hoạt động trên iOS ↔ Android.
- Chat realtime trong lớp ổn định.

**Deliverable Phase 6:** Live class hoạt động trên mobile.

---

## Phase 7 — Payments, Push, Build & Release (1-2 tuần)

### 7.1 Payments
- Web dùng VNPay/MoMo/ZaloPay (redirect) + Stripe. Mobile: dùng deep link redirect cho cổng VN, Stripe dùng `@stripe/stripe-react-native`.
- ⚠️ Lưu ý chính sách App Store/Play: mua "digital goods" (gems) có thể bị buộc dùng IAP (Apple IAP / Google Play Billing) — **cần research riêng**, ảnh hưởng lớn đến doanh thu (phí 15-30%). Booking giáo viên (dịch vụ thật) thường được miễn IAP nhưng phải xác nhận.

### 7.2 Push notifications
- Web hiện realtime qua Supabase. Mobile thêm `expo-notifications` + FCM (Android) / APNs (iOS) cho push thật.

### 7.3 Build & Release
- Setup **EAS Build** (cloud build iOS/Android) + **EAS Submit** (lên store).
- Setup EAS Update cho OTA (sửa JS không cần qua review store).
- Chuẩn bị tài sản store: icon, splash, screenshots, mô tả; tài khoản Apple Developer ($99/năm) + Google Play ($25 một lần).

### 7.4 Verification gate
- Build production .ipa + .apk thành công qua EAS.
- TestFlight (iOS) + Internal testing (Android) cài được, chạy đủ luồng.

**Deliverable Phase 7:** App sẵn sàng submit store.

---

## Tổng kết Effort & Rủi ro

| Phase | Nội dung | Ước tính | Rủi ro |
|-------|----------|----------|--------|
| 0 | Chuẩn bị | 1-2 ngày | Thấp |
| 1 | Monorepo skeleton | 2-3 ngày | Trung (CI/Vercel config) |
| 2 | packages/types | 1-2 ngày | Thấp |
| 3 | packages/core + adapters | 4-6 ngày | **Cao** (đụng useAuth, data layer web) |
| 4 | Expo init | 2-3 ngày | Trung (Metro + pnpm symlink) |
| 5 | UI core flows | 3-5 tuần | Trung (khối lượng lớn) |
| 6 | CometChat mobile | 1-2 tuần | **Cao** (native SDK, A/V) |
| 7 | Payments/Push/Release | 1-2 tuần | **Cao** (chính sách IAP store) |

**Tổng:** ~2-3 tháng cho 1-2 dev có kinh nghiệm React Native.

**3 rủi ro lớn nhất cần giải quyết sớm:**
1. **IAP store policy** cho gems (Phase 7 nhưng nên research ngay Phase 0) — có thể buộc thiết kế lại flow thanh toán.
2. **Phase 3 refactor `useAuth`/data layer** — dễ làm gãy web app; làm incremental + test kỹ.
3. **CometChat RN SDK** — native, build phức tạp; nên prototype sớm (dựng spike riêng) để giảm rủi ro Phase 6.

---

## Nguyên tắc xuyên suốt

- **Web app không được gãy** sau mỗi phase — mỗi phase có verification gate bắt buộc.
- **Một nguồn sự thật** cho types (Supabase regen → `packages/types`) và design tokens (`packages/config/tailwind-preset`).
- **Adapter pattern** là cốt lõi cho phép share logic mà không share UI.
- Làm incremental, commit nhỏ, type-check + smoke test sau mỗi nhóm thay đổi.
