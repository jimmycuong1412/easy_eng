# AI Materials Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python script that uses `claude-agent-sdk` to generate ~30 original, Vietnamese-first English-learning materials and emit them as one idempotent SQL file, which Claude then applies to the live Supabase DB via the MCP `execute_sql` tool.

**Architecture:** A standalone `tools/materials-generator/` package (isolated `uv` venv, outside the Next.js build). A deterministic `catalog.py` defines ~30 `MaterialSpec`s. `generate.py` calls the Agent SDK once per spec to get strict JSON, parses it into validated dataclasses (`models.py`), and `sql.py` renders one idempotent `out/materials_insert.sql`. Claude applies that SQL through Supabase MCP and reports inserted-vs-skipped counts.

**Tech Stack:** Python 3.12, `claude-agent-sdk>=0.1.29`, `python-dotenv`, `pytest`. Target DB: Supabase project `evrcwtsexlamacawofxo` (existing schema, no migrations).

## Global Constraints

- Python ≥ 3.12; dependencies limited to `claude-agent-sdk`, `python-dotenv` (runtime) and `pytest` (dev). Verbatim from spec.
- No schema changes: no new tables, RPCs, or migrations. Existing schema only.
- All materials are **Vietnamese-first**: `*_vi` is source of truth, `*_en` is the mirror. Published rows MUST have non-null `title_en`, `summary_en`, `body_en` (DB constraint `materials_published_bilingual_chk`).
- Slug regex: `^[a-z0-9-]+$`, length ≤ 96. Must not collide with existing slugs (listed in Task 2).
- DB column caps: `title_vi` ≤ 200, `summary_vi` ≤ 500, `duration_min` ∈ [1,90], `gems_reward` ≥ 0, `xp_reward` ≥ 0, `min_completion_pct` ∈ [0,100].
- `material_sections.kind` ∈ `{intro, pattern, drill, passage, audio, dialogue_line, test_block}`.
- `vocabulary_items` require non-null `term`, `gloss_vi`, `example_en`, `example_vi`; SHOULD include `ipa`, `vi_phonetic_hint`, `gloss_en`, `pos`.
- Author attribution resolved in SQL via `SELECT id FROM profiles WHERE role='admin' LIMIT 1` (do NOT hard-code the UUID).
- Generated SQL MUST be idempotent: every INSERT uses `ON CONFLICT ... DO NOTHING`; each material wrapped so a child failure rolls back only that material.
- Batch composition (~30): 9 `vocabulary_pack`, 8 `grammar_lesson`, 8 `dialogue`, 5 `reading_passage`.
- `out/` directory is gitignored (generated artifacts + any local `.env`).
- Each Python source file ends every committed change with this trailer in the commit message:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: Package scaffold

**Files:**
- Create: `tools/materials-generator/pyproject.toml`
- Create: `tools/materials-generator/.gitignore`
- Create: `tools/materials-generator/README.md`
- Create: `tools/materials-generator/materials_generator/__init__.py`
- Create: `tools/materials-generator/tests/__init__.py`

**Interfaces:**
- Consumes: nothing.
- Produces: an installable package importable as `materials_generator` with `pytest` runnable from `tools/materials-generator/`.

- [ ] **Step 1: Create `pyproject.toml`**

```toml
[project]
name = "easyeng-materials-generator"
version = "0.1.0"
description = "Generate Vietnamese-first English learning materials via the Claude Agent SDK"
requires-python = ">=3.12"
dependencies = [
    "claude-agent-sdk>=0.1.29",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
out/
.env
.venv/
__pycache__/
*.pyc
```

- [ ] **Step 3: Create empty package + test markers**

`materials_generator/__init__.py`:
```python
"""EasyEng AI materials generator."""
```

`tests/__init__.py`:
```python
```

- [ ] **Step 4: Create `README.md`**

````markdown
# EasyEng Materials Generator

Generates ~30 Vietnamese-first English learning materials using the Claude Agent SDK
and emits an idempotent `out/materials_insert.sql`. Claude (in a Claude Code session)
then applies that SQL to the live Supabase DB via the `execute_sql` MCP tool.

## Setup

```bash
cd tools/materials-generator
uv sync --extra dev      # or: pip install -e ".[dev]"
```

## Run

```bash
uv run python -m materials_generator.generate --dry-run --limit 2   # cheap sanity check
uv run python -m materials_generator.generate                       # full run -> out/materials_insert.sql
uv run pytest                                                        # unit tests
```

## Applying the SQL

The script does not write to the database. Open the generated `out/materials_insert.sql`,
have Claude apply it through the Supabase MCP `execute_sql` tool (project `evrcwtsexlamacawofxo`),
and confirm inserted-vs-skipped counts.
````

- [ ] **Step 5: Verify the package imports and pytest runs**

Run: `cd tools/materials-generator && uv sync --extra dev && uv run pytest -q`
Expected: pytest reports "no tests ran" (exit 5) or collects 0 — no import errors.

- [ ] **Step 6: Commit**

```bash
git add tools/materials-generator/pyproject.toml tools/materials-generator/.gitignore tools/materials-generator/README.md tools/materials-generator/materials_generator/__init__.py tools/materials-generator/tests/__init__.py
git commit -m "chore(materials-gen): scaffold python package"
```

---

### Task 2: Data models + validation

**Files:**
- Create: `tools/materials-generator/materials_generator/models.py`
- Test: `tools/materials-generator/tests/test_models.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `VocabItem(idx:int, term:str, pos:str|None, ipa:str|None, vi_phonetic_hint:str|None, gloss_vi:str, gloss_en:str|None, example_en:str, example_vi:str)`
  - `Section(idx:int, kind:str, body_vi:str|None, body_en:str|None, meta:dict)`
  - `Material(slug:str, type:str, level:str, goal:str|None, title_vi:str, title_en:str, summary_vi:str, summary_en:str, body_vi:str, body_en:str, duration_min:int, gems_reward:int, xp_reward:int, min_completion_pct:int, vocab_items:list[VocabItem], sections:list[Section])`
  - `Material.validate() -> list[str]` returning a list of human-readable error strings (empty = valid)
  - Module constants: `VALID_TYPES`, `VALID_LEVELS`, `VALID_GOALS`, `VALID_SECTION_KINDS`, `SLUG_RE`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_models.py
from materials_generator.models import Material, VocabItem, Section


def _base_material(**overrides):
    data = dict(
        slug="vocab-airport-a1",
        type="vocabulary_pack",
        level="a1",
        goal="travel",
        title_vi="Từ vựng sân bay",
        title_en="Airport vocabulary",
        summary_vi="Học từ vựng sân bay cơ bản.",
        summary_en="Learn basic airport vocabulary.",
        body_vi="# Sân bay\nNội dung.",
        body_en="# Airport\nContent.",
        duration_min=10,
        gems_reward=2,
        xp_reward=40,
        min_completion_pct=80,
        vocab_items=[
            VocabItem(0, "passport", "noun", "/ˈpæspɔːrt/", "pát-pọt",
                      "hộ chiếu", "travel document", "Show your passport.", "Đưa hộ chiếu ra.")
        ],
        sections=[],
    )
    data.update(overrides)
    return Material(**data)


def test_valid_material_has_no_errors():
    assert _base_material().validate() == []


def test_published_requires_english_fields():
    m = _base_material(title_en="", summary_en="", body_en="")
    errors = m.validate()
    assert any("title_en" in e for e in errors)
    assert any("summary_en" in e for e in errors)
    assert any("body_en" in e for e in errors)


def test_bad_slug_rejected():
    assert any("slug" in e for e in _base_material(slug="Vocab Airport!").validate())


def test_summary_vi_length_cap():
    assert any("summary_vi" in e for e in _base_material(summary_vi="x" * 501).validate())


def test_title_vi_length_cap():
    assert any("title_vi" in e for e in _base_material(title_vi="x" * 201).validate())


def test_duration_out_of_range():
    assert any("duration_min" in e for e in _base_material(duration_min=0).validate())
    assert any("duration_min" in e for e in _base_material(duration_min=91).validate())


def test_invalid_type_level_goal_kind():
    assert any("type" in e for e in _base_material(type="podcast").validate())
    assert any("level" in e for e in _base_material(level="z9").validate())
    assert any("goal" in e for e in _base_material(goal="cooking").validate())
    m = _base_material(type="grammar_lesson", vocab_items=[],
                       sections=[Section(0, "bogus_kind", "vi", "en", {})])
    assert any("kind" in e for e in m.validate())


def test_vocab_pack_requires_items():
    assert any("vocab" in e.lower() for e in _base_material(vocab_items=[]).validate())


def test_vocab_item_missing_required_fields():
    bad = VocabItem(0, "", None, None, None, "", None, "", "")
    m = _base_material(vocab_items=[bad])
    errors = m.validate()
    assert any("term" in e for e in errors)
    assert any("gloss_vi" in e for e in errors)
    assert any("example_en" in e for e in errors)


def test_non_vocab_type_requires_sections():
    m = _base_material(type="grammar_lesson", vocab_items=[], sections=[])
    assert any("section" in e.lower() for e in m.validate())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/materials-generator && uv run pytest tests/test_models.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'materials_generator.models'`.

- [ ] **Step 3: Write `models.py`**

```python
# materials_generator/models.py
"""Dataclasses mirroring the materials DB schema, with client-side validation.

Validation enforces the same constraints the DB enforces, so we never emit SQL
that would violate a CHECK constraint or the published-bilingual rule.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

VALID_TYPES = {
    "vocabulary_pack", "grammar_lesson", "reading_passage",
    "listening_audio", "dialogue", "mock_test",
}
VALID_LEVELS = {"a1", "a2", "b1", "b2", "c1"}
VALID_GOALS = {
    "school", "vstep", "toeic", "ielts", "business",
    "study_abroad", "conversation", "travel",
}
VALID_SECTION_KINDS = {
    "intro", "pattern", "drill", "passage",
    "audio", "dialogue_line", "test_block",
}
SLUG_RE = re.compile(r"^[a-z0-9-]+$")


@dataclass
class VocabItem:
    idx: int
    term: str
    pos: str | None
    ipa: str | None
    vi_phonetic_hint: str | None
    gloss_vi: str
    gloss_en: str | None
    example_en: str
    example_vi: str

    def validate(self) -> list[str]:
        errs: list[str] = []
        if not self.term.strip():
            errs.append(f"vocab[{self.idx}].term is empty")
        if not self.gloss_vi.strip():
            errs.append(f"vocab[{self.idx}].gloss_vi is empty")
        if not self.example_en.strip():
            errs.append(f"vocab[{self.idx}].example_en is empty")
        if not self.example_vi.strip():
            errs.append(f"vocab[{self.idx}].example_vi is empty")
        return errs


@dataclass
class Section:
    idx: int
    kind: str
    body_vi: str | None
    body_en: str | None
    meta: dict = field(default_factory=dict)

    def validate(self) -> list[str]:
        errs: list[str] = []
        if self.kind not in VALID_SECTION_KINDS:
            errs.append(f"section[{self.idx}].kind '{self.kind}' invalid")
        if not (self.body_vi or self.body_en):
            errs.append(f"section[{self.idx}] has no body")
        return errs


@dataclass
class Material:
    slug: str
    type: str
    level: str
    goal: str | None
    title_vi: str
    title_en: str
    summary_vi: str
    summary_en: str
    body_vi: str
    body_en: str
    duration_min: int
    gems_reward: int
    xp_reward: int
    min_completion_pct: int
    vocab_items: list[VocabItem] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)

    def validate(self) -> list[str]:
        errs: list[str] = []

        if not SLUG_RE.match(self.slug) or len(self.slug) > 96:
            errs.append(f"slug '{self.slug}' invalid (regex ^[a-z0-9-]+$, <=96 chars)")
        if self.type not in VALID_TYPES:
            errs.append(f"type '{self.type}' invalid")
        if self.level not in VALID_LEVELS:
            errs.append(f"level '{self.level}' invalid")
        if self.goal is not None and self.goal not in VALID_GOALS:
            errs.append(f"goal '{self.goal}' invalid")

        # Published-bilingual rule
        if not self.title_en.strip():
            errs.append("title_en is required (published)")
        if not self.summary_en.strip():
            errs.append("summary_en is required (published)")
        if not self.body_en.strip():
            errs.append("body_en is required (published)")

        # Length caps
        if len(self.title_vi) > 200:
            errs.append("title_vi exceeds 200 chars")
        if len(self.summary_vi) > 500:
            errs.append("summary_vi exceeds 500 chars")

        # Numeric ranges
        if not (1 <= self.duration_min <= 90):
            errs.append("duration_min out of range [1,90]")
        if self.gems_reward < 0:
            errs.append("gems_reward must be >= 0")
        if self.xp_reward < 0:
            errs.append("xp_reward must be >= 0")
        if not (0 <= self.min_completion_pct <= 100):
            errs.append("min_completion_pct out of range [0,100]")

        # Children: vocab packs need items; everything else needs sections
        if self.type == "vocabulary_pack":
            if not self.vocab_items:
                errs.append("vocabulary_pack requires vocab_items")
            for vi in self.vocab_items:
                errs.extend(vi.validate())
        else:
            if not self.sections:
                errs.append(f"{self.type} requires sections")
            for s in self.sections:
                errs.extend(s.validate())

        return errs
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/materials-generator && uv run pytest tests/test_models.py -q`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add tools/materials-generator/materials_generator/models.py tools/materials-generator/tests/test_models.py
git commit -m "feat(materials-gen): data models with schema validation"
```

---

### Task 3: SQL rendering

**Files:**
- Create: `tools/materials-generator/materials_generator/sql.py`
- Test: `tools/materials-generator/tests/test_sql.py`

**Interfaces:**
- Consumes: `Material`, `VocabItem`, `Section` from Task 2.
- Produces:
  - `sql_str(value: str | None) -> str` — returns a single-quote-escaped SQL literal, or `NULL`.
  - `sql_text_array(items: list[str]) -> str` — Postgres `ARRAY[...]::text[]` literal.
  - `render_material(m: Material) -> str` — one `DO $$ ... $$;` block inserting the material + children, author resolved from admin profile, all `ON CONFLICT DO NOTHING`.
  - `render_file(materials: list[Material]) -> str` — full file: header comment + every material block.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_sql.py
from materials_generator.models import Material, VocabItem, Section
from materials_generator.sql import sql_str, sql_text_array, render_material, render_file


def test_sql_str_escapes_single_quotes():
    assert sql_str("it's") == "'it''s'"


def test_sql_str_none_is_null():
    assert sql_str(None) == "NULL"


def test_sql_str_preserves_vietnamese_diacritics():
    out = sql_str("Phở bò")
    assert "Phở bò" in out
    assert out.startswith("'") and out.endswith("'")


def test_sql_text_array():
    assert sql_text_array(["a", "b'c"]) == "ARRAY['a','b''c']::text[]"


def _vocab_material():
    return Material(
        slug="vocab-airport-a1", type="vocabulary_pack", level="a1", goal="travel",
        title_vi="Sân bay", title_en="Airport",
        summary_vi="Tóm tắt", summary_en="Summary",
        body_vi="Thân", body_en="Body",
        duration_min=10, gems_reward=2, xp_reward=40, min_completion_pct=80,
        vocab_items=[VocabItem(0, "gate", "noun", "/ɡeɪt/", "gết",
                               "cổng ra máy bay", "boarding gate",
                               "Go to gate 5.", "Đến cổng số 5.")],
        sections=[],
    )


def test_render_material_is_idempotent_and_typed():
    out = render_material(_vocab_material())
    assert "DO $$" in out and "END $$;" in out
    assert "ON CONFLICT" in out
    assert "role = 'admin'" in out
    assert "INSERT INTO materials" in out
    assert "INSERT INTO vocabulary_items" in out
    assert "vocab-airport-a1" in out


def test_render_material_sections_for_non_vocab():
    m = Material(
        slug="grammar-articles-a1", type="grammar_lesson", level="a1", goal="school",
        title_vi="Mạo từ", title_en="Articles",
        summary_vi="Tóm tắt", summary_en="Summary",
        body_vi="Thân", body_en="Body",
        duration_min=10, gems_reward=3, xp_reward=40, min_completion_pct=80,
        vocab_items=[],
        sections=[Section(0, "intro", "Giới thiệu", "Intro", {}),
                  Section(1, "pattern", "Mẫu", "Pattern", {"note": "a/an/the"})],
    )
    out = render_material(m)
    assert "INSERT INTO material_sections" in out
    assert "'intro'" in out and "'pattern'" in out
    # meta rendered as jsonb
    assert "jsonb" in out.lower()


def test_render_file_has_header_and_all_blocks():
    out = render_file([_vocab_material()])
    assert out.lstrip().startswith("--")
    assert out.count("DO $$") == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/materials-generator && uv run pytest tests/test_sql.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'materials_generator.sql'`.

- [ ] **Step 3: Write `sql.py`**

```python
# materials_generator/sql.py
"""Render validated Material objects into idempotent SQL.

Each material is wrapped in its own DO $$ ... $$ block that resolves the author
from the admin profile and inserts the material plus its children. All inserts use
ON CONFLICT DO NOTHING so re-runs are safe. A child failure raises inside the block
and rolls back only that material's inserts.
"""

from __future__ import annotations

import json

from .models import Material


def sql_str(value: str | None) -> str:
    """SQL string literal with single quotes doubled, or NULL."""
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_int(value: int | None) -> str:
    return "NULL" if value is None else str(int(value))


def sql_text_array(items: list[str]) -> str:
    inner = ",".join("'" + s.replace("'", "''") + "'" for s in items)
    return f"ARRAY[{inner}]::text[]"


def _sql_jsonb(meta: dict) -> str:
    return sql_str(json.dumps(meta, ensure_ascii=False)) + "::jsonb"


def _goal_literal(goal: str | None) -> str:
    return "NULL" if goal is None else sql_str(goal)


def render_material(m: Material) -> str:
    """One DO block: material + children, idempotent, author = admin."""
    lines: list[str] = []
    lines.append("DO $$")
    lines.append("DECLARE v_admin uuid;")
    lines.append("BEGIN")
    lines.append("  SELECT id INTO v_admin FROM profiles WHERE role = 'admin' LIMIT 1;")
    lines.append("  IF v_admin IS NULL THEN RAISE NOTICE 'no admin; skipping %', "
                 f"{sql_str(m.slug)}; RETURN; END IF;")
    lines.append("")
    lines.append("  INSERT INTO materials (slug, type, level, status, goal,")
    lines.append("    title_vi, title_en, summary_vi, summary_en, body_vi, body_en,")
    lines.append("    duration_min, gems_reward, xp_reward, min_completion_pct,")
    lines.append("    author_id, published_at, published_by)")
    lines.append("  VALUES (")
    lines.append(f"    {sql_str(m.slug)}, {sql_str(m.type)}, {sql_str(m.level)}, "
                 f"'published', {_goal_literal(m.goal)},")
    lines.append(f"    {sql_str(m.title_vi)}, {sql_str(m.title_en)}, "
                 f"{sql_str(m.summary_vi)}, {sql_str(m.summary_en)},")
    lines.append(f"    {sql_str(m.body_vi)}, {sql_str(m.body_en)},")
    lines.append(f"    {sql_int(m.duration_min)}, {sql_int(m.gems_reward)}, "
                 f"{sql_int(m.xp_reward)}, {sql_int(m.min_completion_pct)},")
    lines.append("    v_admin, now(), v_admin)")
    lines.append("  ON CONFLICT (slug) DO NOTHING;")
    lines.append("")

    if m.type == "vocabulary_pack":
        lines.append("  INSERT INTO vocabulary_items (material_id, idx, term, pos, ipa,")
        lines.append("    vi_phonetic_hint, gloss_vi, gloss_en, example_en, example_vi)")
        lines.append("  SELECT mm.id, v.idx, v.term, v.pos, v.ipa, v.vi_phonetic_hint,")
        lines.append("         v.gloss_vi, v.gloss_en, v.example_en, v.example_vi")
        lines.append("  FROM materials mm, (VALUES")
        rows = []
        for vi in m.vocab_items:
            rows.append(
                "    (" + ", ".join([
                    sql_int(vi.idx), sql_str(vi.term), sql_str(vi.pos), sql_str(vi.ipa),
                    sql_str(vi.vi_phonetic_hint), sql_str(vi.gloss_vi), sql_str(vi.gloss_en),
                    sql_str(vi.example_en), sql_str(vi.example_vi),
                ]) + ")"
            )
        lines.append(",\n".join(rows))
        lines.append("  ) AS v(idx, term, pos, ipa, vi_phonetic_hint, gloss_vi, gloss_en, "
                     "example_en, example_vi)")
        lines.append(f"  WHERE mm.slug = {sql_str(m.slug)}")
        lines.append("  ON CONFLICT (material_id, idx) DO NOTHING;")
    else:
        lines.append("  INSERT INTO material_sections (material_id, idx, kind, body_vi, "
                     "body_en, meta)")
        lines.append("  SELECT mm.id, s.idx, s.kind, s.body_vi, s.body_en, s.meta")
        lines.append("  FROM materials mm, (VALUES")
        rows = []
        for s in m.sections:
            rows.append(
                "    (" + ", ".join([
                    sql_int(s.idx), sql_str(s.kind), sql_str(s.body_vi),
                    sql_str(s.body_en), _sql_jsonb(s.meta),
                ]) + ")"
            )
        lines.append(",\n".join(rows))
        lines.append("  ) AS s(idx, kind, body_vi, body_en, meta)")
        lines.append(f"  WHERE mm.slug = {sql_str(m.slug)}")
        lines.append("  ON CONFLICT (material_id, idx) DO NOTHING;")

    lines.append("END $$;")
    return "\n".join(lines)


def render_file(materials: list[Material]) -> str:
    header = (
        "-- AI-generated materials insert (idempotent).\n"
        "-- Generated by tools/materials-generator. Apply via Supabase MCP execute_sql.\n"
        f"-- Materials: {len(materials)}\n"
    )
    blocks = [render_material(m) for m in materials]
    return header + "\n" + "\n\n".join(blocks) + "\n"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/materials-generator && uv run pytest tests/test_sql.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/materials-generator/materials_generator/sql.py tools/materials-generator/tests/test_sql.py
git commit -m "feat(materials-gen): idempotent SQL renderer"
```

---

### Task 4: Catalog (run plan)

**Files:**
- Create: `tools/materials-generator/materials_generator/catalog.py`
- Test: `tools/materials-generator/tests/test_catalog.py`

**Interfaces:**
- Consumes: `VALID_TYPES`, `VALID_LEVELS`, `VALID_GOALS`, `SLUG_RE` from `models`.
- Produces:
  - `MaterialSpec(type:str, level:str, goal:str|None, topic_vi:str, topic_en:str, slug:str)` (dataclass)
  - `EXISTING_SLUGS: set[str]` — known slugs to avoid (from the live DB snapshot).
  - `CATALOG: list[MaterialSpec]` — the deterministic ~30-item plan.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_catalog.py
from collections import Counter
from materials_generator.catalog import CATALOG, EXISTING_SLUGS, MaterialSpec
from materials_generator.models import SLUG_RE, VALID_TYPES, VALID_LEVELS, VALID_GOALS


def test_catalog_size_is_30():
    assert len(CATALOG) == 30


def test_type_distribution():
    counts = Counter(s.type for s in CATALOG)
    assert counts["vocabulary_pack"] == 9
    assert counts["grammar_lesson"] == 8
    assert counts["dialogue"] == 8
    assert counts["reading_passage"] == 5


def test_all_specs_valid_fields():
    for s in CATALOG:
        assert s.type in VALID_TYPES
        assert s.level in VALID_LEVELS
        assert s.goal is None or s.goal in VALID_GOALS
        assert SLUG_RE.match(s.slug) and len(s.slug) <= 96


def test_slugs_unique_and_not_colliding():
    slugs = [s.slug for s in CATALOG]
    assert len(slugs) == len(set(slugs))                     # internally unique
    assert not (set(slugs) & EXISTING_SLUGS)                 # no DB collisions
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/materials-generator && uv run pytest tests/test_catalog.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'materials_generator.catalog'`.

- [ ] **Step 3: Write `catalog.py`**

```python
# materials_generator/catalog.py
"""Deterministic run plan: ~30 MaterialSpecs across the thin types.

Slugs are precomputed and verified (in tests) not to collide with the live DB
snapshot taken 2026-06-25. Deterministic => re-running is resumable: anything
already in the DB is skipped by ON CONFLICT.
"""

from __future__ import annotations

from dataclasses import dataclass

# Snapshot of existing slugs for the four thin types (live DB, 2026-06-25).
EXISTING_SLUGS: set[str] = {
    "vocab-food-a1", "vocab-greetings-a1", "vocab-ielts-academic-b2",
    "vocab-interview-b1", "vocab-school-a2",
    "grammar-conditionals-b1", "grammar-passive-voice-b1", "grammar-past-simple-a2",
    "grammar-present-simple-a1", "grammar-reported-speech-b2",
    "dialogue-bargaining-a2", "dialogue-business-meeting-c1", "dialogue-doctor-visit-b1",
    "dialogue-job-interview-b2", "dialogue-meeting-friend-a1",
}


@dataclass
class MaterialSpec:
    type: str
    level: str
    goal: str | None
    topic_vi: str
    topic_en: str
    slug: str


CATALOG: list[MaterialSpec] = [
    # ---- vocabulary_pack × 9 ----
    MaterialSpec("vocabulary_pack", "a1", "travel", "Tại sân bay", "At the airport", "vocab-airport-a1"),
    MaterialSpec("vocabulary_pack", "a1", "conversation", "Gia đình", "Family", "vocab-family-a1"),
    MaterialSpec("vocabulary_pack", "a2", "travel", "Đặt phòng khách sạn", "Hotel booking", "vocab-hotel-a2"),
    MaterialSpec("vocabulary_pack", "a2", "conversation", "Thời tiết", "Weather", "vocab-weather-a2"),
    MaterialSpec("vocabulary_pack", "b1", "business", "Email công việc", "Work email", "vocab-work-email-b1"),
    MaterialSpec("vocabulary_pack", "b1", "toeic", "Văn phòng & công sở", "Office life (TOEIC)", "vocab-office-toeic-b1"),
    MaterialSpec("vocabulary_pack", "b2", "ielts", "Môi trường", "Environment (IELTS)", "vocab-environment-ielts-b2"),
    MaterialSpec("vocabulary_pack", "b2", "study_abroad", "Du học", "Studying abroad", "vocab-study-abroad-b2"),
    MaterialSpec("vocabulary_pack", "c1", "ielts", "Công nghệ", "Technology (IELTS)", "vocab-technology-ielts-c1"),

    # ---- grammar_lesson × 8 ----
    MaterialSpec("grammar_lesson", "a1", "school", "Động từ to be", "The verb to be", "grammar-verb-to-be-a1"),
    MaterialSpec("grammar_lesson", "a2", "school", "Thì hiện tại tiếp diễn", "Present continuous", "grammar-present-continuous-a2"),
    MaterialSpec("grammar_lesson", "a2", "school", "Danh từ đếm được & không đếm được", "Countable & uncountable nouns", "grammar-countable-nouns-a2"),
    MaterialSpec("grammar_lesson", "b1", "vstep", "Thì hiện tại hoàn thành", "Present perfect", "grammar-present-perfect-b1"),
    MaterialSpec("grammar_lesson", "b1", "ielts", "Mệnh đề quan hệ", "Relative clauses", "grammar-relative-clauses-b1"),
    MaterialSpec("grammar_lesson", "b2", "ielts", "Câu giả định & wish", "Subjunctive & wish", "grammar-wish-b2"),
    MaterialSpec("grammar_lesson", "b2", "toeic", "Giới từ thường gặp", "Common prepositions", "grammar-prepositions-b2"),
    MaterialSpec("grammar_lesson", "c1", "ielts", "Đảo ngữ", "Inversion", "grammar-inversion-c1"),

    # ---- dialogue × 8 ----
    MaterialSpec("dialogue", "a1", "conversation", "Gọi món ở quán phở", "Ordering at a phở shop", "dialogue-ordering-pho-a1"),
    MaterialSpec("dialogue", "a1", "travel", "Hỏi đường", "Asking for directions", "dialogue-directions-a1"),
    MaterialSpec("dialogue", "a2", "travel", "Bắt taxi/Grab", "Taking a taxi/Grab", "dialogue-taxi-a2"),
    MaterialSpec("dialogue", "b1", "conversation", "Mở tài khoản ngân hàng", "Opening a bank account", "dialogue-bank-account-b1"),
    MaterialSpec("dialogue", "b1", "business", "Gọi điện chăm sóc khách hàng", "Customer service call", "dialogue-customer-service-b1"),
    MaterialSpec("dialogue", "b2", "business", "Thương lượng hợp đồng", "Negotiating a contract", "dialogue-contract-negotiation-b2"),
    MaterialSpec("dialogue", "b2", "study_abroad", "Phỏng vấn visa du học", "Student visa interview", "dialogue-visa-interview-b2"),
    MaterialSpec("dialogue", "c1", "business", "Họp brainstorm dự án", "Project brainstorming meeting", "dialogue-brainstorm-c1"),

    # ---- reading_passage × 5 ----
    MaterialSpec("reading_passage", "a2", "travel", "Chợ nổi miền Tây", "Mekong floating markets", "reading-floating-market-a2"),
    MaterialSpec("reading_passage", "b1", "conversation", "Văn hoá xe máy ở Việt Nam", "Motorbike culture in Vietnam", "reading-motorbike-culture-b1"),
    MaterialSpec("reading_passage", "b1", "school", "Hệ thống giáo dục Việt Nam", "Vietnam's education system", "reading-education-system-b1"),
    MaterialSpec("reading_passage", "b2", "business", "Khởi nghiệp công nghệ tại Việt Nam", "Tech startups in Vietnam", "reading-tech-startups-b2"),
    MaterialSpec("reading_passage", "c1", "ielts", "Đô thị hoá ở Đông Nam Á", "Urbanization in Southeast Asia", "reading-urbanization-c1"),
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/materials-generator && uv run pytest tests/test_catalog.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/materials-generator/materials_generator/catalog.py tools/materials-generator/tests/test_catalog.py
git commit -m "feat(materials-gen): deterministic 30-item catalog"
```

---

### Task 5: Prompt templates + JSON parsing

**Files:**
- Create: `tools/materials-generator/materials_generator/schema_prompts.py`
- Test: `tools/materials-generator/tests/test_schema_prompts.py`

**Interfaces:**
- Consumes: `MaterialSpec` (Task 4); `Material`, `VocabItem`, `Section` (Task 2).
- Produces:
  - `build_prompt(spec: MaterialSpec) -> str` — the full LLM instruction demanding a single JSON object matching the spec's type.
  - `parse_response(spec: MaterialSpec, raw: str) -> Material` — extracts the JSON object from `raw` (tolerates ```json fences / surrounding prose), and maps it onto a `Material` carrying the spec's slug/type/level/goal. Raises `ValueError` if no JSON object is found or required keys are missing.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_schema_prompts.py
import json
import pytest
from materials_generator.catalog import MaterialSpec
from materials_generator.schema_prompts import build_prompt, parse_response


VOCAB_SPEC = MaterialSpec("vocabulary_pack", "a1", "travel",
                          "Tại sân bay", "At the airport", "vocab-airport-a1")
GRAMMAR_SPEC = MaterialSpec("grammar_lesson", "a1", "school",
                            "Động từ to be", "The verb to be", "grammar-verb-to-be-a1")


def test_prompt_mentions_topic_and_demands_json():
    p = build_prompt(VOCAB_SPEC)
    assert "At the airport" in p or "Tại sân bay" in p
    assert "JSON" in p
    assert "vocabulary_pack" in p


def test_prompt_for_grammar_asks_for_sections():
    p = build_prompt(GRAMMAR_SPEC)
    assert "sections" in p.lower()


def _vocab_payload():
    return {
        "title_vi": "Từ vựng sân bay", "title_en": "Airport vocabulary",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "# Sân bay", "body_en": "# Airport",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [
            {"term": "gate", "pos": "noun", "ipa": "/ɡeɪt/", "vi_phonetic_hint": "gết",
             "gloss_vi": "cổng ra máy bay", "gloss_en": "boarding gate",
             "example_en": "Go to gate 5.", "example_vi": "Đến cổng số 5."}
        ],
    }


def test_parse_plain_json():
    m = parse_response(VOCAB_SPEC, json.dumps(_vocab_payload()))
    assert m.slug == "vocab-airport-a1"
    assert m.type == "vocabulary_pack"
    assert m.level == "a1"
    assert m.goal == "travel"
    assert len(m.vocab_items) == 1
    assert m.vocab_items[0].idx == 0
    assert m.vocab_items[0].term == "gate"


def test_parse_json_in_code_fence_with_prose():
    raw = "Here you go:\n```json\n" + json.dumps(_vocab_payload()) + "\n```\nThanks!"
    m = parse_response(VOCAB_SPEC, raw)
    assert m.title_en == "Airport vocabulary"


def test_parse_grammar_sections():
    payload = {
        "title_vi": "Động từ to be", "title_en": "The verb to be",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "Thân", "body_en": "Body",
        "duration_min": 10, "gems_reward": 3, "xp_reward": 40, "min_completion_pct": 80,
        "sections": [
            {"kind": "intro", "body_vi": "Giới thiệu", "body_en": "Intro", "meta": {}},
            {"kind": "pattern", "body_vi": "Mẫu", "body_en": "Pattern", "meta": {"note": "am/is/are"}},
        ],
    }
    m = parse_response(GRAMMAR_SPEC, json.dumps(payload))
    assert len(m.sections) == 2
    assert m.sections[0].kind == "intro"
    assert m.sections[1].idx == 1
    assert m.sections[1].meta == {"note": "am/is/are"}


def test_parse_no_json_raises():
    with pytest.raises(ValueError):
        parse_response(VOCAB_SPEC, "I cannot help with that.")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/materials-generator && uv run pytest tests/test_schema_prompts.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'materials_generator.schema_prompts'`.

- [ ] **Step 3: Write `schema_prompts.py`**

```python
# materials_generator/schema_prompts.py
"""Per-type LLM prompts and JSON-response parsing.

The prompt forces a single JSON object whose shape depends on the material type.
parse_response is tolerant of code fences / surrounding prose, then maps the JSON
onto a Material that carries the spec's identity fields (slug/type/level/goal).
"""

from __future__ import annotations

import json
import re

from .catalog import MaterialSpec
from .models import Material, Section, VocabItem

_COMMON_RULES = """\
Rules:
- Write ORIGINAL content. Do not copy any existing article or copyrighted text.
- Vietnamese-first: *_vi fields are the source of truth; *_en fields are accurate English mirrors.
- All of title_vi, title_en, summary_vi, summary_en, body_vi, body_en are REQUIRED and non-empty.
- title_vi <= 200 chars, summary_vi <= 500 chars.
- duration_min between 1 and 90 (realistic minutes to study this material).
- Use Vietnam context and examples where natural. Match the CEFR level given.
- Return ONE JSON object and NOTHING else. No markdown, no commentary.
"""

_VOCAB_SHAPE = """\
JSON shape for a vocabulary_pack:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // short markdown intro to the pack
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "vocab_items": [                            // 8 to 12 items
    {
      "term": str, "pos": str, "ipa": str,   // IPA like /ˈpæspɔːrt/
      "vi_phonetic_hint": str,               // Vietnamese-friendly read-aloud hint, e.g. "pát-pọt"
      "gloss_vi": str, "gloss_en": str,
      "example_en": str, "example_vi": str
    }
  ]
}
Suggested: gems_reward 2-3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_GRAMMAR = """\
JSON shape for a grammar_lesson:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // markdown overview of the grammar point
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [                              // 3 to 5 sections
    { "kind": "intro"|"pattern"|"drill", "body_vi": str, "body_en": str, "meta": {} }
  ]
}
Use 'intro' for the concept, 'pattern' for forms/structures, 'drill' for practice items.
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_DIALOGUE = """\
JSON shape for a dialogue:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // markdown scenario setup
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [                              // 8 to 14 dialogue lines, in order
    {
      "kind": "dialogue_line",
      "body_vi": str,                        // the line in Vietnamese (translation)
      "body_en": str,                        // the line in English (the line learners study)
      "meta": { "speaker": str }             // e.g. "Customer" / "Waiter"
    }
  ]
}
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 80.
"""

_SECTION_SHAPE_READING = """\
JSON shape for a reading_passage:
{
  "title_vi": str, "title_en": str,
  "summary_vi": str, "summary_en": str,
  "body_vi": str, "body_en": str,            // the FULL passage (en is the text learners read)
  "duration_min": int, "gems_reward": int, "xp_reward": int, "min_completion_pct": int,
  "sections": [
    { "kind": "passage", "body_vi": str, "body_en": str, "meta": {} },   // the passage body
    { "kind": "drill", "body_vi": str, "body_en": str,                   // comprehension Qs
      "meta": { "questions": [ {"q_en": str, "q_vi": str, "answer_en": str} ] } }
  ]
}
Passage length scales with level: A2 ~200 words, B1 ~300-350, B2 ~450, C1 ~600.
Suggested: gems_reward 3, xp_reward 40-80, min_completion_pct 60.
"""

_SHAPES = {
    "vocabulary_pack": _VOCAB_SHAPE,
    "grammar_lesson": _SECTION_SHAPE_GRAMMAR,
    "dialogue": _SECTION_SHAPE_DIALOGUE,
    "reading_passage": _SECTION_SHAPE_READING,
}


def build_prompt(spec: MaterialSpec) -> str:
    shape = _SHAPES[spec.type]
    goal = spec.goal or "general"
    return (
        f"You are an expert Vietnamese English-teacher and curriculum writer.\n"
        f"Create ONE {spec.type} at CEFR level {spec.level.upper()} for the learning goal "
        f"'{goal}'.\n"
        f"Topic (Vietnamese): {spec.topic_vi}\n"
        f"Topic (English): {spec.topic_en}\n\n"
        f"{_COMMON_RULES}\n{shape}"
    )


_JSON_OBJ_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    # Strip ```json ... ``` or ``` ... ``` fences if present.
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else None
    if candidate is None:
        m = _JSON_OBJ_RE.search(text)
        if not m:
            raise ValueError("no JSON object found in model response")
        candidate = m.group(0)
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON in model response: {e}") from e


def parse_response(spec: MaterialSpec, raw: str) -> Material:
    data = _extract_json(raw)

    required = ["title_vi", "title_en", "summary_vi", "summary_en", "body_vi", "body_en",
                "duration_min", "gems_reward", "xp_reward", "min_completion_pct"]
    missing = [k for k in required if k not in data]
    if missing:
        raise ValueError(f"response missing keys: {missing}")

    vocab_items: list[VocabItem] = []
    sections: list[Section] = []

    if spec.type == "vocabulary_pack":
        for i, v in enumerate(data.get("vocab_items", [])):
            vocab_items.append(VocabItem(
                idx=i,
                term=v.get("term", ""),
                pos=v.get("pos"),
                ipa=v.get("ipa"),
                vi_phonetic_hint=v.get("vi_phonetic_hint"),
                gloss_vi=v.get("gloss_vi", ""),
                gloss_en=v.get("gloss_en"),
                example_en=v.get("example_en", ""),
                example_vi=v.get("example_vi", ""),
            ))
    else:
        for i, s in enumerate(data.get("sections", [])):
            sections.append(Section(
                idx=i,
                kind=s.get("kind", ""),
                body_vi=s.get("body_vi"),
                body_en=s.get("body_en"),
                meta=s.get("meta", {}) or {},
            ))

    return Material(
        slug=spec.slug,
        type=spec.type,
        level=spec.level,
        goal=spec.goal,
        title_vi=data["title_vi"],
        title_en=data["title_en"],
        summary_vi=data["summary_vi"],
        summary_en=data["summary_en"],
        body_vi=data["body_vi"],
        body_en=data["body_en"],
        duration_min=int(data["duration_min"]),
        gems_reward=int(data["gems_reward"]),
        xp_reward=int(data["xp_reward"]),
        min_completion_pct=int(data["min_completion_pct"]),
        vocab_items=vocab_items,
        sections=sections,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/materials-generator && uv run pytest tests/test_schema_prompts.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/materials-generator/materials_generator/schema_prompts.py tools/materials-generator/tests/test_schema_prompts.py
git commit -m "feat(materials-gen): prompts + tolerant JSON parsing"
```

---

### Task 6: Orchestrator (generate.py)

**Files:**
- Create: `tools/materials-generator/materials_generator/generate.py`
- Test: `tools/materials-generator/tests/test_generate.py`

**Interfaces:**
- Consumes: `CATALOG` (Task 4), `build_prompt`/`parse_response` (Task 5), `Material` (Task 2), `render_file` (Task 3).
- Produces:
  - `async generate_one(spec, query_fn) -> Material | None` — calls `query_fn(prompt) -> str`, parses, validates; returns a valid `Material` or `None` (logging the reason). `query_fn` is injected so the orchestration is unit-testable without the real SDK.
  - `async run(specs, query_fn, out_path) -> dict` — generates all, writes `render_file(...)` to `out_path` (unless empty), returns a summary dict `{"generated": int, "failed": int, "specs": int}`.
  - `default_query_fn(prompt: str) -> str` — the real Agent SDK call (`allowed_tools=[]`, `max_turns=2`).
  - `main()` — CLI with `--dry-run`, `--limit N`, `--out PATH`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_generate.py
import asyncio
import json
from pathlib import Path

from materials_generator.catalog import MaterialSpec
from materials_generator.generate import generate_one, run


VOCAB_SPEC = MaterialSpec("vocabulary_pack", "a1", "travel",
                          "Tại sân bay", "At the airport", "vocab-airport-a1")


def _good_payload():
    return json.dumps({
        "title_vi": "Từ vựng sân bay", "title_en": "Airport vocabulary",
        "summary_vi": "Tóm tắt.", "summary_en": "Summary.",
        "body_vi": "# Sân bay", "body_en": "# Airport",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [
            {"term": "gate", "pos": "noun", "ipa": "/ɡeɪt/", "vi_phonetic_hint": "gết",
             "gloss_vi": "cổng ra máy bay", "gloss_en": "boarding gate",
             "example_en": "Go to gate 5.", "example_vi": "Đến cổng số 5."}
        ],
    })


def test_generate_one_returns_valid_material():
    async def fake_query(prompt): return _good_payload()
    m = asyncio.run(generate_one(VOCAB_SPEC, fake_query))
    assert m is not None
    assert m.slug == "vocab-airport-a1"


def test_generate_one_returns_none_on_invalid():
    # vocab pack with no items -> fails validation
    bad = json.dumps({
        "title_vi": "x", "title_en": "x", "summary_vi": "x", "summary_en": "x",
        "body_vi": "x", "body_en": "x",
        "duration_min": 10, "gems_reward": 2, "xp_reward": 40, "min_completion_pct": 80,
        "vocab_items": [],
    })
    async def fake_query(prompt): return bad
    assert asyncio.run(generate_one(VOCAB_SPEC, fake_query)) is None


def test_generate_one_returns_none_on_no_json():
    async def fake_query(prompt): return "Sorry, no."
    assert asyncio.run(generate_one(VOCAB_SPEC, fake_query)) is None


def test_run_writes_sql_and_summary(tmp_path):
    async def fake_query(prompt): return _good_payload()
    out = tmp_path / "materials_insert.sql"
    summary = asyncio.run(run([VOCAB_SPEC], fake_query, out))
    assert summary == {"generated": 1, "failed": 0, "specs": 1}
    text = out.read_text(encoding="utf-8")
    assert "INSERT INTO materials" in text
    assert "vocab-airport-a1" in text


def test_run_skips_file_when_nothing_generated(tmp_path):
    async def fake_query(prompt): return "no json here"
    out = tmp_path / "materials_insert.sql"
    summary = asyncio.run(run([VOCAB_SPEC], fake_query, out))
    assert summary == {"generated": 0, "failed": 1, "specs": 1}
    assert not out.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/materials-generator && uv run pytest tests/test_generate.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'materials_generator.generate'`.

- [ ] **Step 3: Write `generate.py`**

```python
# materials_generator/generate.py
"""Orchestrator: generate materials via an injected query function and render SQL.

The query function is injected (query_fn: prompt -> response text) so the
orchestration logic is unit-testable without calling the real Agent SDK.
The real SDK call lives in default_query_fn.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import Awaitable, Callable

from .catalog import CATALOG, MaterialSpec
from .models import Material
from .schema_prompts import build_prompt, parse_response
from .sql import render_file

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("materials-gen")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "out" / "materials_insert.sql"

QueryFn = Callable[[str], Awaitable[str]]


async def generate_one(spec: MaterialSpec, query_fn: QueryFn) -> Material | None:
    prompt = build_prompt(spec)
    try:
        raw = await query_fn(prompt)
    except Exception as e:  # SDK/network failure
        log.warning("[%s] query failed: %s", spec.slug, e)
        return None
    try:
        material = parse_response(spec, raw)
    except ValueError as e:
        log.warning("[%s] parse failed: %s", spec.slug, e)
        return None
    errors = material.validate()
    if errors:
        log.warning("[%s] invalid: %s", spec.slug, "; ".join(errors))
        return None
    log.info("[%s] ok", spec.slug)
    return material


async def run(specs: list[MaterialSpec], query_fn: QueryFn, out_path: Path) -> dict:
    materials: list[Material] = []
    failed = 0
    for spec in specs:
        m = await generate_one(spec, query_fn)
        if m is None:
            failed += 1
        else:
            materials.append(m)

    if materials:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(render_file(materials), encoding="utf-8")
        log.info("wrote %d materials -> %s", len(materials), out_path)
    else:
        log.warning("no materials generated; not writing %s", out_path)

    return {"generated": len(materials), "failed": failed, "specs": len(specs)}


async def default_query_fn(prompt: str) -> str:
    """Real Agent SDK call. Pure generation: no tools."""
    from claude_agent_sdk import (
        AssistantMessage,
        ClaudeAgentOptions,
        TextBlock,
        query,
    )

    response = ""
    async for message in query(
        prompt=prompt,
        options=ClaudeAgentOptions(
            allowed_tools=[],
            max_turns=2,
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    response += block.text
    return response


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate materials -> idempotent SQL")
    parser.add_argument("--limit", type=int, default=None, help="cap number of specs")
    parser.add_argument("--dry-run", action="store_true",
                        help="generate but print SQL instead of writing out/")
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    args = parser.parse_args()

    specs = CATALOG if args.limit is None else CATALOG[: args.limit]

    if args.dry_run:
        async def dry():
            mats: list[Material] = []
            for spec in specs:
                m = await generate_one(spec, default_query_fn)
                if m:
                    mats.append(m)
            if mats:
                print(render_file(mats))
            print(f"\n-- DRY RUN: {len(mats)}/{len(specs)} generated (not written)",
                  file=sys.stderr)
        asyncio.run(dry())
        return

    summary = asyncio.run(run(specs, default_query_fn, Path(args.out)))
    print(f"Done: generated={summary['generated']} failed={summary['failed']} "
          f"specs={summary['specs']}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/materials-generator && uv run pytest tests/test_generate.py -q`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `cd tools/materials-generator && uv run pytest -q`
Expected: PASS — all tests across models, sql, catalog, schema_prompts, generate.

- [ ] **Step 6: Commit**

```bash
git add tools/materials-generator/materials_generator/generate.py tools/materials-generator/tests/test_generate.py
git commit -m "feat(materials-gen): orchestrator with injectable query fn + CLI"
```

---

### Task 7: Live generation run + dry-run validation

**Files:**
- None created. Produces `tools/materials-generator/out/materials_insert.sql` (gitignored).

**Interfaces:**
- Consumes: the full package.
- Produces: a generated, schema-valid SQL file ready for Task 8.

- [ ] **Step 1: Cheap dry run (2 materials) to sanity-check prompts/output**

Run: `cd tools/materials-generator && uv run python -m materials_generator.generate --dry-run --limit 2`
Expected: Prints two `DO $$ ... END $$;` blocks of valid-looking SQL to stdout; stderr ends with `DRY RUN: 2/2 generated`. If 0/2, inspect the warnings, adjust prompts in `schema_prompts.py`, re-run.

- [ ] **Step 2: Full run**

Run: `cd tools/materials-generator && uv run python -m materials_generator.generate`
Expected: `Done: generated=N failed=M specs=30` with N close to 30. `out/materials_insert.sql` exists.

- [ ] **Step 3: Eyeball the SQL**

Run: `cd tools/materials-generator && grep -c "DO \$\$" out/materials_insert.sql && grep -c "ON CONFLICT" out/materials_insert.sql`
Expected: both counts ≥ generated count; no obviously broken quoting.

- [ ] **Step 4: No commit (artifact is gitignored).**

Report N generated, M failed, and any failure reasons to the user before proceeding to Task 8.

---

### Task 8: Apply SQL to live DB via Supabase MCP + verify

**Files:** none. This task is executed by Claude in the Claude Code session (the MCP tool is session-scoped, not callable from the script).

**Interfaces:**
- Consumes: `out/materials_insert.sql` from Task 7.
- Produces: rows in the live DB (project `evrcwtsexlamacawofxo`); a verification report.

- [ ] **Step 1: Capture pre-counts**

Via Supabase MCP `execute_sql` on project `evrcwtsexlamacawofxo`:
```sql
SELECT type, count(*) FROM materials
WHERE type IN ('vocabulary_pack','grammar_lesson','dialogue','reading_passage')
GROUP BY type ORDER BY type;
```
Record the counts.

- [ ] **Step 2: Apply the generated SQL**

Read `out/materials_insert.sql` and run it through Supabase MCP `execute_sql` (the file is multiple `DO $$` blocks; run the whole file, or block-by-block if the tool limits statement size). Expect no errors (idempotent — safe to re-run).

- [ ] **Step 3: Capture post-counts + spot-check a material**

```sql
SELECT type, count(*) FROM materials
WHERE type IN ('vocabulary_pack','grammar_lesson','dialogue','reading_passage')
GROUP BY type ORDER BY type;

SELECT m.slug, m.title_vi, m.title_en, m.status,
       (SELECT count(*) FROM vocabulary_items vi WHERE vi.material_id = m.id) AS vocab_n,
       (SELECT count(*) FROM material_sections ms WHERE ms.material_id = m.id) AS section_n
FROM materials m
WHERE m.slug = 'vocab-airport-a1';
```
Expected: per-type counts increased by the generated amounts; the spot-checked material has non-null `title_en`, `status='published'`, and the expected child rows.

- [ ] **Step 4: Report to user**

Report: pre/post counts per type, total inserted, any slugs skipped via `ON CONFLICT`, and the spot-check result. Done.

---

## Self-Review

**Spec coverage:**
- Python + claude-agent-sdk → Task 1 (deps), Task 6 (`default_query_fn`). ✓
- 4 material types → Task 4 catalog, Task 5 per-type shapes. ✓
- ~30 weighted batch (9/8/8/5) → Task 4 + `test_type_distribution`. ✓
- Idempotent SQL, `ON CONFLICT`, per-material `DO $$` rollback → Task 3. ✓
- Bilingual-published constraint enforced client-side → Task 2 `validate()`. ✓
- Slug regex/length + no collisions → Task 2 + Task 4 `test_slugs_unique_and_not_colliding`. ✓
- Author resolved from admin profile (not hard-coded) → Task 3 `render_material`. ✓
- JSON-return not file-write → Task 5 parsing, Task 6 orchestration. ✓
- Error handling (retry/skip on bad/missing) → Task 6 `generate_one` returns None + logs (spec's "retry once" simplified to skip-on-failure; acceptable since the batch continues and re-runs are idempotent). ✓
- Direct insert via session MCP (flow A) → Task 8. ✓
- Dry-run + `--limit` → Task 6 CLI, Task 7. ✓
- `out/` gitignored → Task 1. ✓
- No schema changes → no migration tasks present. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; every command has expected output. ✓

**Type consistency:** `query_fn`/`QueryFn` signature consistent across Tasks 6 tests + impl. `Material`/`VocabItem`/`Section` field names identical across Tasks 2, 3, 5, 6. `MaterialSpec` fields (`type/level/goal/topic_vi/topic_en/slug`) identical across Tasks 4 and 5. `render_file`/`render_material`/`sql_str`/`sql_text_array` names consistent across Tasks 3 and 6. ✓

**Deviation note:** Spec mentioned "retry once with a stricter reminder" on malformed JSON. The plan simplifies to log-and-skip (batch continues; re-runs are idempotent and cheap). If you want the retry, it's a small addition to `generate_one` — flag during execution.
