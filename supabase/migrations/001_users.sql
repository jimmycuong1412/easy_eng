-- Migration 001: Users Table
-- Creates base users table (note: Supabase Auth provides auth.users)
-- This migration ensures auth.users exists with required fields

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Supabase already creates auth.users table
-- This migration documents the expected structure
-- and adds any custom fields if needed

-- Verify auth.users exists (Supabase creates this automatically)
-- The auth.users table has these core fields:
-- - id (uuid, primary key)
-- - email (text)
-- - encrypted_password (text)
-- - email_confirmed_at (timestamp)
-- - created_at (timestamp)
-- - updated_at (timestamp)
-- - last_sign_in_at (timestamp)
-- - raw_app_meta_data (jsonb)
-- - raw_user_meta_data (jsonb)

-- Add custom metadata fields via trigger if needed
-- For now, we'll use the profiles table for extended user data
