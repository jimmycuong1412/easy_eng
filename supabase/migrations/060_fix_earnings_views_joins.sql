-- Fix broken joins in earnings views (profiles table uses 'id' as PK)
-- Migration: 060_fix_earnings_views_joins.sql
-- Task: Restore system stability and fix Status 500 errors

-- 1. Redefine teacher_earnings_summary
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
LEFT JOIN profiles p ON p.id = te.teacher_id
GROUP BY te.teacher_id, p.full_name, p.email;

-- 2. Redefine payout_summary
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
LEFT JOIN profiles p ON p.id = pr.teacher_id
GROUP BY pr.id, pr.teacher_id, p.full_name, pr.amount, pr.status, pr.created_at, pr.processed_at;

-- 3. Redefine top_earning_teachers
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
LEFT JOIN profiles p ON p.id = te.teacher_id
WHERE te.status IN ('earned', 'paid', 'processing')
GROUP BY te.teacher_id, p.full_name
ORDER BY total_earnings DESC;
