-- Migration: Implement Capacity Enforcement for Classes
-- Purpose: Prevent overbooking by enforcing capacity limits
-- Related to: Phase 6 - Teacher Class Management (T092)

-- Function to check class capacity before booking
CREATE OR REPLACE FUNCTION check_class_capacity()
RETURNS TRIGGER AS $$
DECLARE
  class_capacity INTEGER;
  current_bookings INTEGER;
BEGIN
  -- Get class capacity
  SELECT capacity INTO class_capacity
  FROM public.classes
  WHERE id = NEW.class_id;

  -- Count current confirmed bookings
  SELECT COUNT(*) INTO current_bookings
  FROM public.bookings
  WHERE class_id = NEW.class_id
    AND status IN ('confirmed', 'pending')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Check if adding this booking would exceed capacity
  IF current_bookings >= class_capacity THEN
    RAISE EXCEPTION 'Class is full. Current bookings: %, Capacity: %', current_bookings, class_capacity
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce capacity on booking insert/update
CREATE TRIGGER enforce_class_capacity
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'pending'))
  EXECUTE FUNCTION check_class_capacity();

-- Function to prevent capacity reduction below current bookings
CREATE OR REPLACE FUNCTION prevent_capacity_reduction()
RETURNS TRIGGER AS $$
DECLARE
  current_bookings INTEGER;
BEGIN
  -- Only check if capacity is being reduced
  IF NEW.capacity < OLD.capacity THEN
    -- Count current confirmed bookings
    SELECT COUNT(*) INTO current_bookings
    FROM public.bookings
    WHERE class_id = NEW.id
      AND status IN ('confirmed', 'pending');

    -- Prevent reduction if it would make class over-capacity
    IF current_bookings > NEW.capacity THEN
      RAISE EXCEPTION 'Cannot reduce capacity below current bookings. Current bookings: %, New capacity: %',
        current_bookings, NEW.capacity
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent invalid capacity changes
CREATE TRIGGER prevent_invalid_capacity_change
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  WHEN (NEW.capacity != OLD.capacity)
  EXECUTE FUNCTION prevent_capacity_reduction();

-- Add check constraint to ensure capacity is positive
ALTER TABLE public.classes
  ADD CONSTRAINT classes_capacity_positive CHECK (capacity > 0);

-- Add check constraint to ensure capacity doesn't exceed reasonable limit
ALTER TABLE public.classes
  ADD CONSTRAINT classes_capacity_max CHECK (capacity <= 50);

-- Create view to show class availability
CREATE OR REPLACE VIEW public.class_availability AS
SELECT
  c.id AS class_id,
  c.title,
  c.scheduled_at,
  c.capacity,
  COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'pending')) AS booked_count,
  c.capacity - COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'pending')) AS available_seats,
  CASE
    WHEN COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'pending')) >= c.capacity THEN true
    ELSE false
  END AS is_full
FROM public.classes c
LEFT JOIN public.bookings b ON b.class_id = c.id
WHERE c.status = 'scheduled'
  AND c.scheduled_at > NOW()
GROUP BY c.id, c.title, c.scheduled_at, c.capacity;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.class_availability TO authenticated;

-- Comments
COMMENT ON FUNCTION check_class_capacity() IS 'Prevents booking when class is at full capacity';
COMMENT ON FUNCTION prevent_capacity_reduction() IS 'Prevents reducing capacity below current bookings';
COMMENT ON VIEW public.class_availability IS 'Shows real-time availability for each class';
