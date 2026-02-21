-- Fix RLS Policies — resolve infinite recursion on profiles + all dependent tables
-- Root cause: policies used (SELECT role FROM profiles WHERE id = auth.uid())
-- which triggers the same RLS policies → infinite recursion → HTTP 500.
-- Fix: SECURITY DEFINER function get_my_role() bypasses RLS when reading current user's role.

-- ============================================================
-- STEP 1: Create SECURITY DEFINER helper (bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- ============================================================
-- STEP 2: Fix profiles policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view teacher profiles" ON profiles;
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Teachers can view student profiles"
  ON profiles FOR SELECT TO authenticated
  USING (role = 'student' AND public.get_my_role() IN ('teacher', 'admin'));

CREATE POLICY "Students can view teacher profiles"
  ON profiles FOR SELECT TO authenticated
  USING (role = 'teacher' AND public.get_my_role() IN ('student', 'parent', 'admin'));

CREATE POLICY "Parents can view children profiles"
  ON profiles FOR SELECT TO authenticated
  USING (role = 'student' AND public.get_my_role() = 'parent');

-- ============================================================
-- STEP 3: Fix bookings policies
-- ============================================================
DROP POLICY IF EXISTS "Admins have full access to bookings" ON bookings;
DROP POLICY IF EXISTS "Students can create bookings" ON bookings;
DROP POLICY IF EXISTS "Students can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;

CREATE POLICY "Admins have full access to bookings"
  ON bookings FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Students can create own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.get_my_role() IN ('student', 'parent'));

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'admin'
    OR EXISTS (SELECT 1 FROM classes WHERE classes.id = bookings.class_id AND classes.teacher_id = auth.uid())
  );

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR public.get_my_role() = 'admin');

-- ============================================================
-- STEP 4: Fix classes policies
-- ============================================================
DROP POLICY IF EXISTS "Admins have full access to classes" ON classes;
DROP POLICY IF EXISTS "Students can view available classes" ON classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update own classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;

CREATE POLICY "Admins have full access to classes"
  ON classes FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Students can view available classes"
  ON classes FOR SELECT TO authenticated
  USING (is_active = true AND status IN ('scheduled', 'full') AND public.get_my_role() IN ('student', 'parent'));

CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND public.get_my_role() IN ('teacher', 'admin'));

CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT TO authenticated
  USING (teacher_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (teacher_id = auth.uid() OR public.get_my_role() = 'admin');

CREATE POLICY "Teachers can delete own classes"
  ON classes FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.get_my_role() = 'admin');

-- ============================================================
-- STEP 5: Fix gem_transactions + audit log policies
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert gem transactions" ON gem_transactions;
DROP POLICY IF EXISTS "Admins can view all gem transactions" ON gem_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON gem_transactions;

CREATE POLICY "Admins can insert gem transactions"
  ON gem_transactions FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admins can view all gem transactions"
  ON gem_transactions FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Users can view own transactions"
  ON gem_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Users can view own audit logs" ON gem_transaction_audit_log;

CREATE POLICY "Users can view own audit logs"
  ON gem_transaction_audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

COMMENT ON FUNCTION public.get_my_role() IS 'SECURITY DEFINER: reads current user role bypassing RLS to prevent infinite recursion';
