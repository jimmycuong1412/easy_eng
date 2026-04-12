-- Fix missing UNIQUE constraint on teacher_earnings(booking_id)
-- Migration: 059_fix_teacher_earnings_constraints.sql

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'teacher_earnings_booking_id_key'
    ) THEN
        ALTER TABLE teacher_earnings ADD CONSTRAINT teacher_earnings_booking_id_key UNIQUE (booking_id);
        COMMENT ON CONSTRAINT teacher_earnings_booking_id_key ON teacher_earnings IS 'Ensures one earnings record per booking';
    END IF;
END $$;
