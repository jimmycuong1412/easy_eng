-- Migration: 004_classes.sql
-- Description: Create classes table for class offerings
-- Date: 2024-01-29

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Class details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50) NOT NULL CHECK (level IN ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced')),
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 5.00),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Scheduling
  schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('one_time', 'recurring')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  
  -- Capacity
  max_students INTEGER NOT NULL DEFAULT 10 CHECK (max_students > 0),
  current_enrollments INTEGER NOT NULL DEFAULT 0 CHECK (current_enrollments >= 0),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Materials
  materials_url TEXT,
  meeting_link TEXT,
  
  -- Metadata
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_enrollment CHECK (current_enrollments <= max_students)
);

-- Indexes for common queries
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_level ON classes(level);
CREATE INDEX idx_classes_start_time ON classes(start_time);
CREATE INDEX idx_classes_active ON classes(is_active) WHERE is_active = true;
CREATE INDEX idx_classes_available ON classes(status, is_active) WHERE status = 'scheduled' AND is_active = true;

-- Updated timestamp trigger
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE classes IS 'Available classes offered by teachers';
COMMENT ON COLUMN classes.price IS 'Class price in USD (minimum $5)';
COMMENT ON COLUMN classes.current_enrollments IS 'Number of students currently enrolled';
COMMENT ON COLUMN classes.max_students IS 'Maximum number of students allowed';
COMMENT ON COLUMN classes.schedule_type IS 'Whether class is one-time or recurring';
