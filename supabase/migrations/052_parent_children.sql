-- Migration 052: Parent-Children Relationship Table
-- Fixes the security gap where any parent could view any student profile

-- Create parent_children relationship table
CREATE TABLE IF NOT EXISTS parent_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Enable RLS
ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;

-- Parents can view their own relationships
CREATE POLICY "Parents can view own children"
  ON parent_children
  FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Parents can request to link a child
CREATE POLICY "Parents can create child link"
  ON parent_children
  FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'parent'
  );

-- Admins can manage all relationships
CREATE POLICY "Admins manage parent_children"
  ON parent_children
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- Now fix the "Parents can view children profiles" RLS policy on profiles table
-- Drop the insecure policy that lets any parent see any student
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;

-- Recreate with proper family relationship check
CREATE POLICY "Parents can view children profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_children
      WHERE parent_id = auth.uid()
        AND child_id = profiles.id
        AND verified = true
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);

COMMENT ON TABLE parent_children IS 'Maps parent users to their child (student) users for profile access control';
