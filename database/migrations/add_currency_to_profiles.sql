-- Migration: Add currency field to profiles table
-- Created: 2026-01-25
-- Description: Adds currency preference for users (VND, USD, EUR)

-- Add currency column with default value VND
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'VND'
CHECK (currency IN ('VND', 'USD', 'EUR'));

-- Add comment to explain the column
COMMENT ON COLUMN profiles.currency IS 'User preferred currency for displaying prices (VND, USD, EUR)';

-- Update existing rows to have VND as default currency if NULL
UPDATE profiles
SET currency = 'VND'
WHERE currency IS NULL;
