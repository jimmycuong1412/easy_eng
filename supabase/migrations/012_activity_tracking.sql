-- Migration 012: Enhanced Activity Tracking and Analytics
-- Purpose: Additional views and functions for activity analytics
-- Note: Core activity_tracking table created in 011_activity_rules.sql

-- =====================================================
-- 1. Activity Summary View
-- =====================================================

CREATE OR REPLACE VIEW activity_summary AS
SELECT
  student_id,
  activity_type,
  COUNT(*) AS total_activities,
  SUM(gems_awarded) AS total_gems_earned,
  MAX(created_at) AS last_activity_at,
  MIN(created_at) AS first_activity_at
FROM activity_tracking
GROUP BY student_id, activity_type;

COMMENT ON VIEW activity_summary IS 'Summarizes student activities and gem earnings by activity type';

-- =====================================================
-- 2. Daily Activity Stats View
-- =====================================================

CREATE OR REPLACE VIEW daily_activity_stats AS
SELECT
  DATE(created_at) AS activity_date,
  activity_type,
  COUNT(DISTINCT student_id) AS unique_students,
  COUNT(*) AS total_activities,
  SUM(gems_awarded) AS total_gems_awarded,
  AVG(gems_awarded) AS avg_gems_per_activity
FROM activity_tracking
GROUP BY DATE(created_at), activity_type
ORDER BY activity_date DESC, activity_type;

COMMENT ON VIEW daily_activity_stats IS 'Daily aggregated activity statistics for platform analytics';

-- =====================================================
-- 3. Function: Get Student Activity History
-- =====================================================

CREATE OR REPLACE FUNCTION get_student_activity_history(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  activity_metadata JSONB,
  gems_awarded INTEGER,
  created_at TIMESTAMPTZ,
  gem_transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is the student or an admin
  IF auth.uid() != p_student_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to activity history';
  END IF;

  RETURN QUERY
  SELECT
    at.id,
    at.activity_type,
    at.activity_metadata,
    at.gems_awarded,
    at.created_at,
    at.gem_transaction_id
  FROM activity_tracking at
  WHERE at.student_id = p_student_id
  ORDER BY at.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_student_activity_history IS 'Retrieves paginated activity history for a student';

-- =====================================================
-- 4. Function: Get Top Activities by Gems Earned
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_gem_earning_activities(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  activity_type TEXT,
  activity_count INTEGER,
  total_gems_earned INTEGER,
  avg_gems_per_activity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    at.activity_type,
    COUNT(*)::INTEGER AS activity_count,
    SUM(at.gems_awarded)::INTEGER AS total_gems_earned,
    ROUND(AVG(at.gems_awarded), 2) AS avg_gems_per_activity
  FROM activity_tracking at
  WHERE at.student_id = p_student_id
  AND at.gems_awarded > 0
  GROUP BY at.activity_type
  ORDER BY total_gems_earned DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_top_gem_earning_activities IS 'Returns top activities that have earned the most gems for a student';

-- =====================================================
-- 5. Function: Get Recent Activity Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_activity_stats(
  p_student_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  total_activities INTEGER,
  total_gems_earned INTEGER,
  unique_activity_types INTEGER,
  most_common_activity TEXT,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_most_common TEXT;
BEGIN
  -- Get most common activity type
  SELECT activity_type INTO v_most_common
  FROM activity_tracking
  WHERE student_id = p_student_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY activity_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_activities,
    COALESCE(SUM(gems_awarded), 0)::INTEGER AS total_gems_earned,
    COUNT(DISTINCT activity_type)::INTEGER AS unique_activity_types,
    v_most_common AS most_common_activity,
    MAX(created_at) AS last_activity_at
  FROM activity_tracking
  WHERE student_id = p_student_id
  AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION get_recent_activity_stats IS 'Returns aggregated activity statistics for recent period';

-- =====================================================
-- 6. RLS Policies for Views
-- =====================================================

-- Note: Views inherit RLS from underlying tables
-- Additional grants for authenticated users

GRANT SELECT ON activity_summary TO authenticated;
GRANT SELECT ON daily_activity_stats TO authenticated;

-- Admins can see all stats
CREATE POLICY "Admins can view all activity stats"
  ON activity_summary
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can only see their own summary
CREATE POLICY "Students can view own activity summary"
  ON activity_summary
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
  );

-- =====================================================
-- 7. Indexes for Performance
-- =====================================================

-- Additional index for date-based queries
CREATE INDEX IF NOT EXISTS idx_activity_tracking_date
  ON activity_tracking(DATE(created_at), activity_type);

-- Index for gems awarded queries
CREATE INDEX IF NOT EXISTS idx_activity_tracking_gems
  ON activity_tracking(student_id, gems_awarded)
  WHERE gems_awarded > 0;

-- =====================================================
-- 8. Analytics Function for Admins
-- =====================================================

CREATE OR REPLACE FUNCTION get_platform_activity_analytics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  activity_type TEXT,
  total_occurrences BIGINT,
  unique_students BIGINT,
  total_gems_awarded BIGINT,
  avg_gems_per_occurrence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    at.activity_type,
    COUNT(*) AS total_occurrences,
    COUNT(DISTINCT at.student_id) AS unique_students,
    SUM(at.gems_awarded) AS total_gems_awarded,
    ROUND(AVG(at.gems_awarded), 2) AS avg_gems_per_occurrence
  FROM activity_tracking at
  WHERE at.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY at.activity_type
  ORDER BY total_occurrences DESC;
END;
$$;

COMMENT ON FUNCTION get_platform_activity_analytics IS 'Platform-wide activity analytics for admins';

-- =====================================================
-- End of Migration 012
-- =====================================================
