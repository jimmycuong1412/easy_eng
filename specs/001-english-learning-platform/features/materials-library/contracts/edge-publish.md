# Edge Function contract — `materials-publish`

**Path**: `supabase/functions/materials-publish/index.ts`
**Invocation**: `POST https://<project>.supabase.co/functions/v1/materials-publish` with the user's bearer JWT.

Drives the authoring lifecycle (R4 in `research.md`). Pure state-transition function — does NOT mutate content.

## Request

```jsonc
{
  "material_id": "uuid",
  "action":      "submit_for_review" | "approve" | "reject" | "archive" | "restore",
  "reason":      "optional string"  // required when action ∈ {reject}
}
```

## Authorization matrix

| Action | Allowed roles | Caller must own material? |
|--------|--------------|---------------------------|
| `submit_for_review` | teacher, admin | teacher: yes; admin: no |
| `approve` | admin | no |
| `reject` | admin | no |
| `archive` | admin | no |
| `restore` | admin | no |

The function reads `profiles.role` for the caller, NOT the JWT custom claims (matches existing platform pattern; role is in the DB).

## Pre-conditions per action

| Action | Required current status | Other checks |
|--------|------------------------|--------------|
| `submit_for_review` | `draft` | Material has at least 1 section + valid `title_vi`, `summary_vi`, `body_vi`. **Automated content checks** (regex/NULL, returns 422 on failure): (1) `body_vi` contains ≥ 10 Vietnamese characters; (2) for `vocabulary_pack`: every item has non-empty `ipa`, `vi_phonetic_hint`, `example_en`, `example_vi`; (3) for `vocabulary_pack`: ≥ 8 items; (4) for `mock_test`: ≥ 5 items all with `correct_index` set. `material_reviews` row is created with auto-verified fields pre-populated in `checklist_passed`. |
| `approve` | `in_review` | Material has `title_en`, `summary_en`, `body_en` populated; all manual checklist items in `material_reviews.checklist_passed` ticked by reviewer. |
| `reject` | `in_review` | `reason` non-empty. |
| `archive` | `published` | none |
| `restore` | `archived` | none |

Failures return HTTP 422 with a JSON body listing each unmet check.

## Side effects

1. Update `materials.status` and the appropriate timestamp / actor column.
2. Insert `material_reviews` row (`approve` / `reject`).
3. Insert `audit_log` row (`event='materials.publish'` + payload).
4. If `approve`: also recompute `materials.popularity_score = 0` (so it joins the catalog in next nightly recompute) and emit a `realtime` broadcast on channel `materials:catalog` so the catalog re-fetches.

## Response

```jsonc
{
  "material_id": "uuid",
  "status": "published",
  "published_at": "2026-05-10T12:34:56Z"
}
```

## Errors

| Status | `code` | When |
|--------|--------|------|
| 401 | `unauthenticated` | No or invalid JWT |
| 403 | `forbidden` | Caller's role can't perform this action |
| 404 | `not_found` | Material doesn't exist or is RLS-hidden |
| 409 | `wrong_state` | Status doesn't match required pre-condition for action |
| 422 | `validation_failed` | Bilingual / item-count / `correct_index` checks failed; body includes `errors[]` array |
| 500 | `internal_error` | Anything else (logged to Sentry) |
