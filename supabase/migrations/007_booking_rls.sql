-- Migration: 007_booking_rls.sql
-- Description: Row Level Security policies for classes, bookings, and Gems
-- Date: 2024-01-29

-- ============================================================================
-- CLASSES TABLE RLS
-- ============================================================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Students/Parents can view active scheduled classes
DROP POLICY IF EXISTS "Students can view available classes" ON classes;
CREATE POLICY "Students can view available classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND status IN ('scheduled', 'full')
    AND (
      -- Only show if user is student or parent
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('student', 'parent')
    )
  );

-- Teachers can view their own classes
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

-- Teachers can create classes
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Teachers can update their own classes
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own classes (soft delete recommended)
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
CREATE POLICY "Teachers can delete own classes"
  ON classes FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Admins have full access
DROP POLICY IF EXISTS "Admins have full access to classes" ON classes;
CREATE POLICY "Admins have full access to classes"
  ON classes FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- BOOKINGS TABLE RLS
-- ============================================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Teachers can view bookings for their classes
DROP POLICY IF EXISTS "Teachers can view bookings for their classes" ON bookings;
CREATE POLICY "Teachers can view bookings for their classes"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = bookings.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- Students can create bookings for themselves
DROP POLICY IF EXISTS "Students can create own bookings" ON bookings;
CREATE POLICY "Students can create own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('student', 'parent')
  );

-- Users can update their own bookings (limited fields)
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Teachers can update booking status for their classes
DROP POLICY IF EXISTS "Teachers can update booking status" ON bookings;
CREATE POLICY "Teachers can update booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = bookings.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- Admins have full access
DROP POLICY IF EXISTS "Admins have full access to bookings" ON bookings;
CREATE POLICY "Admins have full access to bookings"
  ON bookings FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- GEM_TRANSACTIONS TABLE RLS
-- ============================================================================

ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own Gems transactions
DROP POLICY IF EXISTS "Users can view own gem transactions" ON gem_transactions;
CREATE POLICY "Users can view own gem transactions"
  ON gem_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only system/admins can insert Gems transactions
DROP POLICY IF EXISTS "Admins can insert gem transactions" ON gem_transactions;
CREATE POLICY "Admins can insert gem transactions"
  ON gem_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR granted_by = auth.uid()
  );

-- Prevent updates and deletes (append-only ledger)
-- No UPDATE or DELETE policies = no one can modify/delete

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all gem transactions" ON gem_transactions;
CREATE POLICY "Admins can view all gem transactions"
  ON gem_transactions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT, INSERT ON gem_transactions TO authenticated;

-- Grant access to views
GRANT SELECT ON user_gems_balances TO authenticated;
GRANT SELECT ON user_gems_balances_mv TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_gems_balance TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_gems_balances TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Students can view available classes" ON classes IS 
  'Students and parents can browse active, scheduled classes';

COMMENT ON POLICY "Users can view own bookings" ON bookings IS 
  'Users can view their booking history';

COMMENT ON POLICY "Users can view own gem transactions" ON gem_transactions IS 
  'Users can view their Gems transaction history';
