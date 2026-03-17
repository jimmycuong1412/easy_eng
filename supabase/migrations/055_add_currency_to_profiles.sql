-- Migration: Add currency preference column to profiles table
-- Adds user-configurable display currency alongside the existing locale and timezone fields.
-- Supported values: VND (Vietnamese Dong), USD (US Dollar), EUR (Euro)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'VND'
  CHECK (currency IN ('VND', 'USD', 'EUR'));

COMMENT ON COLUMN profiles.currency IS 'User''s preferred display currency for prices. One of: VND, USD, EUR.';
