-- 102_student_free_features.sql
-- Tables for free student features:
--   1. saved_words        — bookmark vocabulary items
--   2. class_notes        — personal notes per booking
--   3. weekly_goals       — self-set weekly learning targets
--   4. learning_profiles  — onboarding quiz result + skill profile

-- ─── 1. saved_words ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_words (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_item_id uuid     NOT NULL REFERENCES public.vocabulary_items(id) ON DELETE CASCADE,
  material_id     uuid        REFERENCES public.materials(id) ON DELETE SET NULL,
  -- SRS fields (updated client-side via RPC)
  srs_due_date    date        NOT NULL DEFAULT CURRENT_DATE,
  srs_interval    integer     NOT NULL DEFAULT 1,   -- days until next review
  srs_ease        numeric(4,2) NOT NULL DEFAULT 2.5,
  times_reviewed  integer     NOT NULL DEFAULT 0,
  last_result     text        CHECK (last_result IN ('good','hard','again')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT saved_words_user_item_unique UNIQUE (user_id, vocabulary_item_id)
);

CREATE INDEX IF NOT EXISTS saved_words_user_due_idx
  ON public.saved_words (user_id, srs_due_date);

ALTER TABLE public.saved_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved words"
  ON public.saved_words FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RPC: toggle_saved_word — save or unsave, returns is_saved boolean
CREATE OR REPLACE FUNCTION public.toggle_saved_word(
  p_vocabulary_item_id uuid,
  p_material_id        uuid DEFAULT NULL
)
RETURNS TABLE (is_saved boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM saved_words WHERE user_id = v_uid AND vocabulary_item_id = p_vocabulary_item_id
  ) INTO v_exists;
  IF v_exists THEN
    DELETE FROM saved_words WHERE user_id = v_uid AND vocabulary_item_id = p_vocabulary_item_id;
    RETURN QUERY SELECT false;
  ELSE
    INSERT INTO saved_words (user_id, vocabulary_item_id, material_id)
    VALUES (v_uid, p_vocabulary_item_id, p_material_id)
    ON CONFLICT (user_id, vocabulary_item_id) DO NOTHING;
    RETURN QUERY SELECT true;
  END IF;
END;
$$;

-- RPC: get_my_saved_words — returns vocabulary items + save metadata, optionally due only
CREATE OR REPLACE FUNCTION public.get_my_saved_words(
  p_due_only boolean DEFAULT false
)
RETURNS TABLE (
  save_id             uuid,
  vocabulary_item_id  uuid,
  term                text,
  pos                 text,
  ipa                 text,
  vi_phonetic_hint    text,
  gloss_vi            text,
  gloss_en            text,
  example_en          text,
  example_vi          text,
  material_id         uuid,
  material_title      text,
  srs_due_date        date,
  srs_interval        integer,
  times_reviewed      integer,
  last_result         text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    sw.id,
    sw.vocabulary_item_id,
    vi.term,
    vi.pos,
    vi.ipa,
    vi.vi_phonetic_hint,
    vi.gloss_vi,
    vi.gloss_en,
    vi.example_en,
    vi.example_vi,
    sw.material_id,
    m.title AS material_title,
    sw.srs_due_date,
    sw.srs_interval,
    sw.times_reviewed,
    sw.last_result
  FROM saved_words sw
  JOIN vocabulary_items vi ON vi.id = sw.vocabulary_item_id
  LEFT JOIN materials m ON m.id = sw.material_id
  WHERE sw.user_id = auth.uid()
    AND (NOT p_due_only OR sw.srs_due_date <= CURRENT_DATE)
  ORDER BY sw.srs_due_date, vi.term;
$$;

-- RPC: review_saved_word — update SRS state after flashcard review
CREATE OR REPLACE FUNCTION public.review_saved_word(
  p_vocabulary_item_id uuid,
  p_result             text  -- 'good' | 'hard' | 'again'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_interval integer;
  v_ease     numeric(4,2);
  v_due      date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT srs_interval, srs_ease INTO v_interval, v_ease
  FROM saved_words WHERE user_id = v_uid AND vocabulary_item_id = p_vocabulary_item_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- SM-2 simplified
  IF p_result = 'again' THEN
    v_interval := 1;
    v_ease := GREATEST(1.3, v_ease - 0.2);
  ELSIF p_result = 'hard' THEN
    v_interval := GREATEST(1, ROUND(v_interval * 1.2));
    v_ease := GREATEST(1.3, v_ease - 0.15);
  ELSE -- good
    IF v_interval = 1 THEN v_interval := 3;
    ELSIF v_interval = 3 THEN v_interval := 7;
    ELSE v_interval := ROUND(v_interval * v_ease);
    END IF;
  END IF;

  v_due := CURRENT_DATE + v_interval;

  UPDATE saved_words SET
    srs_interval   = v_interval,
    srs_ease       = v_ease,
    srs_due_date   = v_due,
    times_reviewed = times_reviewed + 1,
    last_result    = p_result,
    updated_at     = now()
  WHERE user_id = v_uid AND vocabulary_item_id = p_vocabulary_item_id;
END;
$$;

-- ─── 2. class_notes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id  uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT class_notes_user_booking_unique UNIQUE (user_id, booking_id)
);

ALTER TABLE public.class_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own class notes"
  ON public.class_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RPC: upsert_class_note
CREATE OR REPLACE FUNCTION public.upsert_class_note(
  p_booking_id uuid,
  p_content    text
)
RETURNS TABLE (note_id uuid, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_ts  timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO class_notes (user_id, booking_id, content, updated_at)
  VALUES (v_uid, p_booking_id, p_content, now())
  ON CONFLICT (user_id, booking_id) DO UPDATE
    SET content = EXCLUDED.content, updated_at = now()
  RETURNING id, class_notes.updated_at INTO v_id, v_ts;
  RETURN QUERY SELECT v_id, v_ts;
END;
$$;

-- ─── 3. weekly_goals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start         date        NOT NULL,  -- Monday of the week
  target_sessions    integer     NOT NULL DEFAULT 3,
  target_vocab       integer     NOT NULL DEFAULT 20,
  target_streak_days integer     NOT NULL DEFAULT 5,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT weekly_goals_user_week_unique UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weekly goals"
  ON public.weekly_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RPC: upsert_weekly_goal
CREATE OR REPLACE FUNCTION public.upsert_weekly_goal(
  p_target_sessions    integer DEFAULT 3,
  p_target_vocab       integer DEFAULT 20,
  p_target_streak_days integer DEFAULT 5
)
RETURNS TABLE (goal_id uuid, week_start date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_week_start date := date_trunc('week', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_id         uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO weekly_goals (user_id, week_start, target_sessions, target_vocab, target_streak_days)
  VALUES (v_uid, v_week_start, p_target_sessions, p_target_vocab, p_target_streak_days)
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    target_sessions    = EXCLUDED.target_sessions,
    target_vocab       = EXCLUDED.target_vocab,
    target_streak_days = EXCLUDED.target_streak_days,
    updated_at         = now()
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_week_start;
END;
$$;

-- RPC: get_weekly_goal_progress — current week targets vs actuals
CREATE OR REPLACE FUNCTION public.get_weekly_goal_progress()
RETURNS TABLE (
  week_start           date,
  target_sessions      integer,
  target_vocab         integer,
  target_streak_days   integer,
  actual_sessions      bigint,
  actual_vocab         bigint,
  actual_streak_days   bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH
    v_uid AS (SELECT auth.uid() AS uid),
    week AS (SELECT date_trunc('week', CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS ws),
    goal AS (
      SELECT * FROM weekly_goals wg, week
      WHERE wg.user_id = (SELECT uid FROM v_uid) AND wg.week_start = week.ws
    ),
    sessions AS (
      SELECT COUNT(*) AS n FROM bookings b, week
      WHERE b.student_id = (SELECT uid FROM v_uid)
        AND b.status = 'completed'
        AND b.created_at >= week.ws
        AND b.created_at < week.ws + 7
    ),
    vocab AS (
      SELECT COUNT(*) AS n FROM saved_words sw, week
      WHERE sw.user_id = (SELECT uid FROM v_uid)
        AND sw.created_at >= week.ws
    ),
    streak AS (
      SELECT COUNT(*) AS n FROM daily_activity_log dal, week
      WHERE dal.user_id = (SELECT uid FROM v_uid)
        AND dal.activity_date >= week.ws
        AND dal.activity_date < week.ws + 7
    )
  SELECT
    COALESCE((SELECT week_start FROM goal), (SELECT ws FROM week)),
    COALESCE((SELECT target_sessions FROM goal), 3),
    COALESCE((SELECT target_vocab FROM goal), 20),
    COALESCE((SELECT target_streak_days FROM goal), 5),
    (SELECT n FROM sessions),
    (SELECT n FROM vocab),
    (SELECT n FROM streak);
$$;

-- ─── 4. learning_profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_profiles (
  user_id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Level: beginner / elementary / pre-intermediate / intermediate / upper-intermediate / advanced
  assessed_level   text        NOT NULL DEFAULT 'beginner',
  quiz_score       integer,        -- raw score 0–10 from onboarding quiz
  weak_areas       text[]      NOT NULL DEFAULT '{}',  -- e.g. ['grammar','vocabulary','pronunciation']
  focus_skills     text[]      NOT NULL DEFAULT '{}',  -- user-selected: ['speaking','reading','writing','listening']
  daily_goal_mins  integer     NOT NULL DEFAULT 15,
  quiz_taken_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning profile"
  ON public.learning_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RPC: save_learning_profile
CREATE OR REPLACE FUNCTION public.save_learning_profile(
  p_assessed_level  text,
  p_quiz_score      integer,
  p_weak_areas      text[],
  p_focus_skills    text[],
  p_daily_goal_mins integer DEFAULT 15
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO learning_profiles (user_id, assessed_level, quiz_score, weak_areas, focus_skills, daily_goal_mins, quiz_taken_at)
  VALUES (v_uid, p_assessed_level, p_quiz_score, p_weak_areas, p_focus_skills, p_daily_goal_mins, now())
  ON CONFLICT (user_id) DO UPDATE SET
    assessed_level  = EXCLUDED.assessed_level,
    quiz_score      = EXCLUDED.quiz_score,
    weak_areas      = EXCLUDED.weak_areas,
    focus_skills    = EXCLUDED.focus_skills,
    daily_goal_mins = EXCLUDED.daily_goal_mins,
    quiz_taken_at   = now(),
    updated_at      = now();
END;
$$;

-- RPC: get_my_progress_report — aggregate stats for the progress report page
CREATE OR REPLACE FUNCTION public.get_my_progress_report()
RETURNS TABLE (
  total_sessions_completed bigint,
  total_vocab_saved        bigint,
  total_vocab_reviewed     bigint,
  current_streak           integer,
  longest_streak           integer,
  current_level            text,
  total_xp                 bigint,
  active_days_30           bigint,
  materials_completed      bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (SELECT auth.uid() AS uid)
  SELECT
    (SELECT COUNT(*) FROM bookings b WHERE b.student_id = (SELECT uid FROM v) AND b.status = 'completed'),
    (SELECT COUNT(*) FROM saved_words sw WHERE sw.user_id = (SELECT uid FROM v)),
    (SELECT COUNT(*) FROM saved_words sw WHERE sw.user_id = (SELECT uid FROM v) AND sw.times_reviewed > 0),
    (SELECT current_streak FROM attendance_streaks WHERE student_id = (SELECT uid FROM v)),
    (SELECT longest_streak FROM attendance_streaks WHERE student_id = (SELECT uid FROM v)),
    (SELECT assessed_level FROM learning_profiles WHERE user_id = (SELECT uid FROM v)),
    (SELECT COALESCE(SUM(amount), 0) FROM xp_events WHERE user_id = (SELECT uid FROM v)),
    (SELECT COUNT(*) FROM daily_activity_log dal WHERE dal.user_id = (SELECT uid FROM v) AND dal.activity_date >= CURRENT_DATE - 30),
    (SELECT COUNT(*) FROM material_progress mp WHERE mp.user_id = (SELECT uid FROM v) AND mp.completed_at IS NOT NULL);
$$;
