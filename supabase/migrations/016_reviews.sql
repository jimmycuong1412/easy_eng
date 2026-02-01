-- Migration 016: Class Reviews System
-- Purpose: Allow students to review classes and earn gems for their first review

-- =====================================================
-- 1. Reviews Table
-- =====================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one review per booking
  CONSTRAINT unique_review_per_booking UNIQUE (booking_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_student
  ON reviews(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_class
  ON reviews(class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_teacher
  ON reviews(teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_rating
  ON reviews(rating, created_at DESC);

-- Index for flagged reviews (admin moderation)
CREATE INDEX IF NOT EXISTS idx_reviews_flagged
  ON reviews(is_flagged, created_at DESC)
  WHERE is_flagged = TRUE;

-- Comments
COMMENT ON TABLE reviews IS 'Student reviews for completed classes';
COMMENT ON COLUMN reviews.rating IS 'Star rating from 1 (poor) to 5 (excellent)';
COMMENT ON COLUMN reviews.is_anonymous IS 'Whether to hide student name when displaying review';
COMMENT ON COLUMN reviews.is_flagged IS 'Marked for admin review (inappropriate content)';

-- =====================================================
-- 2. Function: Submit Review
-- =====================================================

CREATE OR REPLACE FUNCTION submit_review(
  p_booking_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  success BOOLEAN,
  review_id UUID,
  is_first_review BOOLEAN,
  gems_awarded INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_review_id UUID;
  v_is_first_review BOOLEAN;
  v_gems_result RECORD;
  v_gems_awarded INTEGER := 0;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, FALSE, 0, 'Booking not found';
    RETURN;
  END IF;

  -- Verify lesson is completed
  IF v_booking.lesson_status != 'completed' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, FALSE, 0, 'Can only review completed classes';
    RETURN;
  END IF;

  -- Verify student owns this booking
  IF v_booking.student_id != auth.uid() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, FALSE, 0, 'Unauthorized';
    RETURN;
  END IF;

  -- Check if review already exists
  IF EXISTS (SELECT 1 FROM reviews WHERE booking_id = p_booking_id) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, FALSE, 0, 'Review already submitted for this class';
    RETURN;
  END IF;

  -- Get class details
  DECLARE
    v_class_id UUID;
    v_teacher_id UUID;
  BEGIN
    SELECT id, teacher_id INTO v_class_id, v_teacher_id
    FROM classes
    WHERE id = v_booking.class_id;
  END;

  -- Check if this is student's first review
  SELECT NOT EXISTS (
    SELECT 1 FROM reviews WHERE student_id = v_booking.student_id
  ) INTO v_is_first_review;

  -- Insert review
  INSERT INTO reviews (
    booking_id,
    student_id,
    class_id,
    teacher_id,
    rating,
    comment,
    is_anonymous
  ) VALUES (
    p_booking_id,
    v_booking.student_id,
    v_class_id,
    v_teacher_id,
    p_rating,
    p_comment,
    p_is_anonymous
  )
  RETURNING id INTO v_review_id;

  -- Award gems for first review
  IF v_is_first_review THEN
    SELECT * INTO v_gems_result
    FROM award_gems_for_activity(
      v_booking.student_id,
      'first_review',
      jsonb_build_object(
        'review_id', v_review_id,
        'booking_id', p_booking_id,
        'class_id', v_class_id,
        'rating', p_rating
      )
    );

    IF v_gems_result.success THEN
      v_gems_awarded := v_gems_result.gems_awarded;
    END IF;
  END IF;

  -- Return success
  RETURN QUERY SELECT
    TRUE AS success,
    v_review_id AS review_id,
    v_is_first_review AS is_first_review,
    v_gems_awarded AS gems_awarded,
    CASE
      WHEN v_is_first_review AND v_gems_awarded > 0
        THEN format('Review submitted! You earned %s gems for your first review.', v_gems_awarded)
      ELSE 'Review submitted successfully!'
    END AS message;
END;
$$;

COMMENT ON FUNCTION submit_review IS 'Submits a class review and awards gems for first review';

-- =====================================================
-- 3. Function: Get Class Average Rating
-- =====================================================

CREATE OR REPLACE FUNCTION get_class_average_rating(
  p_class_id UUID
) RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews INTEGER,
  rating_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating), 2) AS average_rating,
    COUNT(*)::INTEGER AS total_reviews,
    jsonb_build_object(
      '5_star', COUNT(*) FILTER (WHERE rating = 5),
      '4_star', COUNT(*) FILTER (WHERE rating = 4),
      '3_star', COUNT(*) FILTER (WHERE rating = 3),
      '2_star', COUNT(*) FILTER (WHERE rating = 2),
      '1_star', COUNT(*) FILTER (WHERE rating = 1)
    ) AS rating_distribution
  FROM reviews
  WHERE class_id = p_class_id;
END;
$$;

COMMENT ON FUNCTION get_class_average_rating IS 'Returns average rating and distribution for a class';

-- =====================================================
-- 4. Function: Get Teacher Average Rating
-- =====================================================

CREATE OR REPLACE FUNCTION get_teacher_average_rating(
  p_teacher_id UUID
) RETURNS TABLE (
  average_rating NUMERIC,
  total_reviews INTEGER,
  recent_reviews_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(rating), 2) AS average_rating,
    COUNT(*)::INTEGER AS total_reviews,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::INTEGER AS recent_reviews_count
  FROM reviews
  WHERE teacher_id = p_teacher_id;
END;
$$;

COMMENT ON FUNCTION get_teacher_average_rating IS 'Returns average rating for a teacher across all classes';

-- =====================================================
-- 5. Function: Get Recent Reviews for Class
-- =====================================================

CREATE OR REPLACE FUNCTION get_class_reviews(
  p_class_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  review_id UUID,
  student_name TEXT,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ,
  is_anonymous BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS review_id,
    CASE
      WHEN r.is_anonymous THEN 'Anonymous Student'
      ELSE p.display_name
    END AS student_name,
    r.rating,
    r.comment,
    r.created_at,
    r.is_anonymous
  FROM reviews r
  LEFT JOIN profiles p ON p.id = r.student_id
  WHERE r.class_id = p_class_id
  AND r.is_flagged = FALSE
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION get_class_reviews IS 'Returns paginated reviews for a class, respecting anonymity';

-- =====================================================
-- 6. Trigger: Update Teacher Rating Cache
-- =====================================================

-- Add rating cache columns to profiles (teacher stats)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_teacher_rating_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update teacher's cached rating stats
  UPDATE profiles
  SET
    average_rating = (
      SELECT ROUND(AVG(rating), 2)
      FROM reviews
      WHERE teacher_id = NEW.teacher_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE teacher_id = NEW.teacher_id
    ),
    updated_at = NOW()
  WHERE id = NEW.teacher_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_teacher_rating ON reviews;
CREATE TRIGGER trigger_update_teacher_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_rating_cache();

-- =====================================================
-- 7. RLS Policies
-- =====================================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Students can view all non-flagged reviews
CREATE POLICY "Students can view published reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (is_flagged = FALSE);

-- Students can insert their own reviews
CREATE POLICY "Students can insert own reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can update their own reviews (within 24 hours)
CREATE POLICY "Students can update own reviews within 24h"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND created_at >= NOW() - INTERVAL '24 hours'
  );

-- Teachers can view reviews for their classes
CREATE POLICY "Teachers can view reviews for their classes"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = reviews.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Admins can view all reviews including flagged ones
CREATE POLICY "Admins can view all reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update reviews (for moderation)
CREATE POLICY "Admins can moderate reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can manage all reviews
CREATE POLICY "Service role can manage reviews"
  ON reviews
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- =====================================================
-- 8. Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT ALL ON reviews TO service_role;

-- =====================================================
-- End of Migration 016
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 016 completed: Reviews system with first review gem rewards enabled';
END $$;
