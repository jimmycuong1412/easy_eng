-- Migration 003: Row Level Security Policies
-- Implements RLS for profiles table

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy: Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy: Teachers can view student profiles (for their classes)
-- Note: This will be refined when we add classes/bookings tables
CREATE POLICY "Teachers can view student profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('teacher', 'admin')
    )
  );

-- Policy: Students can view teacher profiles
CREATE POLICY "Students can view teacher profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'teacher'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('student', 'parent', 'admin')
    )
  );

-- Policy: Parents can view their children's profiles
-- Note: This will be implemented when we add parent-child relationships
CREATE POLICY "Parents can view children profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'parent'
    )
    -- TODO: Add parent_children table relationship check
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Allow users to view their own profile data';
COMMENT ON POLICY "Users can update own profile" ON profiles IS 'Allow users to update their own profile data';
COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 'Allow admins to view all user profiles';
