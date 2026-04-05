-- Fix missing student_id column in teacher_earnings
-- Migration: 056_fix_teacher_earnings_student_id.sql

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='student_id') THEN
        ALTER TABLE teacher_earnings ADD COLUMN student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        COMMENT ON COLUMN teacher_earnings.student_id IS 'Student who made the booking';
        
        -- Update existing records if any (not expected as bookings fail without this)
        -- UPDATE teacher_earnings te SET student_id = b.student_id FROM bookings b WHERE te.booking_id = b.id;
    END IF;
END $$;
