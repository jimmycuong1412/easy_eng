# Quickstart — Materials Library

Five-minute walkthrough for any contributor who needs to start working on this feature.

## Prerequisites

- Repo cloned, `frontend/` deps installed (`npm install` in `frontend`).
- Supabase CLI installed (`npm install -g supabase`) and project linked (`supabase link --project-ref evrcwtsexlamacawofxo`).
- Local `.env.local` populated with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 1. Pull the materials migrations into local Supabase

```bash
# From repo root
supabase db reset                        # nukes local DB and replays migrations
# OR, if you only want the new ones on top of existing:
supabase db push --linked                # apply new migrations to local
```

The new files are `supabase/migrations/080-084_materials_*.sql`. After this you should have:

- 10 new tables (`materials`, `material_sections`, `vocabulary_items`, `mock_test_items`, `material_assets`, `material_tags`, `material_tag_links`, `material_collections`, `material_collection_items`, `material_progress`, `material_reviews`, `material_translations`).
- 1 view (`mock_test_items_public`).
- 4 RPCs (`award_material_completion`, `grade_mock_test`, `recommend_next_material`, `compute_popularity_scores`).
- Storage bucket `material-assets` with public-read / authenticated-write policies.
- 30 seed materials in Vietnamese (5 per type) + 1 curated collection.

## 2. Run the test suite

Tests are TDD-style: they should already exist for any feature work in flight.

```bash
cd frontend
npm run test -- materials                # Jest unit + integration
npm run e2e -- materials.spec.ts         # Playwright E2E

# pgTAP RLS tests (from repo root)
supabase test db --file supabase/tests/materials_rls.sql
```

Expected: all green if the implementation matches the contracts.

## 3. Browse the catalog locally

```bash
cd frontend
npm run dev
```

- Visit `http://localhost:3000/vi/materials` — Vietnamese catalog.
- Visit `http://localhost:3000/en/materials` — English mirror.
- Each card opens at `/{locale}/materials/{slug}`.
- Mock-test materials open the test player at `/{locale}/materials/{slug}/test`.

You should see the seeded 30 materials filterable by `level`, `type`, `goal`. The Vietnamese catalog is server-rendered and indexed by Google.

## 4. Author a material as an admin

1. Sign in as the admin test account (`jimmycuong1412@gmail.com / 123456`).
2. Visit `/vi/materials/admin` — the Admin catalog manager.
3. Click **"Tạo mới"** → choose a type from the modal → editor opens at `/vi/materials/admin/editor/{id}`.
4. Fill `title_vi`, `summary_vi`, `body_vi` (Markdown editor with live preview).
5. For `vocabulary_pack`: add ≥ 8 vocabulary items via the inline editor. For `mock_test`: add ≥ 5 items, mark the correct option for each, write a Vietnamese explanation.
6. Click **"Submit for review"** — calls `materials-publish` with `action="submit_for_review"`. Status flips to `in_review`.
7. As admin, click **"Approve"** in the same view → status flips to `published`. The material appears in the public catalog within ~30 s (next revalidation tick).

## 5. Test the student flow

1. Sign out → sign in as a student test account.
2. Open a published material at `/vi/materials/{slug}`.
3. Read it / play the audio / take the mock test.
4. On completion the page calls the appropriate RPC:
   - For non-test materials: `await supabase.rpc('award_material_completion', {p_user_id, p_material_id})`.
   - For mock tests: `await supabase.rpc('grade_mock_test', {p_user_id, p_material_id, p_answers})` — returns score and per-item explanations. **No gems or XP are awarded for mock tests.**
5. For non-test materials: award strip animates in showing e.g. `"+3 ⟡  +40 XP"`. Gem balance widget on dashboard updates in real time (existing Realtime subscription). Mock test result screen shows score summary and explanation only.

## 6. Verify ledger integrity

After completing a material:

```bash
psql "$DATABASE_URL" -c "select * from gems_transactions where user_id = '<uid>' order by created_at desc limit 5;"
```

You should see exactly one new row with `reason = 'material_completion'` and `material_id` populated. Re-running the RPC for the same `(user, material)` MUST not insert another row.

## 7. Where to look for anything

| You want to... | Look in... |
|---------------|-----------|
| Change the catalog list query | `frontend/src/lib/queries/materials.ts` |
| Add a new material type | enum `material_type` in `080_materials_library.sql`, plus a new `<MaterialBody*>` renderer + i18n strings |
| Tune gem/XP rewards | `compute_gems` / `compute_xp` helpers in `083_materials_rpc.sql` |
| Update the seed catalog | `084_materials_seed_vi.sql` |
| Add Vietnamese-context content guidelines | `research.md` § R2 — checklist surfaces inside `material_reviews.checklist_passed` |
| Author UI in production | `/{locale}/materials/admin` (admin) or `/{locale}/materials/admin/editor/{id}` |
| Storage uploads | Supabase dashboard → Storage → `material-assets` |
| Audit a publish | `audit_log` table where `event = 'materials.publish'` |
| Reconcile gems for material completions | `select reason, sum(amount) from gems_transactions where reason = 'material_completion' group by reason;` |

## Common gotchas

1. **Empty catalog after `supabase db reset`** — the seed migration is `084_materials_seed_vi.sql`. If `supabase db push` skipped it (already-applied marker), run `supabase db execute --file supabase/migrations/084_materials_seed_vi.sql --force`.
2. **Cover images 404** — Storage bucket policies allow public read but the bucket itself must be created as public. Re-run `082_materials_storage.sql`.
3. **Mock-test grading fails with "row not found"** — the user clicked "submit" before the page hydrated. The frontend MUST insert into `material_progress` with `state='in_progress'` on first interaction.
4. **Gems awarded twice in dev** — almost always React StrictMode firing the effect twice. The advisory lock + idempotent ON CONFLICT means production is safe, but in dev you may see duplicate network calls; one will return `{already_completed: true}`.
5. **English fields blank but admin tries to publish** — the `materials_publish` Edge Function rejects with `validation_failed`. Add the English translations in the editor first.

That's it. Branch is `001-english-learning-platform`. Tasks for this feature live in `tasks.md` (run `/speckit.tasks` to generate).
