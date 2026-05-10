# RPC contract — `grade_mock_test`

**Type**: Postgres function, `SECURITY DEFINER`, language `plpgsql`
**Schema**: `public`
**Idempotency**: Awards happen at most once per (user, material). Re-grading after completion returns the previously-awarded values without double-counting.

## Signature

```sql
public.grade_mock_test (
  p_user_id     uuid,
  p_material_id uuid,
  p_answers     jsonb   -- { "<idx>": <answer>, ... } where <answer> is int (mc/tf) or text (fill-in-blank)
) RETURNS jsonb
```

## Behaviour

1. Authorization: `auth.uid() = p_user_id` or admin. Otherwise raise.
2. Load material. Reject if not `published` or `type <> 'mock_test'`.
3. Read all `mock_test_items` for the material **including `correct_index`** (we are inside `SECURITY DEFINER` so RLS is bypassed).
4. For each item idx, compare `p_answers[idx]` to the stored `correct_index` (or to a normalized comparison for fill-in-blank: case-insensitive trim).
5. Compute totals: `score_pct = round(100 * sum(item.points if correct else 0) / sum(item.points))`.
6. If `score_pct >= material.min_completion_pct`, upsert `material_progress` with `state='completed'`, `completed_at=now()`, `score_pct`. **No `award_material_completion` call — mock tests award zero gems and zero XP.**
7. Persist the answer payload into `material_progress.meta.answers` for review later (overwrites on retake unless already completed).
8. Return:
   ```json
   {
     "score_pct": 82,
     "items_correct": 8,
     "items_total": 10,
     "passed": true,
     "per_item": [
       { "idx": 0, "correct": true, "correct_index": 1, "explanation_vi": "..." },
       ...
     ]
   }
   ```

## Authorization & integrity contract

- The frontend MUST never have access to `correct_index` before submission. RLS hides it from the regular table, and the `mock_test_items_public` view excludes it.
- Re-grading after passing is allowed (lets users see explanations again) but never awards again.
- If a user fails (`score_pct < min_completion_pct`), no row is created in `material_progress` with `state='completed'`. The progress row stays `in_progress` so the user can retry.

## Error contract

| Condition | Status | Body |
|-----------|--------|------|
| Material not found | 404 | `{ "code": "not_found", "message": "material not found" }` |
| Material not a mock test | 422 | `{ "code": "wrong_type", "message": "material is not a mock test" }` |
| Material not published | 403 | `{ "code": "not_publishable" }` |
| Answers payload malformed | 422 | `{ "code": "bad_answers", "message": "expected map of idx → answer" }` |

## Performance contract

- p95 ≤ 200 ms for tests up to 40 items.
- Single SELECT for items, single INSERT path, single optional RPC call to `award_material_completion`.
