-- Migration: Teacher Availability System
-- Purpose: Allow teachers to set and manage their availability schedule
-- Related to: Phase 6 - Teacher Class Management (T094)

-- Create teacher_availability table
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_time_after_start_time CHECK (end_time > start_time)
);

-- Create index for performance
CREATE INDEX idx_teacher_availability_teacher_id ON public.teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_day_of_week ON public.teacher_availability(day_of_week);
CREATE INDEX idx_teacher_availability_active ON public.teacher_availability(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_teacher_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_availability_updated_at
  BEFORE UPDATE ON public.teacher_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_availability_updated_at();

-- Row Level Security
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own availability
CREATE POLICY "Teachers can view own availability"
  ON public.teacher_availability
  FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can create own availability"
  ON public.teacher_availability
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update own availability"
  ON public.teacher_availability
  FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own availability"
  ON public.teacher_availability
  FOR DELETE
  USING (teacher_id = auth.uid());

-- Students and admins can view teacher availability
CREATE POLICY "Students can view teacher availability"
  ON public.teacher_availability
  FOR SELECT
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('student', 'admin')
    )
  );

-- Create table for specific availability exceptions (holidays, breaks, etc.)
CREATE TABLE IF NOT EXISTS public.teacher_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT false, -- false = unavailable (holiday), true = special availability
  reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exception_end_after_start CHECK (
    (is_available = false) OR (end_time > start_time)
  )
);

-- Create index
CREATE INDEX idx_availability_exceptions_teacher_id ON public.teacher_availability_exceptions(teacher_id);
CREATE INDEX idx_availability_exceptions_date ON public.teacher_availability_exceptions(exception_date);

-- Updated_at trigger for exceptions
CREATE TRIGGER teacher_availability_exceptions_updated_at
  BEFORE UPDATE ON public.teacher_availability_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_availability_updated_at();

-- RLS for exceptions
ALTER TABLE public.teacher_availability_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own exceptions"
  ON public.teacher_availability_exceptions
  FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Others can view teacher exceptions"
  ON public.teacher_availability_exceptions
  FOR SELECT
  USING (true);

-- Function to check if a teacher is available at a specific time
CREATE OR REPLACE FUNCTION is_teacher_available(
  p_teacher_id UUID,
  p_datetime TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time TIME;
  v_date DATE;
  v_available BOOLEAN;
BEGIN
  -- Extract day of week, time, and date
  v_day_of_week := EXTRACT(DOW FROM p_datetime)::INTEGER;
  v_time := p_datetime::TIME;
  v_date := p_datetime::DATE;

  -- Check for exceptions first
  SELECT is_available INTO v_available
  FROM public.teacher_availability_exceptions
  WHERE teacher_id = p_teacher_id
    AND exception_date = v_date
    AND (
      (is_available = false) OR
      (is_available = true AND v_time >= start_time AND v_time < end_time)
    )
  LIMIT 1;

  -- If exception found
  IF FOUND THEN
    RETURN COALESCE(v_available, false);
  END IF;

  -- Check regular availability
  SELECT true INTO v_available
  FROM public.teacher_availability
  WHERE teacher_id = p_teacher_id
    AND day_of_week = v_day_of_week
    AND is_active = true
    AND v_time >= start_time
    AND v_time < end_time
  LIMIT 1;

  RETURN COALESCE(v_available, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE public.teacher_availability IS 'Regular weekly availability schedule for teachers';
COMMENT ON TABLE public.teacher_availability_exceptions IS 'Exceptions to regular schedule (holidays, special hours)';
COMMENT ON COLUMN public.teacher_availability.day_of_week IS '0 = Sunday, 1 = Monday, ..., 6 = Saturday';
COMMENT ON COLUMN public.teacher_availability.is_active IS 'Allows temporarily disabling time slots without deleting them';
COMMENT ON FUNCTION is_teacher_available IS 'Checks if a teacher is available at a specific datetime';
