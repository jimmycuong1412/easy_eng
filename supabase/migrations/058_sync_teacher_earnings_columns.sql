-- Sync all missing columns to teacher_earnings
-- Migration: 058_sync_teacher_earnings_columns.sql

DO $$ 
BEGIN 
    -- Revenue breakdown columns (Add IF NOT EXISTS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='class_price') THEN
        ALTER TABLE teacher_earnings ADD COLUMN class_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='gems_discount') THEN
        ALTER TABLE teacher_earnings ADD COLUMN gems_discount DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='final_price') THEN
        ALTER TABLE teacher_earnings ADD COLUMN final_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- Split calculation columns (Add IF NOT EXISTS)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='teacher_share') THEN
        ALTER TABLE teacher_earnings ADD COLUMN teacher_share DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teacher_earnings' AND column_name='platform_fee') THEN
        ALTER TABLE teacher_earnings ADD COLUMN platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- Reset NOT NULL constraints if columns were added as NULLABLE in previous partial attempts
    ALTER TABLE teacher_earnings ALTER COLUMN class_price SET NOT NULL;
    ALTER TABLE teacher_earnings ALTER COLUMN gems_discount SET NOT NULL;
    ALTER TABLE teacher_earnings ALTER COLUMN final_price SET NOT NULL;
    ALTER TABLE teacher_earnings ALTER COLUMN teacher_share SET NOT NULL;
    ALTER TABLE teacher_earnings ALTER COLUMN platform_fee SET NOT NULL;

    -- Add checks if missing
    -- ALTER TABLE teacher_earnings ADD CONSTRAINT teacher_earnings_class_price_check CHECK (class_price >= 0);
    -- (Checks might already be there from partial initial migration attempts)
END $$;
