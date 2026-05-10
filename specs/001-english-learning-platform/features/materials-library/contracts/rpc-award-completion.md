# RPC contract — `award_material_completion`

**Type**: Postgres function, `SECURITY DEFINER`, language `plpgsql`
**Schema**: `public`
**Idempotency**: Yes — second call with the same `(p_user_id, p_material_id)` returns `{already_completed: true}` and awards nothing.

## Signature

```sql
public.award_material_completion (
  p_user_id     uuid,                -- learner whose progress is being marked
  p_material_id uuid,                -- material being completed
  p_score       int DEFAULT NULL     -- 0..100, only meaningful for mock tests
) RETURNS jsonb
```

## Authorization

- Caller MUST have `auth.uid() = p_user_id` OR caller MUST be an admin (checked via `profiles.role`).
- The function asserts these inside the body; PostgREST exposure does NOT bypass.

## Behaviour

1. Acquire transactional advisory lock `(hashtext(user_id || material_id))` to serialize concurrent calls.
2. Load the target material. If `status <> 'published'` raise `materials.not_publishable` (HTTP 403 from PostgREST).
3. Compute reward amounts:
   ```text
   gems = COALESCE(p_score IS NOT NULL ? floor(p_score / 20) + material.gems_reward : material.gems_reward, 0)
   xp   = COALESCE(p_score IS NOT NULL ? p_score + material.xp_reward         : material.xp_reward,   0)
   ```
4. `INSERT INTO material_progress (...)` ... `ON CONFLICT (user_id, material_id) DO NOTHING`.
   - If a row already existed in `state = 'completed'` we skip. The function returns `{already_completed: true}`.
   - If a row existed in `state = 'in_progress'`, update it in-place to `state='completed', completed_at=now(), gems_awarded, xp_awarded`.
5. Insert audit ledger rows:
   ```sql
   INSERT INTO gems_transactions (user_id, amount, reason, material_id) VALUES (...);
   INSERT INTO xp_events         (user_id, amount, source, reference_id) VALUES (...);
   ```
6. Return `jsonb_build_object('already_completed', false, 'gems_awarded', g, 'xp_awarded', x)`.

## Error contract

| Condition | SQLSTATE | PostgREST status | `message` |
|-----------|----------|------------------|-----------|
| Material not found | `P0002` | 404 | "material not found" |
| Material not published | `P0001` | 403 | "material not publishable" |
| Caller is neither owner nor admin | `42501` (insufficient_privilege) | 403 | "not authorized" |
| Any unhandled exception | any | 500 | re-raised after writing `audit_log` row `{event: 'materials.award_failed', user_id, material_id, error}` and capturing to Sentry |

## Concurrency contract

- Two parallel calls with the same `(user_id, material_id)`: only the first succeeds; the second sees the row and returns `{already_completed: true}`. No duplicate `gems_transactions` rows.
- Test: `frontend/tests/integration/materials/award-concurrent.test.ts` runs the RPC twice in parallel and asserts a single ledger row.

## Performance contract

- p95 ≤ 60 ms server-side under nominal load (single-row writes + advisory lock).
- No table scans; uses the unique index on `material_progress (user_id, material_id)`.
