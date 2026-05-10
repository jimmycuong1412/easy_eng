# Materials Library — Test Suite
**Feature**: Materials Library (Vietnamese-targeted)
**Branch**: `001-english-learning-platform`
**Phases covered**: 1 (Schema), 2 (MaterialCard), 3 (Catalog), 4 (Detail + Rewards), 5 (Mock Test), 6 (Authoring)
**Format**: AntiGravity IDE structured test cases

## Environment

| Key | Value |
|-----|-------|
| Base URL | `https://easyeng-dev.vercel.app` |
| Admin | `jimmycuong1412@gmail.com` / `123456` |
| Teacher | `jimmycuong1414@gmail.com` / `123456` |
| Student | `jimmycuong1413@gmail.com` / `123456` |
| Supabase project | `evrcwtsexlamacawofxo` |

> **Login path**: `https://easyeng-dev.vercel.app/vi/auth/login`
> After login, Supabase sets an `sb-*` cookie that persists for the browser session.
> Sign out between tests that require a different role.

---

## Suite 1 — Database Schema & RLS

> SQL tests run against project `evrcwtsexlamacawofxo` via the Supabase dashboard SQL editor
> (`https://supabase.com/dashboard/project/evrcwtsexlamacawofxo/editor`) or the Supabase MCP tool.

### TC-001 All six material types exist in the enum
**Pre-conditions**: Migrations 080a + 080b applied to `evrcwtsexlamacawofxo`
**Steps**:
1. Run SQL: `SELECT unnest(enum_range(NULL::material_type))::text ORDER BY 1`
**Expected**: Returns exactly `dialogue, grammar_lesson, listening_audio, mock_test, reading_passage, vocabulary_pack`

---

### TC-002 `materials` table has required columns
**Pre-conditions**: Migration 080b applied
**Steps**:
1. Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name='materials' ORDER BY 1`
**Expected**: Result includes `author_id, body_en, body_vi, cover_path, duration_min, gems_reward, goal, id, level, min_completion_pct, popularity_score, published_at, slug, status, summary_en, summary_vi, title_en, title_vi, type, updated_at, xp_reward`

---

### TC-003 `mock_test_items_public` view never exposes `correct_index`
**Pre-conditions**: Migration 081 applied
**Steps**:
1. Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name='mock_test_items_public'`
**Expected**: Column list does NOT contain `correct_index`, `explanation_vi`, or `explanation_en`

---

### TC-004 Anonymous users can read published materials but not drafts
**Pre-conditions**: Migration 081 applied; at least one `status='published'` and one `status='draft'` material exist
**Steps**:
1. Open a new incognito window (no auth cookies)
2. In the Supabase dashboard, switch role to `anon` and run: `SELECT count(*) FROM materials WHERE status='published'`
3. Run: `SELECT count(*) FROM materials WHERE status='draft'`
**Expected**: Step 2 returns ≥ 1; Step 3 returns 0 (RLS blocks draft rows for anon)

---

### TC-005 Teacher sees only their own drafts via RLS
**Pre-conditions**: Migration 081 applied; teacher `jimmycuong1414@gmail.com` has created at least 1 draft; admin `jimmycuong1412@gmail.com` has created at least 1 draft owned by a different `author_id`
**Steps**:
1. Sign in to the Supabase dashboard as the teacher's JWT (use `SET LOCAL role = authenticated; SET LOCAL request.jwt.claims = '{"sub":"<teacher-uuid>"}'`)
2. Run SQL: `SELECT id, author_id FROM materials WHERE status='draft'`
**Expected**: Only rows where `author_id` equals the teacher's UUID are returned; other authors' drafts are not visible

---

### TC-006 Admin sees all materials regardless of status
**Pre-conditions**: Migration 081 applied; materials exist in `draft`, `in_review`, `published`, `archived` statuses
**Steps**:
1. Sign in as `jimmycuong1412@gmail.com` (admin)
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
**Expected**: All materials across all statuses and authors are listed

---

### TC-007 `material_progress` upsert is idempotent
**Pre-conditions**: Migration 080b applied; student `jimmycuong1413@gmail.com` exists; at least one published material exists
**Steps**:
1. Run SQL twice with the same `(user_id, material_id)` pair:
   ```sql
   INSERT INTO material_progress (user_id, material_id, state, completion_pct)
   VALUES ('<student-uuid>', '<material-uuid>', 'completed', 100)
   ON CONFLICT (user_id, material_id) DO UPDATE SET state = EXCLUDED.state;
   ```
2. Run: `SELECT count(*) FROM material_progress WHERE user_id='<student-uuid>' AND material_id='<material-uuid>'`
**Expected**: Second insert does not error; count is exactly 1

---

### TC-008 `grade_mock_test` RPC returns score without leaking `correct_index`
**Pre-conditions**: Migration 083 applied; a published `mock_test` material with 5 seeded questions exists (from seed migration 084)
**Steps**:
1. Sign in as student `jimmycuong1413@gmail.com`
2. Call RPC in the SQL editor:
   ```sql
   SELECT grade_mock_test('<student-uuid>', '<mock-test-material-uuid>', ARRAY[0,1,0,2,0]);
   ```
3. Inspect the returned JSON
**Expected**: Result contains `score_pct, passed, items_correct, items_total, per_item`; each `per_item` object has `idx, correct, explanation_vi` — NO `correct_index` key anywhere in the response

---

### TC-009 Seed materials are present after migration 084 is applied
**Pre-conditions**: Migration 084 applied to `evrcwtsexlamacawofxo`
**Steps**:
1. Run SQL: `SELECT type, count(*) FROM materials GROUP BY type ORDER BY type`
**Expected**: Each of the 6 material types has exactly 5 rows

---

## Suite 2 — MaterialCard Component
> Suite 2 tests are unit-level (Jest + React Testing Library) and run locally with `npm test`.
> They do not require the prod environment.

### TC-010 Card renders Vietnamese title
**Pre-conditions**: `<MaterialCard>` mounted with `title_vi="Giao tiếp cơ bản"`, `title_en=null`, `locale="vi"`
**Steps**:
1. Mount component
2. Read text content of the title element
**Expected**: "Giao tiếp cơ bản" is visible

---

### TC-011 Card uses English title when locale is `en` and `title_en` is set
**Pre-conditions**: `<MaterialCard>` mounted with `title_vi="Giao tiếp cơ bản"`, `title_en="Basic Conversation"`, `locale="en"`
**Steps**:
1. Mount component
**Expected**: "Basic Conversation" is visible; "Giao tiếp cơ bản" is not visible

---

### TC-012 Card falls back to Vietnamese title when `title_en` is null and locale is `en`
**Pre-conditions**: `<MaterialCard>` mounted with `title_vi="Giao tiếp cơ bản"`, `title_en=null`, `locale="en"`
**Steps**:
1. Mount component
**Expected**: "Giao tiếp cơ bản" is visible

---

### TC-013 Type pill renders correct Vietnamese label
**Pre-conditions**: `<MaterialCard>` with `type="vocabulary_pack"`
**Steps**:
1. Locate element `[data-testid="material-card-type"]`
**Expected**: Text is "Từ vựng"

---

### TC-014 Progress strip appears when `progress` prop is provided
**Pre-conditions**: `<MaterialCard>` with `progress={completion_pct: 60, state: 'in_progress'}`
**Steps**:
1. Locate element `[data-testid="material-card-progress"]`
**Expected**: Element is in the DOM; displays "60%"

---

### TC-015 No progress strip when `progress` prop is null
**Pre-conditions**: `<MaterialCard>` with `progress=null`
**Steps**:
1. Query `[data-testid="material-card-progress"]`
**Expected**: Element is NOT in the DOM

---

### TC-016 `mock_test` card does not show reward chip
**Pre-conditions**: `<MaterialCard>` with `type="mock_test"`, `gems_reward=0`, `xp_reward=0`
**Steps**:
1. Mount component; check for reward display
**Expected**: No "⟡" gem symbol or "XP" string is rendered on the card

---

### TC-017 Skeleton renders without crashing
**Pre-conditions**: None
**Steps**:
1. Mount `<MaterialCard.Skeleton />`
2. Locate element `[data-testid="material-card-skeleton"]`
**Expected**: Element is in the DOM; no errors thrown

---

## Suite 3 — Catalog Page (US1)

### TC-018 Catalog page renders published materials
**Pre-conditions**: Seed migration 084 applied (30 published materials)
**Steps**:
1. Open a new incognito window (no auth)
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials`
**Expected**: Page displays at least 24 material cards; each card has a title and type pill visible

---

### TC-019 Level filter narrows results
**Pre-conditions**: Catalog page at `https://easyeng-dev.vercel.app/vi/materials`; A2-level seed materials exist
**Steps**:
1. Click the "A2" filter chip inside `[data-testid="material-filters"]`
**Expected**: URL updates to `?level=a2`; only A2 level cards remain visible

---

### TC-020 Multiple level filters work together
**Pre-conditions**: Catalog page loaded
**Steps**:
1. Click the "A1" level chip
2. Click the "B1" level chip (both active simultaneously)
**Expected**: Cards shown are a mix of A1 and B1 levels only; A2, B2, C1 cards are hidden

---

### TC-021 Type filter narrows results
**Pre-conditions**: Catalog page loaded
**Steps**:
1. Click the "Từ vựng" type chip
**Expected**: Only `vocabulary_pack` type cards are shown; all other type cards are hidden

---

### TC-022 Catalog shows empty state when filters match nothing
**Pre-conditions**: No seed material combines `type=mock_test` with `level=c1`
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials?type=mock_test&level=c1`
2. Query `[data-testid="materials-catalog-empty"]`
**Expected**: Empty-state element is in the DOM; no material cards are rendered

---

### TC-023 Catalog is server-rendered (SEO-friendly)
**Pre-conditions**: None
**Steps**:
1. Run: `curl -s "https://easyeng-dev.vercel.app/vi/materials" | grep -i "title_vi\|Từ vựng\|<title"`
**Expected**: Material card titles (or Vietnamese content) appear in the raw HTML response body, not injected by JavaScript; `<title>` tag is present

---

### TC-024 JSON-LD CollectionPage schema is present
**Pre-conditions**: Catalog page loaded
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials`
2. Open DevTools → Elements; search for `<script type="application/ld+json">`
3. Inspect the JSON content
**Expected**: JSON-LD contains `"@type": "CollectionPage"` or `"Course"`; `"inLanguage"` value is `"vi-VN"`

---

## Suite 4 — Material Detail Page (US2)

### TC-025 Vocabulary pack renders Vietnamese table
**Pre-conditions**: Seed migration 084 applied; a seeded `vocabulary_pack` is published (check its slug in the DB, e.g. `SELECT slug FROM materials WHERE type='vocabulary_pack' LIMIT 1`)
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<vocab-slug>`
**Expected**: Vocabulary table is visible; each row shows the term, IPA, and Vietnamese gloss; each row has a "Tôi biết từ này" button

---

### TC-026 Grammar lesson renders Markdown body
**Pre-conditions**: A seeded `grammar_lesson` is published; `body_vi` contains at least one heading and one list
**Steps**:
1. Get slug: `SELECT slug FROM materials WHERE type='grammar_lesson' LIMIT 1`
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<grammar-slug>`
3. Inspect rendered HTML
**Expected**: Heading renders as `<h2>` or `<h3>`; list items render as `<li>`

---

### TC-027 Listening player shows audio element
**Pre-conditions**: A seeded `listening_audio` material is published and has an audio asset in `material-assets`
**Steps**:
1. Get slug: `SELECT slug FROM materials WHERE type='listening_audio' LIMIT 1`
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<listening-slug>`
3. Locate `[data-testid="listening-audio"]`
**Expected**: `<audio>` element is in the DOM with a non-empty `src` attribute

---

### TC-028 Listening player shows fallback transcript after 5 s if audio fails
**Pre-conditions**: `<ListeningPlayer>` rendered in a local test with an invalid audio URL
**Steps**:
1. Mount the component locally with `src="https://example.invalid/audio.mp3"`
2. Wait 5 seconds (or fire the `error` event on the `<audio>` element in DevTools)
3. Query `[data-testid="listening-audio-failed"]`
**Expected**: Transcript / fallback notice element is in the DOM

---

### TC-029 Dialogue player shows "shadow-read done" button
**Pre-conditions**: A seeded `dialogue` material is published
**Steps**:
1. Sign in as `jimmycuong1413@gmail.com` (student)
2. Get slug: `SELECT slug FROM materials WHERE type='dialogue' LIMIT 1`
3. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<dialogue-slug>`
4. Locate `[data-testid="dialogue-shadow-done"]`
**Expected**: Button is in the DOM and clickable

---

### TC-030 Reading passage shows "mark done" button
**Pre-conditions**: A seeded `reading_passage` material is published
**Steps**:
1. Sign in as `jimmycuong1413@gmail.com` (student)
2. Get slug: `SELECT slug FROM materials WHERE type='reading_passage' LIMIT 1`
3. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<reading-slug>`
4. Locate `[data-testid="reading-mark-done"]`
**Expected**: Button is in the DOM and clickable

---

### TC-031 Grammar lesson shows "mark done" button
**Pre-conditions**: A seeded `grammar_lesson` material is published
**Steps**:
1. Sign in as `jimmycuong1413@gmail.com` (student)
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<grammar-slug>`
3. Locate `[data-testid="grammar-mark-done"]`
**Expected**: Button is in the DOM and clickable

---

### TC-032 Vocabulary pack — completing ≥ 80% of items triggers `award_material_completion`
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com` (student); vocabulary pack with 10 seeded items exists; student has NOT previously completed this material (clear `material_progress` row if needed)
**Steps**:
1. Open DevTools → Network tab; set filter to `rpc`
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<vocab-slug>`
3. Click "Tôi biết từ này" on 8 of 10 vocabulary cards
4. Observe the UI
**Expected**: A POST to `award_material_completion` appears in the Network tab; `[data-testid="progress-ribbon"]` appears showing "+X ⟡ +Y XP"

---

### TC-033 `award_material_completion` is idempotent — second completion shows "already earned"
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; student HAS already completed the same vocabulary pack (TC-032 was run)
**Steps**:
1. Navigate back to the same vocabulary pack detail page
2. Click "Tôi biết từ này" on all items again
3. Locate `[data-testid="progress-ribbon-already"]`
**Expected**: "Already earned" ribbon variant is shown; no second row is inserted in `gem_transactions` (verify via SQL: `SELECT count(*) FROM gem_transactions WHERE user_id='<student-uuid>' AND metadata->>'material_id'='<material-uuid>'` — should still be 1)

---

### TC-034 `mock_test` detail page redirects to `/test` sub-route
**Pre-conditions**: A seeded `mock_test` material is published
**Steps**:
1. Get slug: `SELECT slug FROM materials WHERE type='mock_test' LIMIT 1`
2. Open incognito and navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>`
**Expected**: Browser is redirected to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`; the catalog detail page body is NOT rendered

---

### TC-035 Detail page shows login CTA for anonymous users
**Pre-conditions**: Not logged in; any published material with `min_completion_pct > 0`
**Steps**:
1. Open incognito
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<any-slug>`
**Expected**: Page content (title, body) is visible (SSR); a "Đăng nhập để lưu tiến trình" or equivalent CTA is visible; completion buttons ("Tôi biết từ này", "mark done") are NOT rendered or are disabled

---

### TC-036 MaterialBody falls back to Vietnamese when `body_en` is null and locale is `en`
**Pre-conditions**: A published material has `body_en = NULL`
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/en/materials/<slug-for-null-body-en-material>`
**Expected**: Vietnamese body text is rendered; a "translation pending" eyebrow notice is visible on the page

---

## Suite 5 — Mock Test Player (US3)

### TC-037 Mock test page requires authentication
**Pre-conditions**: Not logged in
**Steps**:
1. Open incognito
2. Get slug: `SELECT slug FROM materials WHERE type='mock_test' LIMIT 1`
3. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
**Expected**: Browser redirects to `https://easyeng-dev.vercel.app/vi/auth/login?redirect=/vi/materials/<mock-test-slug>/test`; test questions are NOT visible

---

### TC-038 Questions are loaded without `correct_index` in the network response
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com` (student)
**Steps**:
1. Open DevTools → Network tab; set filter to `mock_test_items`
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
3. Locate the Supabase REST request that fetches questions
4. Click on the request and inspect the Response body JSON
**Expected**: Response contains objects with `idx, format, prompt_vi, options_en` — neither `correct_index`, `explanation_vi`, nor `explanation_en` appears anywhere in the response body

---

### TC-039 Student can select one answer per multiple-choice question
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; mock test page loaded
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
2. Click the second answer option (index 1) for question 0
3. Click the third answer option (index 2) for question 0
**Expected**: Only the third option is highlighted/selected after the second click; exactly one option is selected at a time per question

---

### TC-040 Submit is disabled until all questions are answered
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; mock test page loaded; no answers selected yet
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
2. Do not select any answers
3. Inspect the submit button
**Expected**: Submit button has `disabled` attribute or is visually disabled (no pointer events); clicking it does nothing

---

### TC-041 Submit calls `grade_mock_test` and shows result banner
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; all questions answered
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
2. Select one answer for each question
3. Click the submit button
4. Wait for the network request to `grade_mock_test` to complete
5. Locate `[data-testid="mock-test-result-banner"]`
**Expected**: Result banner appears displaying score (e.g. "60%", "3/5 câu đúng") and pass/fail status

---

### TC-042 Per-item results appear after grading
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; mock test just submitted (continuing from TC-041)
**Steps**:
1. After the result banner appears, locate `[data-testid="mock-test-result-item-0"]` through `[data-testid="mock-test-result-item-4"]`
**Expected**: All 5 result-item elements are in the DOM; each shows whether the answer was correct; each shows the Vietnamese explanation (`explanation_vi`) text

---

### TC-043 Mock test awards no gems or XP
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; mock test NOT previously completed; result banner visible after submission
**Steps**:
1. After submitting, inspect the result screen for reward indicators
2. Run SQL: `SELECT count(*) FROM gem_transactions WHERE user_id='<student-uuid>' AND metadata->>'material_id'='<mock-test-uuid>'`
**Expected**: Result screen shows only the score and per-item explanations; no "⟡" gem or "XP" reward is displayed; SQL count returns 0

---

### TC-044 `fetchMockTestQuestions` defensive throw when `correct_index` leaks
**Pre-conditions**: Local unit test environment
**Steps**:
1. Call `fetchMockTestQuestions(supabase, materialId)` with a mocked Supabase client that returns `[{id: "x", idx: 0, correct_index: 0, format: "multiple_choice", prompt_vi: "Q", options_en: ["A","B"], points: 1}]`
**Expected**: Function throws an error with message containing `"mock_test_items_public is leaking correct_index"`; no data is returned

---

### TC-045 Mock test page is excluded from search indexing
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
2. Open DevTools → Elements; search `<head>` for `<meta name="robots">`
**Expected**: `content` attribute is `"noindex"` or `"noindex, nofollow"`

---

## Suite 6 — Admin/Teacher Authoring (US4)

### TC-046 Admin list page redirects unauthenticated users to login
**Pre-conditions**: Not logged in (incognito)
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
**Expected**: Browser redirects to `https://easyeng-dev.vercel.app/vi/auth/login`; the admin material list is NOT visible

---

### TC-047 Student role is denied access to the admin list page
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com` (student)
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
**Expected**: Access is denied — user sees an access-denied message or is redirected; the material admin list is NOT rendered

---

### TC-048 Admin sees all materials across all authors
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com` (admin); materials from multiple authors exist (teacher `jimmycuong1414@gmail.com` has created at least one)
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
**Expected**: Materials authored by both the admin and the teacher `jimmycuong1414@gmail.com` appear in the list

---

### TC-049 Teacher sees only their own materials
**Pre-conditions**: Signed in as `jimmycuong1414@gmail.com` (teacher); teacher has at least 1 material; admin `jimmycuong1412@gmail.com` has at least 1 material
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
**Expected**: Only materials where `author_id` equals the teacher's UUID appear; the admin's materials are NOT shown

---

### TC-050 "Tạo mới" button opens the type-picker modal
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com` (admin); on admin list page
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
2. Click `[data-testid="create-material-btn"]`
**Expected**: A modal overlay appears listing 6 material type buttons: Từ vựng, Ngữ pháp, Đọc, Nghe, Hội thoại, Đề luyện thi

---

### TC-051 Selecting a type creates a draft and navigates to the editor
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; type-picker modal open (from TC-050)
**Steps**:
1. Click `[data-testid="create-type-vocabulary_pack"]`
2. Wait for navigation
**Expected**: A loading spinner appears briefly; browser navigates to `https://easyeng-dev.vercel.app/vi/materials/admin/editor/<new-uuid>`; the editor page loads with an empty `vocabulary_pack` draft; `[data-testid="material-editor"]` is in the DOM

---

### TC-052 Editor page shows forbidden screen when teacher edits another teacher's material
**Pre-conditions**: Signed in as `jimmycuong1414@gmail.com` (teacher); a draft material authored by `jimmycuong1412@gmail.com` (admin) exists — get its UUID via `SELECT id FROM materials WHERE author_id='<admin-uuid>' LIMIT 1`
**Steps**:
1. Navigate directly to `https://easyeng-dev.vercel.app/vi/materials/admin/editor/<admin-material-uuid>`
**Expected**: Page shows "Bạn không có quyền chỉnh sửa tài liệu này"; the editor form (`[data-testid="material-editor"]`) is NOT rendered

---

### TC-053 Editor renders with the `material-editor` testid
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com` (admin); an existing draft material created in TC-051
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin/editor/<draft-uuid>`
2. Locate `[data-testid="material-editor"]`
**Expected**: Element is in the DOM; the editor form fields are visible

---

### TC-054 Save is blocked when `title_vi` is empty
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; on the editor page for the draft from TC-051; `title_vi` field is empty (it should be by default for a new draft)
**Steps**:
1. Navigate to the editor page for the new draft
2. Leave the "Tiêu đề (tiếng Việt)" field empty
3. Click `[data-testid="editor-save-draft"]`
4. Locate `[data-testid="error-title_vi"]`
**Expected**: Validation error is shown inline; no network request to `materials` upsert is made

---

### TC-055 Save is blocked when `summary_vi` is empty
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; on the editor page; `title_vi` filled in but `summary_vi` is empty
**Steps**:
1. Type a title in the "Tiêu đề (tiếng Việt)" field
2. Leave "Tóm tắt (tiếng Việt)" empty
3. Click `[data-testid="editor-save-draft"]`
4. Locate `[data-testid="error-summary_vi"]`
**Expected**: Validation error is shown; save is not attempted

---

### TC-056 `vocabulary_pack` save is blocked when fewer than 8 items are present
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; on the editor page for a `vocabulary_pack` draft; `title_vi` and `summary_vi` filled; only 2 vocabulary items added in the `[data-testid="vocab-items-editor"]` panel
**Steps**:
1. Fill `title_vi` and `summary_vi`
2. Add only 2 vocabulary items via the vocab editor
3. Click `[data-testid="editor-save-draft"]`
4. Locate `[data-testid="error-vocab-items"]`
**Expected**: Validation error is visible mentioning the 8-item minimum; save is not attempted

---

### TC-057 `vocabulary_pack` save succeeds with exactly 8 items
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; on a `vocabulary_pack` editor page; `title_vi`, `summary_vi`, `body_vi` filled; exactly 8 vocabulary items added (each with `term` and `gloss_vi` filled)
**Steps**:
1. Fill all required fields and add 8 vocab items
2. Click `[data-testid="editor-save-draft"]`
3. Wait for the save to complete
**Expected**: `[data-testid="error-vocab-items"]` is NOT in the DOM; the page title updates to reflect the saved title OR the URL stays at the same `/editor/<uuid>`; no error toast appears

---

### TC-058 `mock_test` save is blocked when fewer than 5 questions are present
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; create a new `mock_test` draft via the type picker; fill `title_vi` and `summary_vi`; add only 1 test item in the `[data-testid="mock-test-items-editor"]` panel
**Steps**:
1. Fill required fields and add 1 test question
2. Click `[data-testid="editor-save-draft"]`
3. Locate `[data-testid="error-test-items"]`
**Expected**: Validation error is visible mentioning the 5-question minimum; save is not attempted

---

### TC-059 Conflict banner appears on optimistic-lock collision (409)
**Pre-conditions**: Local unit test (this is hard to reproduce in prod without race conditions); `<MaterialEditor>` with `type="grammar_lesson"`, valid fields; Supabase upsert mock returns `{data: null, error: {code: "409"}}`
**Steps**:
1. Trigger the mocked 409 response by clicking `[data-testid="editor-save-draft"]`
2. Locate `[data-testid="editor-conflict-banner"]`
**Expected**: Conflict banner is in the DOM with a message about someone else having saved changes; user is prompted to reload

---

### TC-060 `onSaved` is called with the material ID on successful save
**Pre-conditions**: Local unit test; `<MaterialEditor>` with `type="grammar_lesson"`, valid `title_vi`, `summary_vi`, `body_vi`; Supabase upsert mock returns `{data: {id: "mat-1", updated_at: "2026-05-10T00:00:00Z"}, error: null}`
**Steps**:
1. Click `[data-testid="editor-save-draft"]`
2. Wait for async resolution
**Expected**: `onSaved` callback is called exactly once with `"mat-1"`

---

### TC-061 Vocabulary items editor renders each item with its testid
**Pre-conditions**: `<VocabularyItemsEditor>` mounted with 3 initial items (local unit test)
**Steps**:
1. Query `[data-testid="vocab-item-0"]`, `[data-testid="vocab-item-1"]`, `[data-testid="vocab-item-2"]`
**Expected**: All three containers are in the DOM

---

### TC-062 Mock test items editor renders each item with its testid
**Pre-conditions**: `<MockTestItemsEditor>` mounted with 2 initial items (local unit test)
**Steps**:
1. Query `[data-testid="test-item-0"]`, `[data-testid="test-item-1"]`
**Expected**: Both containers are in the DOM

---

### TC-063 `mock_test` editor enforces `gems_reward=0` and `xp_reward=0`
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com`; on editor page for a `mock_test` draft
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin/editor/<mock-test-draft-uuid>`
2. Inspect the gem reward and XP reward fields
**Expected**: Both fields are either absent, read-only, or locked at `0`; typing a non-zero value is not possible

---

## Suite 7 — Query Helpers & Locale Resolvers
> Suite 7 tests are unit-level (Jest) and run locally with `npm test`.

### TC-064 `fetchMaterialsList` returns only published materials
**Pre-conditions**: Supabase client mocked to return 1 published + 1 draft row
**Steps**:
1. Call `fetchMaterialsList(supabase, {})`
**Expected**: Result `items` contains only the published material; draft is excluded

---

### TC-065 `fetchMaterialsList` returns `nextCursor` when a full page exists
**Pre-conditions**: Mock returns 24 rows (default limit)
**Steps**:
1. Call `fetchMaterialsList(supabase, {})`
**Expected**: `items.length === 24`; `nextCursor` is a non-null ISO timestamp string

---

### TC-066 `fetchMaterialsList` returns `nextCursor=null` on the last page
**Pre-conditions**: Mock returns 10 rows with limit=24
**Steps**:
1. Call `fetchMaterialsList(supabase, {})`
**Expected**: `items.length === 10`; `nextCursor === null`

---

### TC-067 `resolveTitle` returns Vietnamese when locale is `vi`
**Pre-conditions**: Material with `title_vi="Xin chào"`, `title_en="Hello"`
**Steps**:
1. Call `resolveTitle(material, 'vi')`
**Expected**: Returns `"Xin chào"`

---

### TC-068 `resolveTitle` returns English when locale is `en` and `title_en` is set
**Pre-conditions**: Material with `title_vi="Xin chào"`, `title_en="Hello"`
**Steps**:
1. Call `resolveTitle(material, 'en')`
**Expected**: Returns `"Hello"`

---

### TC-069 `resolveTitle` falls back to Vietnamese when `title_en` is null
**Pre-conditions**: Material with `title_vi="Xin chào"`, `title_en=null`
**Steps**:
1. Call `resolveTitle(material, 'en')`
**Expected**: Returns `"Xin chào"`

---

### TC-070 `resolveBody` sets `fallbackUsed=true` when English body is missing
**Pre-conditions**: Material with `body_vi="Nội dung"`, `body_en=null`
**Steps**:
1. Call `resolveBody(material, 'en')`
**Expected**: Returns `{body: "Nội dung", fallbackUsed: true}`

---

### TC-071 `fetchMockTestQuestions` throws when `correct_index` leaks from the view
**Pre-conditions**: Supabase client mocked to return `[{id: "x", idx: 0, correct_index: 0}]`
**Steps**:
1. Call `fetchMockTestQuestions(supabase, materialId)`
**Expected**: Function throws with message containing `"mock_test_items_public is leaking correct_index"`

---

### TC-072 `updateMaterialDraft` throws a 409-coded error on concurrent edit
**Pre-conditions**: Supabase `update().eq().eq().select().maybeSingle()` mocked to return `{data: null, error: null}`
**Steps**:
1. Call `updateMaterialDraft(supabase, "mat-1", "stale-timestamp", {title_vi: "New title"})`
**Expected**: Function throws; the thrown error has `(error as any).code === '409'`

---

## Suite 8 — End-to-End Journeys

### TC-073 Full catalog browse and filter journey
**Pre-conditions**: Seed migration 084 applied; no auth required
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials`
2. Verify ≥ 24 `[data-testid="material-card-type"]` elements are visible
3. Click the "A1" level chip; verify all visible cards show A1 level
4. Click the "Từ vựng" type chip (A1 still active); verify remaining cards are `vocabulary_pack` + A1
5. Click "A1" and "Từ vựng" again to deselect; verify full catalog returns
**Expected**: Each filter transition produces the correct subset; URL params update with each click (`?level=a1`, `?level=a1&type=vocabulary_pack`); no page reload is needed

---

### TC-074 Full vocabulary pack learning journey
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; seeded vocabulary pack with 10 items (`min_completion_pct=80`); student has NOT previously completed this material
**Steps**:
1. Get slug: `SELECT slug FROM materials WHERE type='vocabulary_pack' AND status='published' LIMIT 1`
2. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<vocab-slug>`
3. Click "Tôi biết từ này" on 8 of the 10 vocabulary cards
4. Verify `[data-testid="progress-ribbon"]` appears with a gem and XP amount
5. Navigate to another page, then return to the same vocabulary pack URL
6. Verify `[data-testid="progress-ribbon-already"]` is shown instead
**Expected**: Completion triggers exactly once; reward ribbon appears on first completion; "already earned" variant on return visit; SQL confirms a single `gem_transactions` row

---

### TC-075 Full mock test journey (answer, submit, grade)
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; seeded mock test with 5 multiple-choice questions; student has NOT previously completed this test
**Steps**:
1. Get slug: `SELECT slug FROM materials WHERE type='mock_test' AND status='published' LIMIT 1`
2. Open DevTools → Network; enable response logging
3. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
4. Confirm no network response body contains the string `"correct_index"`
5. Select one answer for each of the 5 questions
6. Click submit
7. Wait for `[data-testid="mock-test-result-banner"]`
8. Verify `[data-testid="mock-test-result-item-0"]` through `[data-testid="mock-test-result-item-4"]` are all in the DOM
9. Verify no gem/XP reward is shown anywhere on the result screen
**Expected**: Grading completes; score is displayed; per-item explanations visible; no reward shown

---

### TC-076 Admin material creation end-to-end
**Pre-conditions**: Signed in as `jimmycuong1412@gmail.com` (admin)
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/admin`
2. Click `[data-testid="create-material-btn"]`
3. Click `[data-testid="create-type-grammar_lesson"]`
4. Wait for navigation to `/vi/materials/admin/editor/<new-uuid>`
5. Verify `[data-testid="material-editor"]` is present
6. Type "Bài tập ngữ pháp thử nghiệm" in the Vietnamese title field
7. Type "Tóm tắt thử nghiệm" in the Vietnamese summary field
8. Type "Nội dung bài học" in the Vietnamese body field
9. Click `[data-testid="editor-save-draft"]`
10. Wait for save to complete (no error toast; URL stays at same `/editor/<uuid>`)
11. Navigate back to `https://easyeng-dev.vercel.app/vi/materials/admin`
12. Locate `[data-testid^="admin-material-row-"]` for the new draft
**Expected**: New draft appears in the admin list; its status shows "Bản nháp"; title matches what was entered

---

### TC-077 `correct_index` never appears in any network response during a mock test session
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; DevTools Network tab open and logging all responses; navigated to the mock test page
**Steps**:
1. Open DevTools → Network; right-click → "Save all as HAR with content"
2. Complete the entire mock test journey: page load → answer all questions → submit → view results
3. Open the HAR file (or use Playwright's network interception) and search for `"correct_index"` across all response bodies
**Expected**: The string `"correct_index"` does NOT appear in any network response body at any point in the session

---

## Suite 9 — Accessibility

### TC-078 Catalog page passes axe-core check
**Pre-conditions**: Catalog page loaded at `https://easyeng-dev.vercel.app/vi/materials`
**Steps**:
1. Open the page
2. In the DevTools console, run:
   ```js
   const axe = await import('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js');
   const results = await axe.run(); console.log(results.violations);
   ```
   (or run via Playwright + `@axe-core/playwright`)
**Expected**: Zero violations with impact `"critical"` or `"serious"`

---

### TC-079 MaterialCard has non-empty `alt` text when a cover image is present
**Pre-conditions**: A published material with a `cover_path` is shown in the catalog
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials`
2. Find a card with a cover image
3. Inspect the `<img>` element inside the card
**Expected**: `alt` attribute is non-empty (e.g. the material title); not `alt=""` or missing

---

### TC-080 Mock test answer options are keyboard-navigable
**Pre-conditions**: Signed in as `jimmycuong1413@gmail.com`; mock test page loaded
**Steps**:
1. Navigate to `https://easyeng-dev.vercel.app/vi/materials/<mock-test-slug>/test`
2. Press `Tab` repeatedly until the first answer option for question 0 is focused (visible focus ring)
3. Press `Space` or `Enter`
**Expected**: The answer option becomes selected without requiring a mouse click; focus ring is visible throughout

---

## Suite 10 — Storage

### TC-081 `material-assets` storage bucket exists and is public
**Pre-conditions**: Migration 082 applied to `evrcwtsexlamacawofxo`
**Steps**:
1. Run SQL in the Supabase dashboard: `SELECT id, public FROM storage.buckets WHERE id='material-assets'`
**Expected**: Row exists; `public = true`

---

### TC-082 Authenticated teacher can upload to `material-assets`
**Pre-conditions**: Signed in as `jimmycuong1414@gmail.com` (teacher); `material-assets` bucket storage policies allow INSERT for authenticated users (configured via Supabase Storage dashboard)
**Steps**:
1. Using the Supabase JS client with the teacher's session, call:
   ```ts
   supabase.storage.from('material-assets').upload('<teacher-uuid>/test.jpg', file, {contentType: 'image/jpeg'})
   ```
**Expected**: Upload succeeds; response has no error; the public URL `https://evrcwtsexlamacawofxo.supabase.co/storage/v1/object/public/material-assets/<teacher-uuid>/test.jpg` is accessible

---

### TC-083 Anonymous upload to `material-assets` is rejected
**Pre-conditions**: No auth token (using the anon key only)
**Steps**:
1. Using the Supabase JS client without signing in, call:
   ```ts
   supabase.storage.from('material-assets').upload('public/anon-test.jpg', file)
   ```
**Expected**: Upload fails; response contains an error with status 403 (Row Level Security / policy violation)

---

*End of test suite — 83 test cases across 10 suites covering Phases 1–6 of Materials Library.*
*Environment: `https://easyeng-dev.vercel.app` | Admin: `jimmycuong1412@gmail.com` | Teacher: `jimmycuong1414@gmail.com` | Student: `jimmycuong1413@gmail.com`*
