-- Migration 027: Student Careers Table
-- Task: T141 - Create student_careers table linking students to careers
-- Purpose: Track which career path each student has chosen
-- Date: 2026-02-05

-- ============================================================================
-- STUDENT CAREERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  career_path_id UUID NOT NULL REFERENCES career_paths(id) ON DELETE RESTRICT,

  -- Character state
  current_level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,

  -- Character stats (evolve with level)
  health INTEGER NOT NULL DEFAULT 100,
  mana INTEGER NOT NULL DEFAULT 100,
  strength INTEGER NOT NULL DEFAULT 10,
  intelligence INTEGER NOT NULL DEFAULT 10,
  creativity INTEGER NOT NULL DEFAULT 10,
  charisma INTEGER NOT NULL DEFAULT 10,

  -- Character customization
  character_name VARCHAR(100),
  current_sprite_url TEXT,

  -- Progression tracking
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  total_levels_gained INTEGER NOT NULL DEFAULT 0,
  last_level_up_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT student_careers_student_career_unique UNIQUE (student_id, career_path_id),
  CONSTRAINT student_careers_level_check CHECK (current_level >= 1 AND current_level <= 50),
  CONSTRAINT student_careers_xp_check CHECK (current_xp >= 0),
  CONSTRAINT student_careers_stats_check CHECK (
    health >= 0 AND
    mana >= 0 AND
    strength >= 0 AND
    intelligence >= 0 AND
    creativity >= 0 AND
    charisma >= 0
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_student_careers_student ON student_careers(student_id);
CREATE INDEX idx_student_careers_career ON student_careers(career_path_id);
CREATE INDEX idx_student_careers_level ON student_careers(current_level);
CREATE INDEX idx_student_careers_active ON student_careers(is_active, student_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_careers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_careers_updated_at_trigger
  BEFORE UPDATE ON student_careers
  FOR EACH ROW
  EXECUTE FUNCTION update_student_careers_updated_at();

-- Validate student role on insert
CREATE OR REPLACE FUNCTION validate_student_career_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT role FROM profiles WHERE id = NEW.student_id) != 'student' THEN
    RAISE EXCEPTION 'Only students can have career paths';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_careers_role_validation_trigger
  BEFORE INSERT ON student_careers
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_career_role();

-- Initialize character stats from career path
CREATE OR REPLACE FUNCTION initialize_career_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_career career_paths%ROWTYPE;
BEGIN
  -- Get career path details
  SELECT * INTO v_career
  FROM career_paths
  WHERE id = NEW.career_path_id;

  -- Initialize stats from career base stats
  NEW.health := v_career.base_health;
  NEW.mana := v_career.base_mana;
  NEW.strength := v_career.base_strength;
  NEW.intelligence := v_career.base_intelligence;
  NEW.creativity := v_career.base_creativity;
  NEW.charisma := v_career.base_charisma;

  -- Set initial XP requirement
  NEW.xp_to_next_level := 100;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_careers_init_stats_trigger
  BEFORE INSERT ON student_careers
  FOR EACH ROW
  EXECUTE FUNCTION initialize_career_stats();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE student_careers ENABLE ROW LEVEL SECURITY;

-- Students can view their own careers
DROP POLICY IF EXISTS "Students can view own careers" ON student_careers;
CREATE POLICY "Students can view own careers"
  ON student_careers
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR is_admin());

-- Students can create their own career (one-time selection)
DROP POLICY IF EXISTS "Students can create own career" ON student_careers;
CREATE POLICY "Students can create own career"
  ON student_careers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND is_student()
    -- Ensure student doesn't already have an active career
    AND NOT EXISTS (
      SELECT 1 FROM student_careers
      WHERE student_id = auth.uid()
      AND is_active = true
    )
  );

-- System can update careers (for XP/level progression)
DROP POLICY IF EXISTS "System updates student careers" ON student_careers;
CREATE POLICY "System updates student careers"
  ON student_careers
  FOR UPDATE
  TO authenticated
  USING (true); -- Backend/Edge Functions handle XP updates

-- Admins have full access
DROP POLICY IF EXISTS "Admins manage student careers" ON student_careers;
CREATE POLICY "Admins manage student careers"
  ON student_careers
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get student's active career
CREATE OR REPLACE FUNCTION get_student_career(p_student_id UUID)
RETURNS student_careers AS $$
  SELECT *
  FROM student_careers
  WHERE student_id = p_student_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Calculate XP required for next level (exponential curve)
CREATE OR REPLACE FUNCTION calculate_xp_for_level(p_level INTEGER, p_multiplier DECIMAL DEFAULT 1.00)
RETURNS INTEGER AS $$
BEGIN
  -- Base formula: 100 * (level^1.5) * multiplier
  RETURN FLOOR(100 * POWER(p_level, 1.5) * p_multiplier);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON student_careers TO authenticated;
GRANT ALL ON student_careers TO service_role;
GRANT EXECUTE ON FUNCTION get_student_career TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_xp_for_level TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE student_careers IS 'Student character progression - links students to career paths';
COMMENT ON COLUMN student_careers.student_id IS 'Reference to profiles table (must be student role)';
COMMENT ON COLUMN student_careers.career_path_id IS 'Selected career path';
COMMENT ON COLUMN student_careers.current_xp IS 'XP progress toward next level';
COMMENT ON COLUMN student_careers.xp_to_next_level IS 'XP required to reach next level';
COMMENT ON COLUMN student_careers.character_name IS 'Optional custom name for character';
COMMENT ON FUNCTION get_student_career IS 'Retrieve active career for a student';
COMMENT ON FUNCTION calculate_xp_for_level IS 'Calculate XP requirement for given level';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Student Careers Table Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table: student_careers';
  RAISE NOTICE '🎯 Purpose: Track student character progression';
  RAISE NOTICE '📊 Features:';
  RAISE NOTICE '  • Auto-initialize stats from career path';
  RAISE NOTICE '  • XP/level progression tracking';
  RAISE NOTICE '  • One active career per student';
  RAISE NOTICE '  • Character customization';
  RAISE NOTICE '🔒 RLS: Students view/create own, system updates';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Seed career paths and create UI components';
  RAISE NOTICE '========================================';
END $$;
