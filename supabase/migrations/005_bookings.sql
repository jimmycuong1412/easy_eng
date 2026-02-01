-- Migration: 005_bookings.sql
-- Description: Create bookings table with Gems discount support
-- Date: 2024-01-29

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  
  -- Pricing and Gems
  original_price DECIMAL(10, 2) NOT NULL CHECK (original_price >= 0),
  gems_used INTEGER NOT NULL DEFAULT 0 CHECK (gems_used >= 0),
  gems_discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (gems_discount_amount >= 0),
  final_price DECIMAL(10, 2) NOT NULL CHECK (final_price >= 5.00),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Payment
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),
  payment_intent_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  
  -- Booking status
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  
  -- Metadata
  booking_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_gems_discount CHECK (
    gems_discount_amount = ROUND((gems_used::DECIMAL / 100), 2)
  ),
  CONSTRAINT valid_final_price CHECK (
    final_price = original_price - gems_discount_amount
  ),
  CONSTRAINT valid_discount_percentage CHECK (
    gems_discount_amount <= original_price * 0.5
  ),
  CONSTRAINT valid_minimum_price CHECK (final_price >= 5.00),
  
  -- Prevent double booking same class
  CONSTRAINT unique_user_class_booking UNIQUE (user_id, class_id)
);

-- Indexes
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_class ON bookings(class_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_bookings_idempotency ON bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Partial index for active bookings
CREATE INDEX idx_bookings_active ON bookings(user_id, status) 
  WHERE status IN ('pending', 'confirmed');

-- Updated timestamp trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment class enrollment on booking
CREATE OR REPLACE FUNCTION increment_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment for confirmed bookings
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE classes
    SET current_enrollments = current_enrollments + 1
    WHERE id = NEW.class_id;
    
    -- Check if class is full
    IF (SELECT current_enrollments >= max_students FROM classes WHERE id = NEW.class_id) THEN
      UPDATE classes
      SET status = 'full'
      WHERE id = NEW.class_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement class enrollment on cancellation
CREATE OR REPLACE FUNCTION decrement_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if was previously confirmed
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    UPDATE classes
    SET current_enrollments = GREATEST(0, current_enrollments - 1)
    WHERE id = OLD.class_id;
    
    -- Reopen class if it was full
    UPDATE classes
    SET status = 'scheduled'
    WHERE id = OLD.class_id
      AND status = 'full'
      AND current_enrollments < max_students;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for enrollment management
CREATE TRIGGER booking_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_class_enrollment();

CREATE TRIGGER booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION decrement_class_enrollment();

-- Comments
COMMENT ON TABLE bookings IS 'Student class bookings with Gems discount support';
COMMENT ON COLUMN bookings.gems_used IS 'Number of Gems used for discount (100 Gems = $1)';
COMMENT ON COLUMN bookings.gems_discount_amount IS 'Dollar amount discounted via Gems';
COMMENT ON COLUMN bookings.final_price IS 'Final price paid (must be >= $5)';
COMMENT ON COLUMN bookings.idempotency_key IS 'Unique key to prevent duplicate bookings';
COMMENT ON CONSTRAINT valid_discount_percentage ON bookings IS 'Gems discount cannot exceed 50% of original price';
COMMENT ON CONSTRAINT valid_minimum_price ON bookings IS 'Final price must be at least $5';
