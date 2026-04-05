-- Fix for "gross_amount" column blocking bookings
-- Migration: 061_fix_teacher_earnings_gross_amount.sql
-- Task: Resolve NULL constraint violation for 'gross_amount' in teacher_earnings

DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='teacher_earnings' AND column_name='gross_amount'
    ) THEN
        -- Make it nullable so it doesn't block insertions
        ALTER TABLE teacher_earnings ALTER COLUMN gross_amount DROP NOT NULL;
        
        -- Set a default of 0 as a secondary safety measure
        ALTER TABLE teacher_earnings ALTER COLUMN gross_amount SET DEFAULT 0;
        
        COMMENT ON COLUMN teacher_earnings.gross_amount IS 'Ghost column fix: made nullable and defaulted to 0';
    ELSE
        -- If it doesn't exist, we'll create it to future-proof the table if other code expects it
        ALTER TABLE teacher_earnings ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;
