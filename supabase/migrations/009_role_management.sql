-- Migration 009: Role Management Functions
-- Purpose: Add helper functions for role management and validation
-- Date: 2026-01-31

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_user_id UUID, p_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role = p_role
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_role IS 'Check if a user has a specific role';

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = p_user_id
  AND is_active = true;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role IS 'Get the role of a specific user';

-- Function to check if current user has role
CREATE OR REPLACE FUNCTION current_user_has_role(p_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_has_role IS 'Check if the current authenticated user has a specific role';

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_has_role('admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS 'Check if the current user is an admin';

-- Function to check if current user is teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_has_role('teacher');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_teacher IS 'Check if the current user is a teacher';

-- Function to check if current user is student
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user_has_role('student');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_student IS 'Check if the current user is a student';

-- Function to get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN get_user_role(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_user_role IS 'Get the role of the current authenticated user';

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID,
  p_new_role user_role
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only admins can update roles
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update user roles';
  END IF;

  -- Update the role
  UPDATE profiles
  SET role = p_new_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the role change
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id
  ) SELECT
    'profiles',
    p_user_id,
    'ROLE_UPDATE',
    jsonb_build_object('role', old.role),
    jsonb_build_object('role', p_new_role),
    auth.uid()
  FROM profiles old
  WHERE old.id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_role IS 'Update a user''s role (admin only)';

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

COMMENT ON TABLE audit_log IS 'Audit trail for sensitive operations';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_teacher TO authenticated;
GRANT EXECUTE ON FUNCTION is_student TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log;
CREATE POLICY "Admins can view all audit logs" ON audit_log
  FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_log;
CREATE POLICY "Users can view their own audit logs" ON audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Role management functions created successfully';
  RAISE NOTICE 'Functions: has_role, get_user_role, is_admin, is_teacher, is_student, current_user_role, update_user_role';
  RAISE NOTICE 'Audit log table created with RLS policies';
END $$;
