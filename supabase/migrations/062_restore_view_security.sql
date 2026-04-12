-- Restore Security Barriers to fixed views to enable data access
-- Migration: 062_restore_view_security.sql
-- Task: Finalize system restoration by re-enabling view security

-- 1. Redefine security barriers for all repaired views
ALTER VIEW teacher_earnings_summary SET (security_barrier = true);
ALTER VIEW top_earning_teachers SET (security_barrier = true);
ALTER VIEW payout_summary SET (security_barrier = true);

-- 2. Verify and re-apply RLS Policies for the views if needed
-- (Supabase views with security_barrier = true respect RLS of underlying tables)
-- Adding explicit comments for clarity in the dashboard
COMMENT ON VIEW teacher_earnings_summary IS 'Restored with security_barrier=true to fix data visibility';
COMMENT ON VIEW top_earning_teachers IS 'Restored with security_barrier=true to fix data visibility';
COMMENT ON VIEW payout_summary IS 'Restored with security_barrier=true to fix data visibility';
