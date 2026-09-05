## Active Technologies
- Configuration files (JSON), Documentation (Markdown) (001-english-learning-platform)
- N/A (uses existing Supabase PostgreSQL database) (001-english-learning-platform)
- TypeScript 5.4, Node.js 20, Deno (Supabase Edge Functions) + Next.js 14.2, Supabase JS v2, Express 4 (backend), `lru-cache` (new), `server-only` (new) (001-english-learning-platform)
- Supabase PostgreSQL — new migration for `processed_webhooks` table and JWT claims trigger (001-english-learning-platform)

## Recent Changes
- 001-english-learning-platform: Added Configuration files (JSON), Documentation (Markdown)
- materials-library (2026-05-10): New feature plan — see `specs/001-english-learning-platform/features/materials-library/`. Adds curated Vietnamese-first **Materials Library** (vocabulary packs, grammar lessons, reading passages, listening clips, dialogues, mock tests). Introduces tables `materials`, `material_sections`, `vocabulary_items`, `mock_test_items`, `material_assets`, `material_tags`, `material_tag_links`, `material_collections`, `material_collection_items`, `material_progress`, `material_reviews`, `material_translations`; RPCs `award_material_completion`, `grade_mock_test`, `recommend_next_material`; storage bucket `material-assets`; edge function `materials-publish`. UI under `/{locale}/materials/*`, components under `frontend/src/components/materials/`. Reuses existing `gems_transactions` and `xp_events` ledgers — does not introduce a new currency.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **easy_eng** (11728 symbols, 15946 relationships, 256 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/easy_eng/context` | Codebase overview, check index freshness |
| `gitnexus://repo/easy_eng/clusters` | All functional areas |
| `gitnexus://repo/easy_eng/processes` | All execution flows |
| `gitnexus://repo/easy_eng/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
