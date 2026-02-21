-- Migration 029: Student Levels View
-- Task: T146 - Create student_levels view for easy access to level progression
-- Purpose: Materialized view aggregating student level, XP, and progress
-- Date: 2026-02-05

-- ============================================================================
-- STUDENT LEVELS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW student_levels AS
SELECT
  sc.id AS career_id,
  sc.student_id,
  sc.career_path_id,
  cp.name AS career_name,
  cp.slug AS career_slug,

  -- Current progression
  sc.current_level,
  sc.current_xp,
  sc.xp_to_next_level,

  -- Progress percentage to next level
  ROUND(
    (sc.current_xp::DECIMAL / NULLIF(sc.xp_to_next_level, 0)::DECIMAL) * 100,
    2
  ) AS progress_percent,

  -- Total progression
  sc.total_xp_earned,
  sc.total_levels_gained,

  -- Character stats
  sc.health,
  sc.mana,
  sc.strength,
  sc.intelligence,
  sc.creativity,
  sc.charisma,

  -- Character info
  sc.character_name,
  sc.current_sprite_url,

  -- Status
  sc.is_active,
  sc.selected_at,
  sc.last_level_up_at,

  -- Career path info
  cp.max_level,
  cp.xp_multiplier,
  cp.primary_color,
  cp.secondary_color,

  -- Calculated fields
  (cp.max_level - sc.current_level) AS levels_to_max,
  CASE
    WHEN sc.current_level >= cp.max_level THEN true
    ELSE false
  END AS is_max_level,

  -- Time stats
  CASE
    WHEN sc.last_level_up_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (NOW() - sc.last_level_up_at)) / 86400
    ELSE NULL
  END AS days_since_level_up,

  EXTRACT(EPOCH FROM (NOW() - sc.selected_at)) / 86400 AS days_in_career

FROM student_careers sc
INNER JOIN career_paths cp ON sc.career_path_id = cp.id
WHERE sc.is_active = true;

-- ============================================================================
-- LEADERBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW level_leaderboard AS
SELECT
  sl.student_id,
  p.display_name,
  p.avatar_url,
  sl.career_name,
  sl.career_slug,
  sl.current_level,
  sl.total_xp_earned,
  sl.total_levels_gained,
  sl.progress_percent,

  -- Rank by level and XP
  RANK() OVER (
    PARTITION BY sl.career_path_id
    ORDER BY sl.current_level DESC, sl.total_xp_earned DESC
  ) AS career_rank,

  RANK() OVER (
    ORDER BY sl.current_level DESC, sl.total_xp_earned DESC
  ) AS global_rank,

  sl.selected_at,
  sl.last_level_up_at

FROM student_levels sl
INNER JOIN profiles p ON sl.student_id = p.id
WHERE sl.is_active = true
ORDER BY global_rank ASC;

-- ============================================================================
-- XP ACTIVITY SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW xp_activity_summary AS
SELECT
  student_id,
  activity_type,
  COUNT(*) AS activity_count,
  SUM(xp_amount) AS total_xp_earned,
  AVG(xp_amount) AS avg_xp_per_activity,
  MAX(xp_amount) AS max_xp_earned,
  MIN(created_at) AS first_activity,
  MAX(created_at) AS last_activity,
  COUNT(*) FILTER (WHERE caused_level_up = true) AS level_ups_caused
FROM xp_transactions
GROUP BY student_id, activity_type;

-- ============================================================================
-- LEVEL UP HISTORY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW level_up_history AS
SELECT
  xt.id AS transaction_id,
  xt.student_id,
  sl.career_name,
  xt.level_before,
  xt.level_after,
  (xt.level_after - xt.level_before) AS levels_gained,
  xt.xp_amount,
  xt.activity_type,
  xt.activity_description,
  xt.created_at AS leveled_up_at,
  p.display_name AS student_name
FROM xp_transactions xt
INNER JOIN student_levels sl ON xt.career_id = sl.career_id
INNER JOIN profiles p ON xt.student_id = p.id
WHERE xt.caused_level_up = true
ORDER BY xt.created_at DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current level for student
CREATE OR REPLACE FUNCTION get_student_level(p_student_id UUID)
RETURNS TABLE (
  career_name TEXT,
  current_level INTEGER,
  current_xp INTEGER,
  xp_to_next_level INTEGER,
  progress_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.career_name::TEXT,
    sl.current_level,
    sl.current_xp,
    sl.xp_to_next_level,
    sl.progress_percent
  FROM student_levels sl
  WHERE sl.student_id = p_student_id
    AND sl.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get student's rank in career
CREATE OR REPLACE FUNCTION get_student_rank(p_student_id UUID)
RETURNS TABLE (
  career_rank BIGINT,
  global_rank BIGINT,
  total_students BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lb.career_rank,
    lb.global_rank,
    (SELECT COUNT(DISTINCT student_id) FROM student_levels WHERE is_active = true) AS total_students
  FROM level_leaderboard lb
  WHERE lb.student_id = p_student_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get top students by level
CREATE OR REPLACE FUNCTION get_top_students(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  student_id UUID,
  display_name TEXT,
  career_name TEXT,
  current_level INTEGER,
  total_xp BIGINT,
  global_rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lb.student_id,
    lb.display_name::TEXT,
    lb.career_name::TEXT,
    lb.current_level,
    lb.total_xp_earned,
    lb.global_rank
  FROM level_leaderboard lb
  ORDER BY lb.global_rank ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ROW LEVEL SECURITY (Views inherit from base tables)
-- ============================================================================

-- Views automatically inherit RLS from underlying tables
-- No explicit RLS needed for views

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON student_levels TO authenticated;
GRANT SELECT ON level_leaderboard TO authenticated;
GRANT SELECT ON xp_activity_summary TO authenticated;
GRANT SELECT ON level_up_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_level TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_rank TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_students TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW student_levels IS 'Comprehensive view of student level progression with career details';
COMMENT ON VIEW level_leaderboard IS 'Leaderboard ranking students by level and XP (career and global)';
COMMENT ON VIEW xp_activity_summary IS 'Summary of XP earned by activity type per student';
COMMENT ON VIEW level_up_history IS 'Historical record of all level-up events';
COMMENT ON FUNCTION get_student_level IS 'Get current level and progress for a student';
COMMENT ON FUNCTION get_student_rank IS 'Get student''s rank in career and globally';
COMMENT ON FUNCTION get_top_students IS 'Get top N students by level and XP';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Student Levels Views Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Views:';
  RAISE NOTICE '  • student_levels (current progression)';
  RAISE NOTICE '  • level_leaderboard (rankings)';
  RAISE NOTICE '  • xp_activity_summary (activity stats)';
  RAISE NOTICE '  • level_up_history (event log)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Functions:';
  RAISE NOTICE '  • get_student_level()';
  RAISE NOTICE '  • get_student_rank()';
  RAISE NOTICE '  • get_top_students()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Purpose: Easy querying of level/XP data';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Create award-xp Edge Function';
  RAISE NOTICE '========================================';
END $$;
