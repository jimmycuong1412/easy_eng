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
