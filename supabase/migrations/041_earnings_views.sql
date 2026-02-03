-- ============================================================================
-- Migration: Earnings Aggregation Views
-- Task: T205 - Create earnings aggregation view
-- ============================================================================
-- This migration creates views for teacher earnings analytics and reporting
-- ============================================================================

-- ============================================================================
-- Teacher Earnings Summary View
-- ============================================================================

CREATE OR REPLACE VIEW teacher_earnings_summary AS
SELECT
  te.teacher_id,
  p.full_name as teacher_name,
  p.email as teacher_email,

  -- Total counts
  COUNT(*) as total_classes,
  COUNT(CASE WHEN te.status = 'earned' THEN 1 END) as classes_earned,
  COUNT(CASE WHEN te.status = 'paid' THEN 1 END) as classes_paid,
  COUNT(CASE WHEN te.status = 'pending' THEN 1 END) as classes_pending,
  COUNT(CASE WHEN te.status = 'cancelled' THEN 1 END) as classes_cancelled,

  -- Revenue totals
  COALESCE(SUM(te.final_price), 0) as total_revenue,
  COALESCE(SUM(te.teacher_share), 0) as total_teacher_share,
  COALESCE(SUM(te.platform_fee), 0) as total_platform_fee,

  -- Earned (available for payout)
  COALESCE(SUM(CASE WHEN te.status = 'earned' THEN te.teacher_share ELSE 0 END), 0) as available_for_payout,

  -- Paid out
  COALESCE(SUM(CASE WHEN te.status = 'paid' THEN te.teacher_share ELSE 0 END), 0) as total_paid_out,

  -- Pending (not yet earned)
  COALESCE(SUM(CASE WHEN te.status = 'pending' THEN te.teacher_share ELSE 0 END), 0) as pending_earnings,

  -- Processing (in payout request)
  COALESCE(SUM(CASE WHEN te.status = 'processing' THEN te.teacher_share ELSE 0 END), 0) as processing_earnings,

  -- Averages
  COALESCE(AVG(CASE WHEN te.status IN ('earned', 'paid', 'processing') THEN te.teacher_share END), 0) as avg_earning_per_class,
  COALESCE(AVG(CASE WHEN te.status IN ('earned', 'paid', 'processing') THEN te.final_price END), 0) as avg_class_price,

  -- Dates
  MIN(te.created_at) as first_earning_date,
  MAX(te.earned_at) as last_earning_date,
  MAX(te.paid_at) as last_payout_date

FROM teacher_earnings te
LEFT JOIN profiles p ON p.user_id = te.teacher_id
GROUP BY te.teacher_id, p.full_name, p.email;

-- ============================================================================
-- Monthly Earnings View
-- ============================================================================

CREATE OR REPLACE VIEW teacher_monthly_earnings AS
SELECT
  te.teacher_id,
  DATE_TRUNC('month', te.earned_at) as month,
  TO_CHAR(te.earned_at, 'YYYY-MM') as month_label,

  -- Counts
  COUNT(*) as classes_completed,
  COUNT(CASE WHEN te.status = 'paid' THEN 1 END) as classes_paid,

  -- Revenue
  COALESCE(SUM(te.final_price), 0) as total_revenue,
  COALESCE(SUM(te.teacher_share), 0) as total_earnings,
  COALESCE(SUM(CASE WHEN te.status = 'paid' THEN te.teacher_share ELSE 0 END), 0) as paid_amount,
  COALESCE(SUM(CASE WHEN te.status IN ('earned', 'processing') THEN te.teacher_share ELSE 0 END), 0) as unpaid_amount,

  -- Averages
  COALESCE(AVG(te.teacher_share), 0) as avg_earning_per_class,

  -- Students
  COUNT(DISTINCT te.student_id) as unique_students

FROM teacher_earnings te
WHERE te.earned_at IS NOT NULL
GROUP BY te.teacher_id, DATE_TRUNC('month', te.earned_at), TO_CHAR(te.earned_at, 'YYYY-MM');

-- ============================================================================
-- Daily Earnings View
-- ============================================================================

CREATE OR REPLACE VIEW teacher_daily_earnings AS
SELECT
  te.teacher_id,
  DATE(te.earned_at) as date,
  TO_CHAR(te.earned_at, 'YYYY-MM-DD') as date_label,

  -- Counts
  COUNT(*) as classes_completed,

  -- Revenue
  COALESCE(SUM(te.final_price), 0) as daily_revenue,
  COALESCE(SUM(te.teacher_share), 0) as daily_earnings,
  COALESCE(AVG(te.teacher_share), 0) as avg_earning_per_class,

  -- Students
  COUNT(DISTINCT te.student_id) as unique_students

FROM teacher_earnings te
WHERE te.earned_at IS NOT NULL
GROUP BY te.teacher_id, DATE(te.earned_at), TO_CHAR(te.earned_at, 'YYYY-MM-DD');

-- ============================================================================
-- Platform Revenue View (Admin)
-- ============================================================================

CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT
  DATE_TRUNC('month', te.earned_at) as month,
  TO_CHAR(te.earned_at, 'YYYY-MM') as month_label,

  -- Counts
  COUNT(*) as total_classes,
  COUNT(DISTINCT te.teacher_id) as active_teachers,
  COUNT(DISTINCT te.student_id) as active_students,

  -- Revenue breakdown
  COALESCE(SUM(te.final_price), 0) as total_revenue,
  COALESCE(SUM(te.teacher_share), 0) as teacher_payments,
  COALESCE(SUM(te.platform_fee), 0) as platform_revenue,

  -- Gems impact
  COALESCE(SUM(te.gems_discount), 0) as total_gems_discounts,
  COALESCE(AVG(te.gems_discount), 0) as avg_gems_discount,

  -- Averages
  COALESCE(AVG(te.final_price), 0) as avg_transaction_value

FROM teacher_earnings te
WHERE te.earned_at IS NOT NULL
  AND te.status != 'cancelled'
GROUP BY DATE_TRUNC('month', te.earned_at), TO_CHAR(te.earned_at, 'YYYY-MM');

-- ============================================================================
-- Payout Summary View
-- ============================================================================

CREATE OR REPLACE VIEW payout_summary AS
SELECT
  pr.id as payout_request_id,
  pr.teacher_id,
  p.full_name as teacher_name,
  pr.amount as requested_amount,
  pr.status as payout_status,
  pr.created_at as requested_at,
  pr.processed_at,

  -- Earnings included in payout
  COUNT(te.id) as earnings_count,
  COALESCE(SUM(te.teacher_share), 0) as total_earnings,

  -- Verification
  COALESCE(SUM(te.teacher_share), 0) = pr.amount as amount_matches

FROM payout_requests pr
LEFT JOIN teacher_earnings te ON te.payout_request_id = pr.id
LEFT JOIN profiles p ON p.user_id = pr.teacher_id
GROUP BY pr.id, pr.teacher_id, p.full_name, pr.amount, pr.status, pr.created_at, pr.processed_at;

-- ============================================================================
-- Top Earning Teachers View
-- ============================================================================

CREATE OR REPLACE VIEW top_earning_teachers AS
SELECT
  te.teacher_id,
  p.full_name as teacher_name,
  COUNT(*) as classes_taught,
  COALESCE(SUM(te.teacher_share), 0) as total_earnings,
  COALESCE(AVG(te.teacher_share), 0) as avg_earning_per_class,
  COUNT(DISTINCT te.student_id) as unique_students,
  MAX(te.earned_at) as last_class_date

FROM teacher_earnings te
LEFT JOIN profiles p ON p.user_id = te.teacher_id
WHERE te.status IN ('earned', 'paid', 'processing')
GROUP BY te.teacher_id, p.full_name
ORDER BY total_earnings DESC;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON VIEW teacher_earnings_summary IS
  'Summary of all earnings for each teacher';

COMMENT ON VIEW teacher_monthly_earnings IS
  'Monthly earnings breakdown per teacher';

COMMENT ON VIEW teacher_daily_earnings IS
  'Daily earnings breakdown per teacher';

COMMENT ON VIEW platform_revenue_summary IS
  'Platform-wide revenue analytics by month';

COMMENT ON VIEW payout_summary IS
  'Summary of payout requests with earnings breakdown';

COMMENT ON VIEW top_earning_teachers IS
  'Ranking of teachers by total earnings';

-- ============================================================================
-- RLS for Views
-- ============================================================================

-- Teachers can view their own summary
ALTER VIEW teacher_earnings_summary SET (security_barrier = true);
ALTER VIEW teacher_monthly_earnings SET (security_barrier = true);
ALTER VIEW teacher_daily_earnings SET (security_barrier = true);

-- Admin-only views
ALTER VIEW platform_revenue_summary SET (security_barrier = true);
ALTER VIEW payout_summary SET (security_barrier = true);
ALTER VIEW top_earning_teachers SET (security_barrier = true);

-- ============================================================================
-- Usage Examples
-- ============================================================================

/*
-- Get teacher's earnings summary:
SELECT *
FROM teacher_earnings_summary
WHERE teacher_id = auth.uid();

-- Get teacher's monthly breakdown:
SELECT *
FROM teacher_monthly_earnings
WHERE teacher_id = auth.uid()
ORDER BY month DESC
LIMIT 12;

-- Get available balance for payout:
SELECT available_for_payout
FROM teacher_earnings_summary
WHERE teacher_id = auth.uid();

-- Admin: View platform revenue:
SELECT *
FROM platform_revenue_summary
ORDER BY month DESC;

-- Admin: View top teachers:
SELECT *
FROM top_earning_teachers
LIMIT 10;

-- Admin: Verify payout amounts:
SELECT *
FROM payout_summary
WHERE payout_status = 'pending'
  AND amount_matches = true;

-- Teacher's earnings this month:
SELECT
  month_label,
  classes_completed,
  total_earnings,
  paid_amount,
  unpaid_amount
FROM teacher_monthly_earnings
WHERE teacher_id = auth.uid()
  AND month = DATE_TRUNC('month', NOW());
*/
