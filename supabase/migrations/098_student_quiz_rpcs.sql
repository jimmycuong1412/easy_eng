-- ============================================================================
-- 098: Student quiz RPCs (Growth Plan — Phase 3.2)
-- ============================================================================
-- list_quizzes / get_quiz_for_play (no answer leak) / submit_quiz (server-side
-- grading, gems on first pass, records streak). correct_answer is the option
-- INDEX as text. Applied to production 2026-06-14 via MCP.

CREATE OR REPLACE FUNCTION public.list_quizzes()
RETURNS TABLE (id uuid, title text, description text, difficulty text,
  question_count int, passing_score int, time_limit_minutes int,
  best_score int, attempts int, passed boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid)
  SELECT q.id, q.title, q.description, q.difficulty,
    (SELECT count(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id),
    q.passing_score, q.time_limit_minutes,
    COALESCE((SELECT max(a.score) FROM quiz_attempts a, me WHERE a.quiz_id = q.id AND a.student_id = me.uid), 0)::int,
    COALESCE((SELECT count(*) FROM quiz_attempts a, me WHERE a.quiz_id = q.id AND a.student_id = me.uid), 0)::int,
    COALESCE((SELECT bool_or(a.passed) FROM quiz_attempts a, me WHERE a.quiz_id = q.id AND a.student_id = me.uid), false)
  FROM quizzes q WHERE q.is_active = true ORDER BY q.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_quizzes() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quiz_for_play(p_quiz_id uuid)
RETURNS TABLE (quiz_id uuid, title text, description text, instructions text,
  passing_score int, time_limit_minutes int,
  question_id uuid, question_text text, question_type text, options jsonb, points int, order_index int)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.title, q.description, q.instructions, q.passing_score, q.time_limit_minutes,
         qq.id, qq.question_text, qq.question_type, qq.options, qq.points, qq.order_index
  FROM quizzes q JOIN quiz_questions qq ON qq.quiz_id = q.id
  WHERE q.id = p_quiz_id AND q.is_active = true ORDER BY qq.order_index;
$$;
GRANT EXECUTE ON FUNCTION public.get_quiz_for_play(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz(p_quiz_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total int := 0; v_earned int := 0; v_qn int := 0; v_correct int := 0;
  v_pass int; v_score int; v_passed boolean; v_gems int := 0; v_already_passed boolean; r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No user'; END IF;
  SELECT passing_score INTO v_pass FROM quizzes WHERE id = p_quiz_id AND is_active = true;
  IF v_pass IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'quiz_not_found'); END IF;

  FOR r IN SELECT id, correct_answer, points FROM quiz_questions WHERE quiz_id = p_quiz_id LOOP
    v_qn := v_qn + 1; v_total := v_total + COALESCE(r.points, 1);
    IF lower(trim(COALESCE(p_answers->>r.id::text, ''))) = lower(trim(COALESCE(r.correct_answer, ''))) THEN
      v_earned := v_earned + COALESCE(r.points, 1); v_correct := v_correct + 1;
    END IF;
  END LOOP;

  v_score := CASE WHEN v_total > 0 THEN ROUND(v_earned::numeric / v_total * 100)::int ELSE 0 END;
  v_passed := v_score >= v_pass;
  SELECT bool_or(passed) INTO v_already_passed FROM quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = v_uid;

  IF v_passed AND COALESCE(v_already_passed, false) = false THEN
    v_gems := 10;
    INSERT INTO gem_transactions (user_id, amount, transaction_type, description)
    VALUES (v_uid, v_gems, 'quiz_completion', 'Hoàn thành quiz đạt yêu cầu');
  END IF;

  INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, total_points, earned_points, passed, gems_awarded, completed_at, attempt_number)
  VALUES (p_quiz_id, v_uid, p_answers, v_score, v_total, v_earned, v_passed, v_gems, now(),
          1 + COALESCE((SELECT count(*) FROM quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = v_uid), 0));

  PERFORM record_daily_activity(v_uid);
  RETURN jsonb_build_object('ok', true, 'score', v_score, 'passed', v_passed,
    'correct', v_correct, 'total_questions', v_qn, 'gems_awarded', v_gems);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_quiz(uuid, jsonb) TO authenticated;
