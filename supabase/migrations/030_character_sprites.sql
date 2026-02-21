-- Migration: Character Sprites Table
-- Description: Stores 8-bit character sprite definitions for each career path and level range
-- Related to: Phase 10 - Character & Gamification System (T151)

-- Create character_sprites table
CREATE TABLE IF NOT EXISTS character_sprites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id UUID NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
  level_range_min INTEGER NOT NULL CHECK (level_range_min >= 1),
  level_range_max INTEGER NOT NULL CHECK (level_range_max >= level_range_min),
  sprite_url TEXT NOT NULL, -- Path to 64x64px sprite image in storage
  animation_data JSONB DEFAULT '{}', -- Animation frames and timing data
  color_palette JSONB NOT NULL DEFAULT '{}', -- Career-specific color values
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no overlapping level ranges for same career
  UNIQUE (career_id, level_range_min, level_range_max)
);

-- Create indexes
CREATE INDEX idx_character_sprites_career ON character_sprites(career_id);
CREATE INDEX idx_character_sprites_level_range ON character_sprites(level_range_min, level_range_max);

-- Create function to get sprite for student's current level
CREATE OR REPLACE FUNCTION get_student_sprite(p_student_id UUID)
RETURNS TABLE (
  sprite_url TEXT,
  animation_data JSONB,
  color_palette JSONB,
  current_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.sprite_url,
    cs.animation_data,
    cs.color_palette,
    sl.current_level
  FROM student_levels sl
  JOIN student_careers sc ON sc.student_id = sl.student_id
  JOIN character_sprites cs ON cs.career_id = sc.career_id
  WHERE sl.student_id = p_student_id
    AND sl.current_level BETWEEN cs.level_range_min AND cs.level_range_max
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add RLS policies
ALTER TABLE character_sprites ENABLE ROW LEVEL SECURITY;

-- Anyone can read sprite data (public assets)
CREATE POLICY "Character sprites are viewable by everyone"
  ON character_sprites FOR SELECT
  USING (true);

-- Only admins can insert/update sprites
CREATE POLICY "Only admins can manage character sprites"
  ON character_sprites FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'user_role' = 'admin'
  );

-- Add updated_at trigger
CREATE TRIGGER set_character_sprites_updated_at
  BEFORE UPDATE ON character_sprites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE character_sprites IS 'Stores 8-bit character sprite definitions for each career path and level range';
COMMENT ON COLUMN character_sprites.sprite_url IS 'Path to 64x64px sprite image in storage bucket';
COMMENT ON COLUMN character_sprites.animation_data IS 'JSON data defining animation frames, timing, and sequences';
COMMENT ON COLUMN character_sprites.color_palette IS 'Career-specific color values (primary, secondary, accent)';
COMMENT ON FUNCTION get_student_sprite IS 'Retrieves the appropriate sprite for a student based on their current level';
