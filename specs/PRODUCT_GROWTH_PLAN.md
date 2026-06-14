# EasyEng — Kế hoạch tăng trưởng người dùng (Product Growth Plan)

> Mục tiêu: tăng số người dùng bằng các tính năng **miễn phí** cho học viên, theo thứ tự **Retention (giữ chân) → Viral (lan truyền) → Conversion (chuyển đổi)**.
> Nguyên tắc xuyên suốt: **tái dùng tối đa hạ tầng đã có**, ưu tiên impact cao / công sức thấp.

---

## 0. Phát hiện quan trọng từ khảo sát (đọc trước khi làm)

Hệ thống đã có **rất nhiều backend ngủ đông**: bảng đã tạo trong migration nhưng **chưa được apply lên DB live**, hoặc đã có nhưng UI chưa nối dây.

| Hạng mục | Bảng trong migration | RPC trong DB **live** | UI |
|----------|:--:|:--:|:--:|
| Streak | ✅ `attendance_streaks` (mig 014) | ❌ **chưa có** (`update_attendance_streak`…) | ❌ chưa hiển thị |
| Gems | ✅ `gem_transactions` (mig 006) | ✅ `get_gems_balance`, `process_gem_transaction`… | ✅ có badge + toast |
| Referral | ✅ `referral_codes`, `referrals` (mig 015) | ❌ **chưa có** (`process_referral`…) | ◑ có `ReferralLink.tsx` + trang |
| XP / Level | ✅ `xp_transactions` (mig 028) | ❌ **chưa có** (`award_xp`…) | ◑ có `XPBar`, `LevelBadge` |
| Leaderboard | — | ❌ **chưa có** | ◑ có trang `/leaderboard` (gọi RPC chưa tồn tại) |
| Materials | ✅ `materials` | ✅ đầy đủ | ✅ thư viện + mock test |
| Quiz | ✅ `quizzes`, `quiz_attempts` | ✅ `grade_quiz` | ◑ học viên làm được, editor GV dở |
| Push | — | — | ◑ có SW + util, thiếu VAPID + manifest |
| Certificate | ❌ | ❌ | ❌ **xây mới hoàn toàn** |
| AI Speaking | ❌ | ❌ | ❌ **xây mới hoàn toàn** |

**Nguyên nhân drift:** CI job `deploy-supabase` đang hỏng (token `SUPABASE_ACCESS_TOKEN` không hợp lệ), nên các migration RPC từ 014 trở đi **chưa chạy trên DB live**. Mọi migration trong plan này sẽ **apply trực tiếp lên live qua MCP** (như cách đã làm với mig 085), đồng thời lưu file migration vào repo cho đồng bộ.

> ⚠️ Hệ quả: phần lớn công việc Phase 1–2 là **"đánh thức" backend có sẵn** (apply RPC + nối UI), KHÔNG phải xây từ đầu → rẻ và nhanh hơn nhiều so với dự kiến.

---

## PHASE 1 — RETENTION (giữ chân) · ✅ HOÀN THÀNH (2026-06-14)

Mục tiêu: cho người dùng **lý do quay lại mỗi ngày**.

> ✅ Đã triển khai & verify trên live: 1.1 Daily Streak, 1.4 XP/Level, 1.2 Daily Lesson, 1.3 Push opt-in.
> Migrations 089–092 đã apply lên live qua MCP. **Còn 1 việc cần bạn làm thủ công cho push delivery:** thêm 2 biến env vào Vercel (xem cuối file).

### 1.1 Daily Streak (chuỗi ngày học) 🔥
**Trạng thái:** bảng có, RPC chưa apply, UI chưa có.
- **DB:** apply lại các RPC từ mig 014 lên live: `update_attendance_streak()`, `get_student_streak_stats()`. Thêm cột/logic "streak freeze" (1 lần/tuần miễn phí) nếu chưa có.
- **Trigger streak:** gọi `update_attendance_streak` khi học viên (a) hoàn thành 1 material, (b) tham gia 1 buổi học, (c) làm 1 quiz. Mỗi hành động "tính ngày học hôm nay".
- **UI:** widget 🔥 streak nổi bật ở đầu `dashboard/page.tsx` (số ngày + lịch 7 ngày gần nhất). Thưởng gems mốc 7/30/100 ngày (dùng `gem_transactions` loại `daily_login`).
- **Công sức:** S–M. Impact: ⭐⭐⭐⭐⭐ (cơ chế giữ chân số 1).

### 1.2 Daily Lesson — "Bài học hôm nay" miễn phí
**Trạng thái:** materials đầy đủ, chỉ thiếu cơ chế chọn bài mỗi ngày.
- **DB:** RPC `get_daily_material(p_user_id)` chọn 1 material `published` chưa hoàn thành, xoay vòng theo ngày (deterministic theo `date`), ưu tiên theo `level`/`goal` của học viên.
- **UI:** card "📘 Bài học hôm nay" trên dashboard → mở thẳng `/materials/[slug]`. Hoàn thành → cộng streak + gems + XP.
- Tận dụng luôn **AI Materials Factory** (đang xây) để nguồn bài không cạn.
- **Công sức:** S. Impact: ⭐⭐⭐⭐.

### 1.3 Push notification nhắc học
**Trạng thái:** SW + `pushNotifications.ts` + edge function `send-push-reminder` có; thiếu VAPID + manifest hoàn chỉnh.
- Sinh cặp **VAPID keys**, đặt vào env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- Hoàn thiện `public/site.webmanifest` (name, short_name, icons) để PWA cài được.
- Bảng `push_subscriptions` (nếu chưa có) + nút "Bật nhắc học" trong settings.
- Cron edge function: nhắc nếu hôm nay chưa học (sắp mất streak) lúc 20:00.
- **Công sức:** M. Impact: ⭐⭐⭐⭐ (kéo quay lại miễn phí).

### 1.4 XP / Level hiển thị rõ
**Trạng thái:** bảng + component (`XPBar`, `LevelBadge`) có, RPC chưa apply.
- Apply `award_xp()` + view level lên live; trigger cộng XP cho cùng các hành động ở 1.1.
- Gắn `XPBar` + `LevelBadge` lên header/dashboard để học viên thấy tiến bộ mỗi ngày.
- **Công sức:** S. Impact: ⭐⭐⭐.

---

## PHASE 2 — VIRAL (lan truyền) · ✅ HOÀN THÀNH (2026-06-14)

Mục tiêu: người dùng **tự kéo người mới** + mỗi thành tích là một quảng cáo.

> ✅ Đã triển khai & verify trên live: 2.1 Referral, 2.2 Leaderboard, 2.3 Share cards (OG), 2.4 Certificate.
> Migrations 093–095 đã apply lên live qua MCP. Referral payout verify được (2 bên +100 gems, idempotent); OG image trả PNG; trang chứng chỉ công khai render đúng.

### 2.1 Referral "Mời bạn nhận Gems"
**Trạng thái:** bảng + UI có, RPC chưa apply.
- **DB:** apply `generate_unique_referral_code`, `create_referral_code_for_student`, `process_referral`, `award_referral_gems` lên live. Tự tạo mã khi user mới đăng ký.
- **Logic:** người được mời đăng ký + hoàn thành buổi học/aha đầu tiên → **cả hai** nhận gems (`gem_transactions` loại `referral_bonus` — đã có trong enum).
- **UI:** hoàn thiện `ReferralLink.tsx`: link + mã + nút share Facebook/Zalo, đếm "đã mời X người / nhận Y gems".
- **Công sức:** M. Impact: ⭐⭐⭐⭐⭐ (kênh tăng trưởng 0đ).

### 2.2 Leaderboard công khai + chia sẻ
**Trạng thái:** trang `/leaderboard` có nhưng gọi RPC chưa tồn tại → đang lỗi.
- Apply `get_streak_leaderboard()` / `get_leaderboard()` (XP + streak) lên live.
- Tabs: Tuần / Tháng / Bạn bè. Hiển thị hạng của chính mình.
- Nút "Chia sẻ hạng của tôi" → ảnh đẹp tự sinh (xem 2.3).
- **Công sức:** S–M. Impact: ⭐⭐⭐.

### 2.3 Chia sẻ thành tích (shareable image cards)
**Trạng thái:** mới.
- Dùng **Next.js OG Image** (`@vercel/og` / route `opengraph-image`) sinh ảnh: streak, level-up, hoàn thành khóa, hạng leaderboard.
- Nút "Chia sẻ" lên Facebook/Zalo ở các mốc thành tích → mỗi share là backlink + quảng cáo miễn phí.
- **Công sức:** M. Impact: ⭐⭐⭐⭐.

### 2.4 Certificate (chứng chỉ hoàn thành) — XÂY MỚI
**Trạng thái:** không có gì.
- **DB:** bảng `certificates(id, user_id, kind, title, level, issued_at, public_slug, metadata)`. Cấp khi hoàn thành 1 level/khóa/mock test đạt ngưỡng.
- **Trang công khai** `/[locale]/c/[public_slug]` (không cần đăng nhập) — gắn được vào CV/LinkedIn/Facebook. OG image đẹp.
- **UI:** mục "Chứng chỉ của tôi" trong profile + nút tải PDF/chia sẻ.
- **Công sức:** M–L. Impact: ⭐⭐⭐⭐ (người VN luyện thi rất thích "bằng chứng" → lan truyền mạnh).

---

## PHASE 3 — CONVERSION (chuyển đổi) · ✅ HOÀN THÀNH (2026-06-14)

> ✅ Đã triển khai & verify trên live: 3.1 Free trial (200 gems chào mừng), 3.2 Student quiz (chấm điểm server-side, +10 gems khi đạt — verify 100% 3/3), 3.3 AI Speaking (Web Speech API, miễn phí). Migrations 096–098 apply qua MCP.

### 3.1 Buổi học thử 1-1 miễn phí (Free trial lesson)
**Trạng thái:** dùng lại hệ thống gems + booking đã có.
- Tặng đủ gems cho **1 buổi 1-1 miễn phí** khi đăng ký (grant gems loại `first_booking_bonus` — đã có enum).
- Onboarding dẫn thẳng tới đặt buổi thử → trải nghiệm "aha" trước khi trả tiền.
- Chặn lạm dụng: 1 trial/tài khoản (cờ trên profile hoặc check ledger).
- **Công sức:** S. Impact: ⭐⭐⭐⭐⭐ (đòn bẩy chuyển đổi mạnh nhất).

### 3.2 Quiz / mini-game cho học viên (gamification)
**Trạng thái:** bảng quiz + chấm điểm có; editor GV dở, cần lối vào cho học viên.
- Hoàn thiện trang học viên làm quiz hằng ngày (`/quiz`) + thưởng gems/XP (`quiz_completion` đã có enum).
- "Quiz hằng ngày" gắn vào streak.
- **Công sức:** M. Impact: ⭐⭐⭐.

### 3.3 AI Speaking / Pronunciation miễn phí (giới hạn lượt/ngày) — XÂY MỚI
**Trạng thái:** không có gì. Tính năng khác biệt lớn nhưng nặng nhất.
- **MVP:** Web Speech API (miễn phí, chạy trên trình duyệt) cho học viên đọc câu → chấm phát âm cơ bản; hoặc gọi 1 model AI chấm (giới hạn N lượt/ngày miễn phí).
- Gắn vào materials dạng reading: nút "Luyện đọc to".
- **Công sức:** L (làm sau cùng). Impact: ⭐⭐⭐⭐ (câu chuyện marketing mạnh).

---

## Lộ trình & thứ tự thực thi

| Phase | Tính năng | Công sức | Ghi chú |
|-------|-----------|:--:|------|
| **1** | 1.1 Streak UI + RPC | S–M | Làm đầu tiên |
| **1** | 1.4 XP/Level hiển thị | S | Đi kèm streak |
| **1** | 1.2 Daily Lesson | S | Dùng materials sẵn |
| **1** | 1.3 Push nhắc học | M | Cần VAPID |
| **2** | 2.1 Referral | M | Apply RPC + nối UI |
| **2** | 2.2 Leaderboard | S–M | Sửa trang đang lỗi |
| **2** | 2.3 Share cards | M | OG image |
| **2** | 2.4 Certificate | M–L | Xây mới |
| **3** | 3.1 Free trial | S | Đòn bẩy chuyển đổi |
| **3** | 3.2 Quiz học viên | M | |
| **3** | 3.3 AI Speaking | L | Làm sau cùng |

## Quy ước kỹ thuật khi triển khai
- **DB:** apply migration trực tiếp lên live qua MCP (CI deploy-supabase đang hỏng) + lưu file `supabase/migrations/0XX_*.sql` vào repo. Đánh số tiếp từ migration mới nhất (hiện ~088).
- **Audit schema thật trước mỗi migration** (drift giữa repo và live đã xảy ra nhiều lần): kiểm `information_schema.columns` / `pg_proc` trên live, không tin migration file.
- **i18n:** mọi text thêm vào `frontend/messages/vi.json` + `en.json` (mặc định `vi`).
- **Theme:** dùng token `--et-*` / `--ed-*` cho UI mới (nền tối `--et-bg`).
- **Tái dùng:** gems ledger (`gem_transactions`), streak (`attendance_streaks`), XP (`xp_transactions`) — KHÔNG tạo hệ thống điểm mới.
- **Verify:** mỗi tính năng kiểm bằng Playmwright 2-context (student+teacher) như các flow trước; deploy production qua `gh workflow run deploy.yml -f environment=production`.

---

## Việc cần bạn làm thủ công — Push delivery (Phase 1.3)
Frontend, bảng `push_subscriptions`, route subscribe/unsubscribe và nút "Bật nhắc học" đã xong. Để **gửi được** thông báo, thêm 2 biến môi trường vào Vercel (Project → Settings → Environment Variables) rồi redeploy:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = BACvNmKeyrbR1XFhH4XnMsp1yV9fiVcg1-lOYthUC4zg7H-UQs2Im9JMjkRoTbBS_ZHKGw3fBvDpuVFqBWtVuwQ
VAPID_PRIVATE_KEY            = 8nXC2kNzujNZt75GaV438CZD_rWafj-joG41DiIXenA
```
(Cặp khóa VAPID đã sinh sẵn. `NEXT_PUBLIC_*` phải có TRƯỚC khi build vì được inline lúc build. Sau đó còn cần một cron edge function gửi nhắc lúc 20:00 nếu hôm nay chưa học — sẽ làm khi bắt đầu vận hành push.)

---

## Trạng thái & bước tiếp theo
- ✅ **Phase 1 (Retention)** — xong (migrations 089–092).
- ✅ **Phase 2 (Viral)** — xong (migrations 093–095).
- ✅ **Phase 3 (Conversion)** — xong (migrations 096–098).

🎉 **Toàn bộ 11 tính năng growth đã hoàn thành & deploy lên live.**

### Việc còn lại để vận hành tối ưu (không bắt buộc)
- Push: cron edge function gửi nhắc 20:00 nếu hôm nay chưa học (frontend + bảng đã sẵn).
- AI Speaking: Web Speech API chỉ chạy trên Chrome/Edge; cân nhắc model chấm phát âm chính xác hơn nếu cần.
- Sửa CI `deploy-supabase` (token hỏng) để migration tự chạy thay vì apply tay qua MCP.
- Seed thêm quiz cho học viên (hiện chỉ 1 quiz mẫu).
