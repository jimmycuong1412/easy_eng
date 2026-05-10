-- Migration 083: Materials Library — RPC functions
-- Spec: contracts/rpc-award-completion.md, contracts/rpc-grade-mock-test.md, data-model.md
-- Date: 2026-05-10
--
-- Four SECURITY DEFINER functions:
--   * award_material_completion — atomic gem+XP grant for non-test materials
--   * grade_mock_test           — server-side scoring; NO gem/XP award (per 2026-05-10 clarification)
--   * recommend_next_material   — dashboard suggestion
--   * compute_popularity_scores — nightly job
--
-- Per Constitution VI: all currency mutations happen here, never on the client.

-- ============================================================
-- 1. award_material_completion
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_material_completion(
  p_user_id     uuid,
  p_material_id uuid,
  p_score       int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_material    materials%ROWTYPE;
  v_progress    material_progress%ROWTYPE;
  v_gems        int;
  v_xp          int;
  v_inserted    boolean := false;
BEGIN
  -- Authorization: caller must be the user, or admin
  v_caller_role := public.get_my_role();
  IF auth.uid() <> p_user_id AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501', HINT = 'caller is neither owner nor admin';
  END IF;

  -- Serialize concurrent completions for the same (user, material)
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || p_material_id::text, 0)
  );

  -- Load material
  SELECT * INTO v_material FROM materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_material.status <> 'published' THEN
    RAISE EXCEPTION 'material not publishable'
      USING ERRCODE = 'P0001';
  END IF;

  -- Reject mock tests outright — they are graded via grade_mock_test and
  -- award no gems or XP (per 2026-05-10 clarification).
  IF v_material.type = 'mock_test' THEN
    RAISE EXCEPTION 'mock tests do not award gems via this path'
      USING ERRCODE = 'P0001',
            HINT = 'use grade_mock_test for mock-test scoring';
  END IF;

  -- Compute reward amounts
  IF p_score IS NOT NULL THEN
    v_gems := v_material.gems_reward + (p_score / 20);
    v_xp   := v_material.xp_reward + p_score;
  ELSE
    v_gems := v_material.gems_reward;
    v_xp   := v_material.xp_reward;
  END IF;

  -- Idempotent upsert. If a completed row already exists, return that.
  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at, completed_at,
    completion_pct, score_pct, gems_awarded, xp_awarded, state
  )
  VALUES (
    p_user_id, p_material_id, now(), now(), now(),
    100, p_score, v_gems, v_xp, 'completed'
  )
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET completed_at     = COALESCE(material_progress.completed_at, EXCLUDED.completed_at),
        last_activity_at = EXCLUDED.last_activity_at,
        completion_pct   = GREATEST(material_progress.completion_pct, EXCLUDED.completion_pct),
        score_pct        = COALESCE(material_progress.score_pct, EXCLUDED.score_pct),
        gems_awarded     = CASE WHEN material_progress.completed_at IS NULL
                                THEN EXCLUDED.gems_awarded
                                ELSE material_progress.gems_awarded END,
        xp_awarded       = CASE WHEN material_progress.completed_at IS NULL
                                THEN EXCLUDED.xp_awarded
                                ELSE material_progress.xp_awarded END,
        state            = 'completed'
  RETURNING (xmax = 0) INTO v_inserted;
  -- xmax = 0 means the row was inserted (not updated)

  -- Re-read to find out whether this call is the one that actually
  -- transitioned the row to completed (and therefore should award)
  SELECT * INTO v_progress FROM material_progress
   WHERE user_id = p_user_id AND material_id = p_material_id;

  -- Already-completed: skip ledger writes
  IF NOT v_inserted AND v_progress.gems_awarded > 0 THEN
    -- This branch fires when an UPDATE happened but the row was already
    -- in the completed state before this call.
    -- We detect that by checking that gems_awarded was already populated.
    -- (See below for the case where a prior in_progress row was upgraded.)
    NULL;
  END IF;

  -- Determine whether ledger inserts should happen.
  -- They should fire iff this call is the first to set completed_at on this row.
  -- The simplest reliable signal: did the row exist with completed_at IS NULL
  -- before this call?
  -- We can derive this from the difference between the post-image and pre-image
  -- via the OUTPUT of the upsert. Since plpgsql doesn't expose that cleanly,
  -- we use a sentinel: if the post-image gems_awarded equals our computed v_gems,
  -- AND the row's started_at predates the upsert's last_activity_at (i.e. the
  -- row existed in 'in_progress' before), OR v_inserted is true, then we award.
  --
  -- Simpler approach: we check whether a ledger row already exists for this
  -- (user, material). The unique combination of reason='material_completion'
  -- + a transaction tagged in metadata gives us idempotency.
  IF EXISTS (
    SELECT 1 FROM gem_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'material_completion'
      AND (metadata ->> 'material_id') = p_material_id::text
  ) THEN
    RETURN jsonb_build_object(
      'already_completed', true,
      'gems_awarded',      v_progress.gems_awarded,
      'xp_awarded',        v_progress.xp_awarded
    );
  END IF;

  -- First-time award: write ledger rows
  BEGIN
    INSERT INTO gem_transactions (user_id, amount, transaction_type, description, metadata)
    VALUES (
      p_user_id,
      v_gems,
      'material_completion',
      'Hoàn thành bài học: ' || v_material.title_vi,
      jsonb_build_object('material_id', p_material_id, 'material_type', v_material.type)
    );

    INSERT INTO xp_transactions (
      student_id, amount, activity_type, description
    )
    VALUES (
      p_user_id,
      v_xp,
      'material_completion',
      v_material.title_vi
    );
  EXCEPTION WHEN OTHERS THEN
    -- Per clarification 2026-05-10: log to materials_audit + re-raise so
    -- Sentry captures via the existing integration.
    INSERT INTO materials_audit (event, material_id, user_id, payload)
    VALUES (
      'materials.award_failed',
      p_material_id,
      p_user_id,
      jsonb_build_object(
        'sqlstate', SQLSTATE,
        'sqlerrm',  SQLERRM,
        'gems',     v_gems,
        'xp',       v_xp
      )
    );
    RAISE;
  END;

  RETURN jsonb_build_object(
    'already_completed', false,
    'gems_awarded',      v_gems,
    'xp_awarded',        v_xp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_material_completion(uuid, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_material_completion(uuid, uuid, int) TO authenticated;

COMMENT ON FUNCTION public.award_material_completion IS
  'Atomic gem+XP grant for non-test material completion. Idempotent via gem_transactions metadata check. Mock tests are rejected; use grade_mock_test instead.';

-- ============================================================
-- 2. grade_mock_test — score only, no currency awards
-- ============================================================
CREATE OR REPLACE FUNCTION public.grade_mock_test(
  p_user_id     uuid,
  p_material_id uuid,
  p_answers     jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role  text;
  v_material     materials%ROWTYPE;
  v_total_points int := 0;
  v_earned_points int := 0;
  v_items_correct int := 0;
  v_items_total  int := 0;
  v_score_pct    int;
  v_passed       boolean;
  v_per_item     jsonb := '[]'::jsonb;
  v_item         record;
  v_user_answer  jsonb;
  v_is_correct   boolean;
BEGIN
  v_caller_role := public.get_my_role();
  IF auth.uid() <> p_user_id AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'bad_answers: expected JSON object'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_material FROM materials WHERE id = p_material_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'material not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_material.type <> 'mock_test' THEN
    RAISE EXCEPTION 'wrong_type: material is not a mock test'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_material.status <> 'published' AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'material not publishable' USING ERRCODE = 'P0001';
  END IF;

  -- Score every item
  FOR v_item IN
    SELECT id, idx, format, correct_index, points, options_en,
           explanation_vi, explanation_en
    FROM mock_test_items
    WHERE material_id = p_material_id
    ORDER BY idx
  LOOP
    v_items_total := v_items_total + 1;
    v_total_points := v_total_points + v_item.points;
    v_user_answer := p_answers -> v_item.idx::text;

    IF v_user_answer IS NULL THEN
      v_is_correct := false;
    ELSIF v_item.format = 'fill_in_blank' THEN
      -- Compare normalized strings
      v_is_correct := lower(trim(both ' ' from coalesce(v_user_answer #>> '{}', '')))
                    = lower(trim(both ' ' from coalesce(v_item.options_en[v_item.correct_index + 1], '')));
    ELSE
      v_is_correct := (v_user_answer #>> '{}')::int = v_item.correct_index;
    END IF;

    IF v_is_correct THEN
      v_items_correct := v_items_correct + 1;
      v_earned_points := v_earned_points + v_item.points;
    END IF;

    v_per_item := v_per_item || jsonb_build_object(
      'idx',            v_item.idx,
      'correct',        v_is_correct,
      'explanation_vi', v_item.explanation_vi,
      'explanation_en', v_item.explanation_en
    );
  END LOOP;

  v_score_pct := CASE WHEN v_total_points > 0
                      THEN round(100.0 * v_earned_points / v_total_points)::int
                      ELSE 0 END;
  v_passed := v_score_pct >= v_material.min_completion_pct;

  -- Persist progress (no currency awards).
  -- Per clarification 2026-05-10: mock tests award zero gems and zero XP.
  INSERT INTO material_progress (
    user_id, material_id, started_at, last_activity_at,
    completed_at, completion_pct, score_pct, state, meta
  )
  VALUES (
    p_user_id,
    p_material_id,
    now(),
    now(),
    CASE WHEN v_passed THEN now() ELSE NULL END,
    CASE WHEN v_passed THEN 100 ELSE v_score_pct END,
    v_score_pct,
    CASE WHEN v_passed THEN 'completed' ELSE 'in_progress' END,
    jsonb_build_object('answers', p_answers)
  )
  ON CONFLICT (user_id, material_id) DO UPDATE
    SET last_activity_at = now(),
        score_pct        = GREATEST(material_progress.score_pct, EXCLUDED.score_pct),
        completion_pct   = GREATEST(material_progress.completion_pct, EXCLUDED.completion_pct),
        completed_at     = COALESCE(material_progress.completed_at, EXCLUDED.completed_at),
        state            = CASE WHEN material_progress.state = 'completed'
                                THEN 'completed' ELSE EXCLUDED.state END,
        meta             = material_progress.meta || jsonb_build_object('answers', p_answers);

  RETURN jsonb_build_object(
    'score_pct',     v_score_pct,
    'items_correct', v_items_correct,
    'items_total',   v_items_total,
    'passed',        v_passed,
    'per_item',      v_per_item
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grade_mock_test(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grade_mock_test(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.grade_mock_test IS
  'Server-side mock-test grading. Returns score and per-item explanations. Awards NO gems or XP (per 2026-05-10 clarification).';

-- ============================================================
-- 3. recommend_next_material
-- ============================================================
CREATE OR REPLACE FUNCTION public.recommend_next_material(
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_level material_level;
  v_result uuid;
BEGIN
  -- Heuristic CEFR level from completed materials; fallback to a1
  SELECT m.level INTO v_level
    FROM material_progress mp
    JOIN materials m ON m.id = mp.material_id
   WHERE mp.user_id = p_user_id
     AND mp.state = 'completed'
   ORDER BY mp.completed_at DESC
   LIMIT 1;

  v_level := COALESCE(v_level, 'a1');

  SELECT m.id INTO v_result
    FROM materials m
    LEFT JOIN material_progress mp
      ON mp.material_id = m.id AND mp.user_id = p_user_id
   WHERE m.status = 'published'
     AND m.level = v_level
     AND (mp.id IS NULL
          OR mp.last_activity_at < now() - interval '7 days')
     AND (mp.state IS NULL OR mp.state <> 'completed')
   ORDER BY m.popularity_score DESC, m.created_at DESC
   LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_next_material(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recommend_next_material(uuid) TO authenticated;

-- ============================================================
-- 4. compute_popularity_scores (nightly job)
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_popularity_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  WITH stats AS (
    SELECT
      m.id,
      COALESCE(SUM(CASE WHEN mp.state = 'completed'
                         AND mp.completed_at > now() - interval '30 days'
                        THEN 1 ELSE 0 END), 0) AS completions,
      COALESCE(SUM(CASE WHEN mp.started_at > now() - interval '30 days'
                        THEN 1 ELSE 0 END), 0) AS starts
    FROM materials m
    LEFT JOIN material_progress mp ON mp.material_id = m.id
    GROUP BY m.id
  )
  UPDATE materials m
  SET popularity_score = s.completions * 0.6 + s.starts * 0.3
  FROM stats s
  WHERE m.id = s.id;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_popularity_scores() FROM PUBLIC;
-- Only admins / cron job invoke this; no GRANT to authenticated.
