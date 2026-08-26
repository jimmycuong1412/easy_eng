# Free Shadowing — Design

**Date:** 2026-08-21
**Branch:** `001-english-learning-platform`
**Status:** Approved design, pending implementation plan

## Purpose

Ship shadowing practice as EasyEng's flagship **free** feature: the thing paid ads
point at, and the thing that turns anonymous ad traffic into registered users.

Shadowing — listening to a native speaker and immediately reproducing the phrase,
matching rhythm and stress — is well suited to this role. It is instantly
demonstrable (one 10-second rep shows the value), it needs no teacher, and it
produces a score that people screenshot and share.

Two goals, in priority order:

1. **Acquisition.** An anonymous visitor from an ad reaches a working practice
   screen with no signup, completes reps, and hits a conversion moment.
2. **Retention.** A registered user gets streaks, score history, and a
   completable library that brings them back daily.

## Scope

**In scope:** anonymous practice page, local scoring engine (word + rhythm),
themed packs of 10 clips (2–3 in Phase A, growing to 8), signup wall with score
carry-over, logged-in progression, SEO-indexable pack pages.

**Out of scope:** adaptive clip selection (collect the data, don't build the
selector); server-side phoneme scoring; user-recorded or user-submitted clips;
video-sourced clips.

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Rollout | Phased: anonymous public page first, logged-in progression second |
| 2 | Audio source | One-off TTS generation for all clips; human re-recording for hero/ad clips |
| 3 | Scoring | Local word-accuracy + rhythm; zero server cost |
| 4 | Conversion | Soft wall after 3 anonymous clips/day, tunable; scores carried into account on signup |
| 5 | Content structure | 8 themed packs × 10 clips, on `material_collections`; **Phase A ships 2–3 packs** |
| 5b | Rewards | **XP only, no gems.** New `award_shadowing_pack` RPC, once per pack |
| 6 | Rep screen layout | Single-focus while practising |
| 7 | Result view | Expands to stacked waveform comparison after each attempt |

## What already exists

Reused rather than rebuilt:

- **`PronunciationPractice.tsx`** — working local engine: TTS playback, Web Speech
  recognition, live waveform, per-word LCS + Levenshtein scoring, attempt history.
  This is the starting point for the scoring engine, not a reference.
- **`material-assets` storage bucket** — already public-read for anonymous users,
  already accepts `audio/mpeg` and `text/vtt`. No storage work needed.
- **`materials` RLS** — `materials_select_published` is `status = 'published'
  OR author_id = auth.uid() OR get_my_role() = 'admin'`. The first clause has no
  `auth.uid()` requirement, so **anonymous users can already read published
  materials and assets**. No new RLS, no service-role key, no content API route.
- **`material_collections` / `material_collection_items`** — pack container.
- **`xp_transactions`** — the XP ledger (see the live-schema note below).
- **`/[locale]/ai-tools`** — existing free-tools page; gains a cross-link.

## Schema constraints that shaped this design

Four constraints in the existing schema were verified against the migrations and
the live database, and directly determined the data model. They are recorded here because each one
rules out an approach that would otherwise look obvious.

1. **`materials.duration_min CHECK (duration_min BETWEEN 1 AND 90)`**
   (`080_materials_library.sql`). A 10-second clip cannot be its own `materials`
   row without misstating its duration. **Therefore: the pack is the `materials`
   row; individual clips are child rows in `shadowing_clips`.**

2. **`materials_published_bilingual_chk`** — a `published` material must have
   `title_en`, `summary_en`, and `body_en` non-null. Under the one-material-per-clip
   model this would mean bilingual metadata for every clip. Under the
   pack-as-material model it applies once per pack. **This is a second,
   independent reason for the same modelling choice.**

3. **`award_material_completion` is `GRANT EXECUTE … TO authenticated`** and
   raises `42501` unless `auth.uid() = p_user_id`. It is correctly unusable
   anonymously, confirming the anonymous path must be entirely client-side.

4. **`award_material_completion` cannot be used, because shadowing grants no gems.**
   Its gem formula is `gems_reward + (p_score / 20)`, and — critically — **its
   idempotency guard *is* the gem transaction**: it returns early iff a
   `gem_transactions` row exists with `transaction_type = 'material_completion'`
   and a matching `material_id` in `metadata`. A gems-free path through this RPC
   would therefore have *no* replay protection and would re-grant XP on every
   call. Gems and XP are not separable here. **Therefore: a new
   `award_shadowing_pack` RPC with its own guard.**

### Live-schema findings (verified against project `evrcwtsexlamacawofxo`)

The XP ledger is not what the repo migrations imply, and this directly shapes the
new RPC:

- **The table is `xp_transactions`, not `xp_events`.** No `xp_events` table exists
  in the database. `102_student_free_features.sql` references `xp_events` in
  `get_my_progress_report`, so **that RPC is broken at runtime today** — out of
  scope here, but worth a separate fix.
- **The user column is `student_id`, not `user_id`**, and it FKs `auth.users`.
- **There is no `metadata` jsonb column.** The metadata-based idempotency pattern
  used by `award_material_completion` is unavailable; the discriminator is a plain
  `activity_type text` (currently only `'material_completion'` in use).
- **There is no unique constraint** on `xp_transactions` beyond the primary key.
  Replay protection must come from elsewhere.
- **`CHECK (amount > 0)`** — a zero-XP award raises rather than no-ops, so the RPC
  must skip the insert rather than write a zero row.

## Architecture

### Data model

Two new migrations. The enum change is isolated because `ALTER TYPE … ADD VALUE`
cannot run in a transaction that later uses the new label — a constraint the
codebase already documents at `080_materials_library.sql:38`.

**`103_shadowing_enum.sql`** — alone in its own migration:

```sql
ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'shadowing';
```

`shadowing` is a first-class material type rather than a tag on `listening_audio`.
This feature is a headline product, not a filtered view of listening clips, and
the type drives both routing and reward rules.

**`104_shadowing.sql`** — everything else:

- **`shadowing_clips`** — one row per clip.
  `id`, `material_id` (FK → the pack), `idx`, `text_en`, `text_vi`,
  `audio_path`, `duration_ms`, `reference_envelope jsonb`, `created_at`.
  `UNIQUE (material_id, idx)`.
  `reference_envelope` is the precomputed energy/pause profile the rhythm score
  compares against — generated once at content-build time, never at runtime.
  Public read where the parent material is published, mirroring
  `materials_select_published`.

- **`shadowing_attempts`** — append-only attempt log.
  `id`, `user_id`, `clip_id`, `word_score int`, `rhythm_score int`,
  `overall_score int`, `heard_text text`, `weak_words text[]`, `created_at`.
  Append-only because improvement-over-time is the retention hook, and because
  `material_progress` is `UNIQUE (user_id, material_id)` and so cannot hold a
  history. RLS: users read and insert their own rows only.
  `weak_words` is collected from day one to make adaptive selection possible
  later without a backfill — it is stored, not yet used.

- **RPC `record_shadowing_attempt(p_clip_id, p_word_score, p_rhythm_score, p_heard_text, p_weak_words)`**
  — inserts the attempt, touches `material_progress.last_activity_at` for the
  parent pack, and when every clip in the pack has at least one attempt at or
  above threshold, calls `award_shadowing_pack(pack_id)`.
  `SECURITY DEFINER`, `authenticated` only. Receives **integers and a transcript
  string — never audio**.

- **RPC `award_shadowing_pack(p_material_id)`** — XP-only grant, once per pack.
  Gems are deliberately not awarded: shadowing is unlimited and repeatable, and
  any per-completion gem grant across a growing clip library is a currency leak.

  **Idempotency** uses `material_progress`, not the ledger, since
  `xp_transactions` has no unique constraint and no metadata column.
  `material_progress` is `UNIQUE (user_id, material_id)`, so the transition of
  `completed_at` from NULL to non-NULL is a reliable once-ever signal:

  1. `pg_advisory_xact_lock` on `(user_id, material_id)` to serialise concurrent
     completions, mirroring `award_material_completion`.
  2. Upsert `material_progress`; capture whether `completed_at` was NULL *before*
     the write. Only that call proceeds to the ledger.
  3. Insert into `xp_transactions (student_id, amount, activity_type, description)`
     with `activity_type = 'shadowing_pack_completion'`, **skipping the insert
     entirely when the computed amount is 0** (the `amount > 0` CHECK would
     otherwise raise).

  XP amount comes from the pack's `materials.xp_reward`. `gems_awarded` on
  `material_progress` stays 0.

- **RPC `get_shadowing_pack(p_slug)`** — returns pack metadata + ordered clips +,
  when authenticated, the caller's best score per clip. Must work anonymously,
  so it is `SECURITY INVOKER` and leans on existing RLS.

### Scoring engine

Extracted from `PronunciationPractice.tsx` into a reusable, unit-testable module
with no React dependency, so the scoring logic can be tested without a DOM:

- **Word score** — existing LCS + Levenshtein word alignment, unchanged. Measures
  *whether you were understood*.
- **Rhythm score** — compares the attempt's energy envelope against the clip's
  stored `reference_envelope`: total duration ratio, pause positions, and stress
  peak alignment. Derived from the same Web Audio analyser data that already
  drives the waveform, so it adds no new capture path.
- **Overall** — weighted blend of the two, surfaced as the headline number.

Everything runs in the browser. Nothing is uploaded. This keeps the anonymous
page free regardless of traffic volume, makes it abuse-proof (a bad actor
consumes only their own CPU), and is a genuine privacy property worth stating
in the marketing copy: *your voice never leaves your device.*

**Naming honesty:** the word component is labelled "độ chính xác từ" (word
accuracy), not "pronunciation score". It measures intelligibility, not native-
likeness. The rhythm component is what the feature actually claims to train,
and the marketing claim is scoped to that.

### Routes

- `/[locale]/shadowing` — hub: pack grid, anonymous-accessible.
- `/[locale]/shadowing/[packSlug]` — practice screen and per-campaign ad landing
  target. One pack per ad creative.

Both must be added to `PUBLIC_ROUTES` in `middleware.ts:20`, which currently
allows only `/auth/*`. This is the only middleware change.

Pack pages are server-rendered for SEO — clip text is real indexable content, and
these pages are the organic-search complement to paid traffic.

### UI

**While practising (single-focus):** pack name and position (`Câu 3/10`), the
target sentence, its Vietnamese translation, a live waveform, and two buttons —
*Nghe mẫu* and *Nói theo*. Nothing else. The goal is shortest possible path from
landing to first mic press.

**After an attempt (compare view):** the sentence recolours per word, the score
appears, and the screen expands to show the stacked waveform comparison — native
speaker above, the user below, with misaligned pauses highlighted and a concrete
timing hint (*"Bạn nói nhanh hơn mẫu 0.4s — thử ngắt sau 'excited'"*).

The comparison view carries the feature's core claim. A bare percentage cannot
communicate "we score your rhythm, not just your words"; two misaligned waveforms
communicate it in one glance. It is also the frame users screenshot, which is
unpaid reach.

Styling uses existing `--et-*` tokens and `.et-*` / `.ed-*` classes. No new
design system work.

### Anonymous state and conversion

Anonymous progress lives in a single `localStorage` key: today's date, clips
attempted, and their scores.

The daily limit is a **named constant, not a literal**, because the SEO value and
the conversion value of this page are in mild tension and the number will want
A/B testing once real ad traffic lands.

The limit is deliberately not hardened. A visitor who clears `localStorage` gets
more reps; that is not worth engineering against, and treating it as an attack
would cost more than it saves.

**The wall sells progression rather than blocking access.** Copy is framed as
saving work, not losing access: *"Bạn đạt 82% — đăng ký miễn phí để lưu chuỗi
ngày và xem tiến bộ."* On signup, a one-shot migration replays the stored
attempts through `record_shadowing_attempt`, so the first logged-in view already
shows the user's history. The carry-over matters more than the specific limit:
a wall that preserves a score converts better than one that discards it.

### Error handling

The engine depends on browser APIs with real-world gaps, and the anonymous page
gets the widest possible device spread. Each failure degrades rather than blanks
the screen:

- **No `SpeechRecognition`** (Firefox, some Android WebViews) — today
  `PronunciationPractice` returns `null` and renders nothing, which would be a
  blank ad landing page. Instead: play reference audio, record, show the waveform
  comparison, and present the rhythm score alone, with the word score marked
  unavailable. Rhythm scoring needs only Web Audio, which is broadly supported.
- **Mic permission denied or dismissed** — explain what the mic is for and offer
  a retry; never a dead end.
- **Audio asset 404** — fall back to browser TTS for that clip and report it.
- **Recognition returns empty** — treat as a no-op attempt, not a 0% score.
  Recording nothing is not the same as failing, and a spurious 0% is
  discouraging at the exact moment that matters most.

### Testing

- **Unit** — the extracted scoring module against fixture envelopes: identical
  input scores ~100; a known-fast attempt scores low on rhythm and high on words;
  empty input yields no attempt rather than 0.
- **Integration** — `award_shadowing_pack` writes exactly one `xp_transactions`
  row across repeated completions of the same pack (the primary regression risk,
  since the ledger has no unique constraint to catch a mistake); it writes **zero**
  gem transactions; a pack with `xp_reward = 0` completes without raising on the
  `amount > 0` CHECK; anonymous `get_shadowing_pack` succeeds without a session;
  `shadowing_attempts` RLS denies cross-user reads.
- **E2E (Playwright)** — anonymous visitor reaches a pack page with no session,
  completes reps, and hits the wall; signup carries scores into the account.
  Mic and recognition are stubbed.
- **Manual** — one real pass on a low-end Android device, the modal device for
  Vietnamese ad traffic and the most likely place TTS quality and Web Speech
  support disappoint.

## Content pipeline

**This is the critical path, not an afterthought.** The engineering is roughly a
week; producing clips with transcripts, translations, and precomputed envelopes
is what gates the launch date. Cutting Phase A to 2–3 packs is precisely a lever
on this constraint.

**Phase A needs 20–30 clips, not 80.** The full eight-pack library is the Phase B
target; the steps below describe the repeatable process, sized to whichever batch
is in flight.

Per decision 2:

1. Write the clip texts (2–3 packs for Phase A; eight packs eventually — e.g.
   *Chào hỏi & giới thiệu*, *Phỏng vấn xin việc*, *Du lịch & sân bay*,
   *IELTS Speaking Part 1*), each with a Vietnamese translation.
2. Generate every audio file in the batch once with a high-quality TTS voice.
3. Compute `reference_envelope` for each clip at build time; upload audio to
   `material-assets`.
4. Re-record the hero clips — those on the landing page and in ad creative —
   with a human native speaker, so the first impression is authentically native.
   For Phase A that is roughly the first 5 clips of each shipped pack.
5. Author bilingual metadata for each pack (required by
   `materials_published_bilingual_chk`).

A repeatable script for steps 2–3 matters more than the first batch: clip
libraries grow, and hand-running the envelope computation will not scale.

## Risks

- **Content pipeline gates launch.** Mitigate by building the generation script
  first and seeding one complete pack end-to-end before scaling to eight.
- **Web Speech quality varies on low-end Android**, exactly where the ad traffic
  is. Mitigated by the rhythm-only degradation path, but it needs real-device
  validation before ad spend.
- **Anonymous page has no server-side abuse surface** by construction — this is
  a design property worth preserving. Any future server-side scoring must be
  gated behind authentication, or the cost model breaks.

## Phasing

**Phase A — anonymous acquisition (ship first).** Migrations, scoring module,
`get_shadowing_pack`, hub and pack routes, single-focus rep screen, compare
result view, `localStorage` state, soft wall, `PUBLIC_ROUTES` change, and
**2–3 seeded packs (20–30 clips)**. Deliverable: a page an ad can point at.

Phase A is deliberately scoped to 2–3 packs rather than all eight, because the
content pipeline — not the code — sets the launch date. Two packs is enough to
prove the loop, run ads, and measure conversion. The remaining packs are content
work that can land continuously afterwards without further engineering.

Pack selection for Phase A should favour the highest ad intent: *Phỏng vấn xin
việc* and *IELTS Speaking Part 1* are the two with the clearest paid-search and
paid-social targeting.

**Phase B — logged-in progression.** `record_shadowing_attempt` and
`award_shadowing_pack` wiring, score carry-over on signup, streaks and history,
remaining packs, dashboard and `/ai-tools` cross-links.

Phase A is the deliverable that serves the stated goal. Phase B is what stops
the traffic leaking away.
