# AI Materials Generator — Design

**Date:** 2026-06-25
**Status:** Approved (pending spec review)
**Author:** Jimmy Cuong (with Claude Code)
**Feature area:** Materials Library (`specs/001-english-learning-platform/features/materials-library/`)

## Problem

The Materials Library needs more catalog depth. Today the curated catalog is thin for
three of the four hand-authored types — only **5 vocabulary packs, 5 grammar lessons,
5 dialogues** exist (the original `084_materials_seed_vi.sql` seed). Reading passages
are well-stocked (**122 rows**, news-derived with hash-suffixed slugs), so this batch
de-emphasizes readings and fills the thin types.

We want to grow the catalog with high-quality, Vietnamese-first materials **without
hand-authoring SQL** and **without crawling/copying third-party copyrighted text**.
Instead we generate original content with the Claude Agent SDK.

## Goal

A Python script that uses `claude-agent-sdk` to generate ~30 **original, Vietnamese-first**
English-learning materials per run, emit them as a validated, idempotent SQL insert file,
which is then applied to the live Supabase DB (`evrcwtsexlamacawofxo`) via the Supabase
MCP `execute_sql` tool, in this Claude Code session.

### Non-goals

- No web crawling / scraping of external article text (avoids copyright + quality risk).
- No new DB tables, RPCs, migrations, or schema changes — uses the existing schema only.
- No audio/image asset generation (those columns stay NULL; `listening_audio` type is
  out of scope for this batch).
- No mock tests in this batch (already at 5; comprehension questions are embedded in
  reading sections instead).

## Decisions (locked with user)

| Decision | Choice |
|---|---|
| Output target | **Direct DB insert** — but via session MCP, see flow below |
| Material types | **reading_passage, vocabulary_pack, grammar_lesson, dialogue** |
| Batch size | **~30** materials, weighted to thin types |
| DB auth | **Supabase MCP `execute_sql`** (project `evrcwtsexlamacawofxo`) |
| Language | **Python + `claude-agent-sdk`** (matches `claude-memory-compiler`) |
| Flow | **(A)** Python generates validated SQL → Claude applies it via MCP |
| Topic focus | **Vietnam-context, broad mix** across A1–C1 + exam prep |

### Why flow (A)

The Supabase MCP `execute_sql` tool is a **session tool available to Claude Code**, not an
API callable from inside a standalone Python process. So the script cannot write to the DB
itself while honoring "use MCP". Therefore:

1. `generate.py` runs the Agent SDK, validates each material against the schema, and writes
   a single idempotent `out/materials_insert.sql` (with `ON CONFLICT (slug) DO NOTHING`).
2. Claude (this session) reads that SQL and applies it through Supabase MCP `execute_sql`,
   then reports row counts / skips back to the user.

This keeps prod writes reviewable (the SQL file is inspectable before it runs) while
matching both user answers.

## Batch composition (~30)

Weighted away from readings (already deep) toward the thin types:

| Type | Count | Levels (spread) |
|---|---|---|
| vocabulary_pack | 9 | a1, a1, a2, a2, b1, b1, b2, b2, c1 |
| grammar_lesson  | 8 | a1, a2, a2, b1, b1, b2, b2, c1 |
| dialogue        | 8 | a1, a1, a2, b1, b1, b2, b2, c1 |
| reading_passage | 5 | a2, b1, b1, b2, c1 |
| **Total**       | **30** | |

Topics drawn from a curated list in `catalog.py` (Vietnam daily life, travel, food, work,
study-abroad, plus IELTS/TOEIC/VSTEP/THPT exam prep) — chosen to **not** collide with the
existing slugs:
`vocab-{food,greetings,ielts-academic,interview,school}-*`,
`grammar-{conditionals,passive-voice,past-simple,present-simple,reported-speech}-*`,
`dialogue-{bargaining,business-meeting,doctor-visit,job-interview,meeting-friend}-*`.

## Architecture

New standalone directory `tools/materials-generator/` (sibling to `scripts/`, isolated
venv via `uv`, not part of the Next.js build):

```
tools/materials-generator/
  pyproject.toml         # claude-agent-sdk, python-dotenv
  catalog.py             # the run plan: list of MaterialSpec(type, level, goal, topic, slug)
  schema_prompts.py      # one prompt template per type, pinned to real DB columns/constraints
  models.py              # dataclasses + validators mirroring the DB schema
  sql.py                 # JSON -> safe, escaped SQL INSERT statements (idempotent)
  generate.py            # orchestrator: SDK query per spec -> validate -> collect -> write out/materials_insert.sql
  out/                   # generated SQL (gitignored)
  README.md              # how to run + how Claude applies the SQL
```

### Component responsibilities

- **`catalog.py`** — pure data. Returns the deterministic list of ~30 `MaterialSpec`s.
  Each has a precomputed `slug` (regex `^[a-z0-9-]+$`, ≤96 chars) guaranteed not to collide
  with known existing slugs. Deterministic = resumable: re-running skips what's already in DB.

- **`schema_prompts.py`** — one function per type returning the LLM prompt. Each prompt:
  - States the exact JSON shape to return (no prose, no markdown fences).
  - Encodes constraints: bilingual `vi`+`en` required (published rows need
    `title_en`/`summary_en`/`body_en`), `summary_vi` ≤500 chars, `title_vi` ≤200,
    `duration_min` 1–90, vocab needs `ipa`+`vi_phonetic_hint`+`gloss_vi`+`example_en`+`example_vi`,
    section `kind` ∈ allowed set per type.
  - Demands Vietnam-context, level-appropriate language, originality.

- **`models.py`** — `Material`, `VocabItem`, `Section` dataclasses with `validate()` that
  enforces the same constraints client-side **before** SQL is emitted. A material failing
  validation is logged and skipped (never partially inserted).

- **`sql.py`** — turns validated objects into SQL. All string values escaped (single-quote
  doubling); arrays formatted for Postgres. Wraps the whole file in a `DO $$ ... $$` block
  that resolves `author_id` from `profiles WHERE role='admin' LIMIT 1` (matching 084), so the
  SQL is portable and not hard-coded to one UUID. Children inserted via
  `... WHERE m.slug = '<slug>'` joins (exact 084 pattern). Everything `ON CONFLICT DO NOTHING`.

- **`generate.py`** — for each `MaterialSpec`: call `claude_agent_sdk.query()` with
  `allowed_tools=[]`, `max_turns=1`, extract the JSON from the text response, parse into a
  model, validate, accumulate. After all specs, render one `out/materials_insert.sql`.
  Prints per-material status + a final summary (generated / skipped / failed). Tracks API cost.

### Per-type DB mapping

| Type | `materials` row | Child rows |
|---|---|---|
| vocabulary_pack | full bilingual + `body_vi/en` intro | 8–12 `vocabulary_items` (idx 0..n) |
| grammar_lesson  | full bilingual; `body` = explanation | `material_sections` kind `intro`/`pattern`/`drill` |
| dialogue        | full bilingual; `body` = scenario setup | `material_sections` kind `dialogue_line` (one per turn, speaker in `meta`) |
| reading_passage | full bilingual; `body` = the passage | `material_sections` kind `passage` + comprehension Qs in `meta` |

Rewards mirror 084: `gems_reward` 2–3, `xp_reward` 40–80, `min_completion_pct` 60 (reading)
or 80 (others). `status='published'`, `published_at=now()`, `published_by=author_id`.

## Data flow

```
catalog.py (30 specs)
  -> generate.py: for each spec -> SDK query -> JSON -> models.validate()
     -> sql.py renders -> out/materials_insert.sql
        -> [Claude, this session] reads file -> Supabase MCP execute_sql
           -> report inserted vs skipped (ON CONFLICT) counts
```

## Error handling

- **LLM returns non-JSON / malformed:** retry once with a stricter "JSON only" reminder;
  on second failure, log + skip that material (batch continues).
- **Validation failure (constraint violation client-side):** skip the material, log the
  reason; never emit partial SQL for it.
- **Slug collision with DB:** harmless — `ON CONFLICT (slug) DO NOTHING` skips it server-side.
- **Bilingual completeness:** `models.validate()` rejects any published material missing
  `*_en`, preventing the `materials_published_bilingual_chk` violation at insert time.
- **Partial material (parent ok, child fails type trigger):** the per-material `DO $$` block
  means a child failure raises and rolls back just that material's inserts.

## Testing

- **`models.validate()` unit tests** — feed known-good and known-bad payloads (over-length
  summary, missing `*_en`, bad slug, vocab missing IPA) and assert accept/reject.
- **`sql.py` escaping test** — strings with `'`, `--`, unicode (Vietnamese diacritics),
  arrays — assert output is syntactically valid and injection-safe.
- **Dry run** — `generate.py --dry-run --limit 2` generates 2 materials, prints the JSON and
  the SQL, does NOT write `out/` — used to sanity-check prompts cheaply before a full run.
- **Live verification (post-apply)** — after Claude applies via MCP, query counts by type and
  spot-check one generated material's bilingual fields + child rows render in the app.

## Cost & scale

~30 SDK calls, one material each (a few hundred to ~1–2k output tokens per call). One run is
inexpensive (single-digit dollars at most). `--limit N` caps a run for testing.

## Open questions

None — all decisions locked above.
