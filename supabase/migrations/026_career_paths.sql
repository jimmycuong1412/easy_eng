-- Migration 026: Career Paths Table
-- Task: T140 - Create career_paths table for character progression system
-- Purpose: Define career paths that students can choose (Doctor, Engineer, Warrior, Business, Artist, Scientist)
-- Date: 2026-02-05

-- ============================================================================
-- CAREER PATHS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url TEXT,

  -- Character progression attributes
  base_health INTEGER NOT NULL DEFAULT 100,
  base_mana INTEGER NOT NULL DEFAULT 100,
  base_strength INTEGER NOT NULL DEFAULT 10,
  base_intelligence INTEGER NOT NULL DEFAULT 10,
  base_creativity INTEGER NOT NULL DEFAULT 10,
  base_charisma INTEGER NOT NULL DEFAULT 10,

  -- Level progression
  max_level INTEGER NOT NULL DEFAULT 50,
  xp_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,

  -- Visual customization
  primary_color VARCHAR(7) NOT NULL DEFAULT '#000000',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  sprite_base_url TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_career_paths_active ON career_paths(is_active, sort_order);
CREATE INDEX idx_career_paths_slug ON career_paths(slug);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_career_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_paths_updated_at_trigger
  BEFORE UPDATE ON career_paths
  FOR EACH ROW
  EXECUTE FUNCTION update_career_paths_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Anyone can view active career paths
DROP POLICY IF EXISTS "Anyone can view active career paths" ON career_paths;
CREATE POLICY "Anyone can view active career paths"
  ON career_paths
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage career paths
DROP POLICY IF EXISTS "Admins can manage career paths" ON career_paths;
CREATE POLICY "Admins can manage career paths"
  ON career_paths
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON career_paths TO authenticated;
GRANT ALL ON career_paths TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE career_paths IS 'Available career paths for student character progression';
COMMENT ON COLUMN career_paths.slug IS 'URL-friendly identifier (e.g., "doctor", "engineer")';
COMMENT ON COLUMN career_paths.xp_multiplier IS 'Multiplier for XP requirements (e.g., 1.1 = 10% more XP needed)';
COMMENT ON COLUMN career_paths.sprite_base_url IS 'Base URL for sprite assets (appended with level/state)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Career Paths Table Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table: career_paths';
  RAISE NOTICE '🎭 Purpose: Student character career progression';
  RAISE NOTICE '🔢 Fields: 6 careers with unique attributes';
  RAISE NOTICE '🔒 RLS: Public read, admin write';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run seed.sql to populate 6 career paths';
  RAISE NOTICE '========================================';
END $$;
