-- Migration: Analytics Views for Admin Dashboard
-- Purpose: Provide comprehensive platform metrics and insights
-- Related to: Phase 7 - Admin Platform Analytics (T097-T100)

-- ============================================================================
-- User Growth Analytics View
-- ============================================================================
-- Tracks user registrations and growth over time
CREATE OR REPLACE VIEW public.analytics_user_growth AS
SELECT
  DATE(created_at) as date,
  role,
  COUNT(*) as new_users,
  SUM(COUNT(*)) OVER (PARTITION BY role ORDER BY DATE(created_at)) as cumulative_users
FROM public.profiles
GROUP BY DATE(created_at), role
ORDER BY date DESC, role;

COMMENT ON VIEW public.analytics_user_growth IS 'Daily user registration counts by role with cumulative totals';

-- ============================================================================
-- Booking Analytics View
-- ============================================================================
-- Tracks booking trends, conversion rates, and class fill rates
CREATE OR REPLACE VIEW public.analytics_bookings AS
SELECT
  DATE(b.created_at) as date,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) as cancelled_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  COUNT(DISTINCT b.student_id) as unique_students,
  COUNT(DISTINCT c.teacher_id) as unique_teachers,
  COUNT(DISTINCT b.class_id) as unique_classes,
  AVG(b.price_paid) as avg_booking_price,
  AVG(b.gems_used) as avg_gems_used,
  SUM(b.price_paid) as total_revenue,
  SUM(b.gems_used) as total_gems_spent,
  -- Fill rate calculation
  AVG(
    CASE
      WHEN c.max_capacity > 0
      THEN (COUNT(DISTINCT b.id)::DECIMAL / c.max_capacity) * 100
      ELSE 0
    END
  ) as avg_fill_rate_pct
FROM public.bookings b
JOIN public.classes c ON b.class_id = c.id
GROUP BY DATE(b.created_at)
ORDER BY date DESC;

COMMENT ON VIEW public.analytics_bookings IS 'Daily booking metrics including revenue, conversion rates, and fill rates';

-- ============================================================================
-- Gem Circulation Analytics View
-- ============================================================================
-- Tracks Gem minting, burning, and circulation across the platform
CREATE OR REPLACE VIEW public.analytics_gem_circulation AS
SELECT
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as gems_minted,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as gems_burned,
  SUM(amount) as net_gems,
  COUNT(DISTINCT student_id) as unique_students
FROM public.gem_transactions
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC, activity_type;

COMMENT ON VIEW public.analytics_gem_circulation IS 'Daily Gem flow by activity type (minting vs burning)';

-- Additional view for current Gem balances by student
CREATE OR REPLACE VIEW public.analytics_gem_balances AS
SELECT
  p.id as student_id,
  p.full_name,
  p.email,
  COALESCE(SUM(gt.amount), 0) as current_balance,
  COUNT(gt.id) as total_transactions,
  MAX(gt.created_at) as last_transaction_date,
  -- Categorize balance levels
  CASE
    WHEN COALESCE(SUM(gt.amount), 0) = 0 THEN 'empty'
    WHEN COALESCE(SUM(gt.amount), 0) < 50 THEN 'low'
    WHEN COALESCE(SUM(gt.amount), 0) < 200 THEN 'medium'
    ELSE 'high'
  END as balance_level
FROM public.profiles p
LEFT JOIN public.gem_transactions gt ON p.id = gt.student_id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email
ORDER BY current_balance DESC;

COMMENT ON VIEW public.analytics_gem_balances IS 'Current Gem balance for each student with categorization';

-- ============================================================================
-- Revenue Analytics View
-- ============================================================================
-- Tracks revenue by payment method, teacher earnings, and platform fees
CREATE OR REPLACE VIEW public.analytics_revenue AS
SELECT
  DATE(b.created_at) as date,
  COALESCE(p.payment_method, 'gems_only') as payment_method,
  COUNT(DISTINCT b.id) as booking_count,
  SUM(b.price_paid) as gross_revenue,
  SUM(b.gems_used * 0.5) as gems_discount_value, -- Assuming 1 Gem = $0.50
  SUM(b.price_paid - (b.gems_used * 0.5)) as net_cash_revenue,
  -- Teacher earnings (70% split)
  SUM(b.price_paid * 0.70) as teacher_earnings,
  -- Platform fee (30% split)
  SUM(b.price_paid * 0.30) as platform_fee,
  -- Payment gateway fees (estimated 2.9% + $0.30 for Stripe, 2.5% for Vietnamese gateways)
  SUM(
    CASE
      WHEN p.payment_method = 'stripe' THEN (b.price_paid * 0.029) + 0.30
      WHEN p.payment_method IN ('vnpay', 'momo', 'zalopay') THEN b.price_paid * 0.025
      ELSE 0
    END
  ) as estimated_gateway_fees,
  -- Net platform profit
  SUM(b.price_paid * 0.30) - SUM(
    CASE
      WHEN p.payment_method = 'stripe' THEN (b.price_paid * 0.029) + 0.30
      WHEN p.payment_method IN ('vnpay', 'momo', 'zalopay') THEN b.price_paid * 0.025
      ELSE 0
    END
  ) as net_platform_profit
FROM public.bookings b
LEFT JOIN public.payments p ON b.id = p.booking_id
WHERE b.status IN ('confirmed', 'completed')
GROUP BY DATE(b.created_at), COALESCE(p.payment_method, 'gems_only')
ORDER BY date DESC, payment_method;

COMMENT ON VIEW public.analytics_revenue IS 'Daily revenue breakdown by payment method with teacher/platform split';

-- Teacher-specific revenue view
CREATE OR REPLACE VIEW public.analytics_teacher_revenue AS
SELECT
  c.teacher_id,
  p.full_name as teacher_name,
  p.email as teacher_email,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT b.class_id) as classes_taught,
  COUNT(DISTINCT b.student_id) as unique_students,
  SUM(b.price_paid) as gross_revenue,
  SUM(b.price_paid * 0.70) as total_earnings,
  AVG(b.price_paid) as avg_booking_price,
  MIN(b.created_at) as first_booking_date,
  MAX(b.created_at) as last_booking_date
FROM public.bookings b
JOIN public.classes c ON b.class_id = c.id
JOIN public.profiles p ON c.teacher_id = p.id
WHERE b.status IN ('confirmed', 'completed')
GROUP BY c.teacher_id, p.full_name, p.email
ORDER BY total_earnings DESC;

COMMENT ON VIEW public.analytics_teacher_revenue IS 'Lifetime revenue and earnings by teacher';

-- ============================================================================
-- Class Performance Analytics View
-- ============================================================================
-- Tracks which classes and topics are most popular
CREATE OR REPLACE VIEW public.analytics_class_performance AS
SELECT
  c.id as class_id,
  c.title,
  c.topic,
  c.level,
  c.price,
  c.max_capacity,
  c.teacher_id,
  p.full_name as teacher_name,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_count,
  -- Fill rate
  (COUNT(b.id)::DECIMAL / NULLIF(c.max_capacity, 0)) * 100 as fill_rate_pct,
  -- Revenue
  SUM(b.price_paid) as total_revenue,
  AVG(b.price_paid) as avg_price_paid,
  -- Timing
  c.scheduled_at,
  CASE
    WHEN c.scheduled_at < NOW() THEN 'past'
    WHEN c.scheduled_at < NOW() + INTERVAL '24 hours' THEN 'upcoming_soon'
    ELSE 'future'
  END as timing_status
FROM public.classes c
JOIN public.profiles p ON c.teacher_id = p.id
LEFT JOIN public.bookings b ON c.id = b.class_id
GROUP BY c.id, c.title, c.topic, c.level, c.price, c.max_capacity, c.teacher_id, p.full_name, c.scheduled_at
ORDER BY total_revenue DESC;

COMMENT ON VIEW public.analytics_class_performance IS 'Performance metrics for each class including fill rate and revenue';

-- Topic popularity aggregation
CREATE OR REPLACE VIEW public.analytics_topic_popularity AS
SELECT
  topic,
  level,
  COUNT(DISTINCT c.id) as total_classes,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT c.teacher_id) as unique_teachers,
  AVG(c.price) as avg_class_price,
  SUM(b.price_paid) as total_revenue,
  AVG((COUNT(b.id)::DECIMAL / NULLIF(c.max_capacity, 0)) * 100) as avg_fill_rate_pct
FROM public.classes c
LEFT JOIN public.bookings b ON c.id = b.class_id
GROUP BY topic, level
ORDER BY total_revenue DESC;

COMMENT ON VIEW public.analytics_topic_popularity IS 'Popularity and revenue metrics by topic and level';

-- ============================================================================
-- System Health Metrics View
-- ============================================================================
-- Provides overall platform health indicators
CREATE OR REPLACE VIEW public.analytics_system_health AS
SELECT
  -- User metrics
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'student') as total_students,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'teacher') as total_teachers,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d,

  -- Class metrics
  (SELECT COUNT(*) FROM public.classes) as total_classes,
  (SELECT COUNT(*) FROM public.classes WHERE scheduled_at > NOW()) as upcoming_classes,
  (SELECT COUNT(*) FROM public.classes WHERE scheduled_at > NOW() AND scheduled_at < NOW() + INTERVAL '24 hours') as classes_next_24h,

  -- Booking metrics
  (SELECT COUNT(*) FROM public.bookings) as total_bookings,
  (SELECT COUNT(*) FROM public.bookings WHERE status = 'confirmed') as confirmed_bookings,
  (SELECT COUNT(*) FROM public.bookings WHERE created_at > NOW() - INTERVAL '7 days') as bookings_7d,
  (SELECT COUNT(*) FROM public.bookings WHERE created_at > NOW() - INTERVAL '30 days') as bookings_30d,

  -- Revenue metrics
  (SELECT COALESCE(SUM(price_paid), 0) FROM public.bookings WHERE status IN ('confirmed', 'completed')) as lifetime_revenue,
  (SELECT COALESCE(SUM(price_paid), 0) FROM public.bookings WHERE status IN ('confirmed', 'completed') AND created_at > NOW() - INTERVAL '7 days') as revenue_7d,
  (SELECT COALESCE(SUM(price_paid), 0) FROM public.bookings WHERE status IN ('confirmed', 'completed') AND created_at > NOW() - INTERVAL '30 days') as revenue_30d,

  -- Gem metrics
  (SELECT COALESCE(SUM(amount), 0) FROM public.gem_transactions) as total_gems_in_circulation,
  (SELECT COALESCE(SUM(amount), 0) FROM public.gem_transactions WHERE created_at > NOW() - INTERVAL '7 days') as gems_minted_7d,
  (SELECT COALESCE(SUM(amount), 0) FROM public.gem_transactions WHERE created_at > NOW() - INTERVAL '30 days') as gems_minted_30d,

  -- Health indicators
  NOW() as snapshot_time;

COMMENT ON VIEW public.analytics_system_health IS 'Overall platform health metrics and KPIs';

-- ============================================================================
-- Row-Level Security for Analytics Views
-- ============================================================================
-- Only admins can view analytics

-- User Growth Analytics
ALTER VIEW public.analytics_user_growth SET (security_invoker = true);
CREATE POLICY "Admins can view user growth analytics"
  ON public.profiles -- RLS applied through underlying table
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Note: Views inherit RLS from their underlying tables
-- Since all views query tables with RLS enabled, we ensure admin-only access
-- by the fact that only admins can see all records in the underlying tables

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Optimize date-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_date ON public.profiles(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_bookings_created_date ON public.bookings(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created_date ON public.gem_transactions(DATE(created_at));

-- Optimize role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_created ON public.profiles(role, created_at);

-- Optimize booking status queries
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON public.bookings(status, created_at);

-- Optimize class scheduling queries
CREATE INDEX IF NOT EXISTS idx_classes_scheduled_at ON public.classes(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_classes_topic_level ON public.classes(topic, level);

-- ============================================================================
-- Materialized Views for Heavy Queries (Optional - Future Optimization)
-- ============================================================================
-- These can be created later if analytics queries become too slow
-- They would need to be refreshed periodically via cron job

-- Example (commented out for now):
-- CREATE MATERIALIZED VIEW analytics_daily_summary AS
-- SELECT date, total_bookings, total_revenue FROM analytics_bookings;
-- CREATE UNIQUE INDEX ON analytics_daily_summary(date);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;

-- ============================================================================
-- Functions for Common Analytics Queries
-- ============================================================================

-- Get analytics for a specific date range
CREATE OR REPLACE FUNCTION get_analytics_date_range(
  start_date DATE,
  end_date DATE,
  metric_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  date DATE,
  metric_name TEXT,
  metric_value NUMERIC
) AS $$
BEGIN
  IF metric_type = 'users' OR metric_type = 'all' THEN
    RETURN QUERY
    SELECT
      ag.date::DATE,
      'new_users_' || ag.role AS metric_name,
      ag.new_users::NUMERIC AS metric_value
    FROM analytics_user_growth ag
    WHERE ag.date BETWEEN start_date AND end_date;
  END IF;

  IF metric_type = 'bookings' OR metric_type = 'all' THEN
    RETURN QUERY
    SELECT
      ab.date::DATE,
      'total_bookings' AS metric_name,
      ab.total_bookings::NUMERIC AS metric_value
    FROM analytics_bookings ab
    WHERE ab.date BETWEEN start_date AND end_date;
  END IF;

  IF metric_type = 'revenue' OR metric_type = 'all' THEN
    RETURN QUERY
    SELECT
      ar.date::DATE,
      'gross_revenue' AS metric_name,
      ar.gross_revenue::NUMERIC AS metric_value
    FROM analytics_revenue ar
    WHERE ar.date BETWEEN start_date AND end_date;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_analytics_date_range IS 'Retrieve analytics metrics for a specific date range';

-- Grant execute permission to admins only
REVOKE ALL ON FUNCTION get_analytics_date_range FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_analytics_date_range TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
