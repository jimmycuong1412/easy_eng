# Database Setup Guide for Easy Eng

## Overview

This guide walks you through setting up the complete database schema for the Easy Eng platform, including the `profiles` table and all required tables for video calling, bookings, and cookies.

---

## Part 1: Create the Profiles Table

### Step 1.1: Go to Supabase SQL Editor

1. Open [Supabase Console](https://supabase.com)
2. Select your project: **easy_eng**
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 1.2: Create Profiles Table

Copy and paste this entire SQL script into the query editor:

```sql
-- Migration: Create profiles table
-- Creates the main user profiles table with all necessary fields

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  locale TEXT DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
  currency TEXT DEFAULT 'VND' CHECK (currency IN ('VND', 'USD', 'EUR')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, timezone, locale, currency)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.user_metadata->>'full_name', NEW.email),
    COALESCE(NEW.user_metadata->>'role', 'student'),
    'Asia/Ho_Chi_Minh',
    'vi',
    'VND'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 1.3: Run the Script

1. Click the **Run** button (blue play icon)
2. You should see: "Execution successful"
3. Check the **Results** panel - should show the table was created

### Step 1.4: Verify the Table

Run this verification query:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles';
```

You should see one row: `profiles`

---

## Part 2: Create the Bookings Table

### Step 2.1: Run the Bookings Migration

Create a new query in SQL Editor and paste:

```sql
-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  price DECIMAL(10, 2) DEFAULT 0,
  topic TEXT,
  notes TEXT,
  meeting_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = student_id OR auth.uid() = teacher_id OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = student_id OR auth.uid() = teacher_id OR auth.role() = 'service_role'
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS bookings_student_id_idx ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS bookings_teacher_id_idx ON public.bookings(teacher_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);
CREATE INDEX IF NOT EXISTS bookings_scheduled_at_idx ON public.bookings(scheduled_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bookings_updated_at_trigger ON public.bookings;
CREATE TRIGGER update_bookings_updated_at_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bookings_updated_at();
```

**Click Run**

---

## Part 3: Create the Cookie System Tables

### Step 3.1: Create Cookie Balances Table

```sql
-- Create cookie_balances table
CREATE TABLE IF NOT EXISTS public.cookie_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cookie_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own balance" ON public.cookie_balances
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage balances" ON public.cookie_balances
  FOR ALL USING (auth.role() = 'service_role');

-- Create index
CREATE INDEX IF NOT EXISTS cookie_balances_user_id_idx ON public.cookie_balances(user_id);

-- Create trigger
CREATE OR REPLACE FUNCTION public.update_cookie_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cookie_balances_updated_at_trigger ON public.cookie_balances;
CREATE TRIGGER update_cookie_balances_updated_at_trigger
  BEFORE UPDATE ON public.cookie_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cookie_balances_updated_at();
```

**Click Run**

### Step 3.2: Create Cookie Transactions Table

```sql
-- Create cookie_transactions table
CREATE TABLE IF NOT EXISTS public.cookie_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  source TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cookie_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own transactions" ON public.cookie_transactions
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can create transactions" ON public.cookie_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS cookie_transactions_user_id_idx ON public.cookie_transactions(user_id);
CREATE INDEX IF NOT EXISTS cookie_transactions_type_idx ON public.cookie_transactions(type);
CREATE INDEX IF NOT EXISTS cookie_transactions_created_at_idx ON public.cookie_transactions(created_at);
```

**Click Run**

---

## Part 4: Create Teacher Profiles Table

```sql
-- Create teacher_profiles table
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10, 2) DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  specialties TEXT[] DEFAULT '{}',
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view verified teacher profiles" ON public.teacher_profiles
  FOR SELECT USING (verified = TRUE OR auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Teachers can update own profile" ON public.teacher_profiles
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS teacher_profiles_user_id_idx ON public.teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS teacher_profiles_verified_idx ON public.teacher_profiles(verified);

-- Create trigger
CREATE OR REPLACE FUNCTION public.update_teacher_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_profiles_updated_at_trigger ON public.teacher_profiles;
CREATE TRIGGER update_teacher_profiles_updated_at_trigger
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teacher_profiles_updated_at();
```

**Click Run**

---

## Part 5: Create the Admin User

### Step 5.1: Create Auth User in Supabase

1. Go to **Authentication** in Supabase sidebar
2. Click **Users** tab
3. Click **Add User** button
4. Fill in the form:
   - **Email**: `admin@easyeng.com`
   - **Password**: Create a strong password (e.g., `SecureAdminPass123!`)
   - **Auto Confirm User**: Toggle **ON**
5. Click **Create User**
6. **IMPORTANT**: Copy the **User ID** (UUID) that appears

Example UUID: `550e8400-e29b-41d4-a716-446655440000`

### Step 5.2: Create Admin Profile

Go to SQL Editor and create a new query:

```sql
-- Replace the UUID below with your actual admin user UUID from Step 5.1
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  timezone,
  locale,
  currency,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000', -- Replace with your UUID!
  'admin@easyeng.com',
  'Admin User',
  'admin',
  'Asia/Ho_Chi_Minh',
  'vi',
  'VND',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Verify the admin was created
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@easyeng.com';
```

**Click Run**

You should see one row with the admin user.

---

## Part 6: Create Test Data (Optional)

**IMPORTANT:** Use your actual user IDs from Supabase Authentication > Users tab.

Example user IDs (replace with your actual IDs):
- Student (Jimmy): `70311902-706f-416c-9520-192a6cc96072` (jimmycuong1413@gmail.com)
- Teacher: `7a46e4e2-782c-471a-ba1b-cea449e75028` (jimmycuong1414@gmail.com)

### Step 6.1: Update User Roles (if needed)

If your users were created but don't have the correct roles, update them:

```sql
-- Update Jimmy to be a student (if not already)
UPDATE public.profiles
SET role = 'student'
WHERE id = '70311902-7061-416f-9520-192a6cc96072';

-- Update teacher role (if not already)
UPDATE public.profiles
SET role = 'teacher'
WHERE id = '7a46e4e2-782c-471a-ba1b-cea449e75028';
```

**Click Run**

### Step 6.2: Create Teacher Profile

```sql
-- Create teacher profile for the teacher user
INSERT INTO public.teacher_profiles (
  user_id,
  bio,
  experience_years,
  hourly_rate,
  avg_rating,
  total_reviews,
  specialties,
  verified,
  created_at,
  updated_at
) VALUES (
  '7a46e4e2-782c-471a-ba1b-cea449e75028', -- Teacher user ID
  'Experienced English teacher with 5 years of teaching experience. Specialized in conversational English and IELTS preparation.',
  5,
  200000.00,
  4.85,
  42,
  ARRAY['IELTS', 'Conversational', 'Business English'],
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  bio = EXCLUDED.bio,
  experience_years = EXCLUDED.experience_years,
  hourly_rate = EXCLUDED.hourly_rate,
  verified = EXCLUDED.verified,
  updated_at = NOW();
```

**Click Run**

### Step 6.3: Create Test Bookings

```sql
-- Create test bookings between student and teacher
INSERT INTO public.bookings (student_id, teacher_id, scheduled_at, status, price, notes, created_at, updated_at) VALUES
-- Completed bookings
('70311902-706f-416c-9520-192a6cc96072', '7a46e4e2-782c-471a-ba1b-cea449e75028', NOW() - INTERVAL '2 days', 'completed', 200000, 'IELTS Speaking Practice', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('70311902-706f-416c-9520-192a6cc96072', '7a46e4e2-782c-471a-ba1b-cea449e75028', NOW() - INTERVAL '1 day', 'completed', 200000, 'Business English Conversation', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
-- Upcoming bookings
('70311902-706f-416c-9520-192a6cc96072', '7a46e4e2-782c-471a-ba1b-cea449e75028', NOW() + INTERVAL '1 day', 'confirmed', 200000, 'Grammar Focus Session', NOW(), NOW()),
('70311902-706f-416c-9520-192a6cc96072', '7a46e4e2-782c-471a-ba1b-cea449e75028', NOW() + INTERVAL '3 days', 'confirmed', 200000, 'IELTS Writing Practice', NOW(), NOW());
```

**Click Run**

### Step 6.4: Create Test Cookie Data

```sql
-- Create cookie balance for student
INSERT INTO public.cookie_balances (user_id, balance, lifetime_earned, lifetime_spent, created_at, updated_at) VALUES
('70311902-706f-416c-9520-192a6cc96072', 500, 1000, 500, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  lifetime_earned = EXCLUDED.lifetime_earned,
  lifetime_spent = EXCLUDED.lifetime_spent,
  updated_at = NOW();

-- Create cookie transactions for student
INSERT INTO public.cookie_transactions (user_id, amount, type, source, description, created_at) VALUES
-- Earnings
('70311902-706f-416c-9520-192a6cc96072', 100, 'earn', 'booking_completed', 'Earned from completing class', NOW() - INTERVAL '5 days'),
('70311902-706f-416c-9520-192a6cc96072', 150, 'earn', 'bonus', 'Welcome bonus', NOW() - INTERVAL '10 days'),
('70311902-706f-416c-9520-192a6cc96072', 50, 'earn', 'referral', 'Friend referral bonus', NOW() - INTERVAL '8 days'),
-- Spending
('70311902-706f-416c-9520-192a6cc96072', -50, 'spend', 'booking_discount', 'Discount on booking', NOW() - INTERVAL '3 days'),
('70311902-706f-416c-9520-192a6cc96072', -100, 'spend', 'booking_discount', 'Discount on booking', NOW() - INTERVAL '1 day');
```

**Click Run**

**Note:** Make sure to replace the user IDs above with your actual user IDs from Supabase Authentication > Users tab.

---

## Verification Checklist

### ✅ After completing all steps, verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- `bookings`
- `cookie_balances`
- `cookie_transactions`
- `profiles`
- `teacher_profiles`

```sql
-- Check admin user exists
SELECT id, email, full_name, role FROM public.profiles WHERE email = 'admin@easyeng.com';
```

Should return 1 row with role = 'admin'

```sql
-- Check user count
SELECT COUNT(*) as total_users FROM public.profiles;
```

Should show at least 1 (the admin)

---

## Troubleshooting

### Error: "Table profiles already exists"
- This means the table was already created. Skip the creation step.
- Run the verification queries to check the schema.

### Error: "Foreign key constraint failed"
- Make sure you're creating tables in this order:
  1. `profiles` (first, no dependencies)
  2. `teacher_profiles` (depends on profiles)
  3. `bookings` (depends on profiles)
  4. `cookie_balances` (depends on profiles)
  5. `cookie_transactions` (depends on profiles)

### Error: "Permission denied"
- Make sure you're logged in as the project owner/admin
- Check that you have permissions to create tables

### "RLS policy creation failed"
- Make sure the table was created successfully first
- Check that the auth schema exists

---

## Next Steps

1. **Verify the setup**: Run all verification queries above
2. **Test the admin login**: Login with `admin@easyeng.com` and the password you set
3. **Check admin dashboard**: Navigate to `/[locale]/dashboard/admin` and verify data loads
4. **Run the app**: `npm run dev` and test all features

---

## Database Schema Overview

```
profiles
├── id (UUID, PK, FK from auth.users)
├── email (TEXT, UNIQUE)
├── full_name (TEXT)
├── avatar_url (TEXT, nullable)
├── role (TEXT) - student|teacher|parent|admin
├── timezone (TEXT)
├── locale (TEXT) - vi|en
├── currency (TEXT) - VND|USD|EUR
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

bookings
├── id (UUID, PK)
├── student_id (UUID, FK → profiles)
├── teacher_id (UUID, FK → profiles)
├── scheduled_at (TIMESTAMP)
├── status (TEXT) - pending|confirmed|completed|cancelled
├── price (DECIMAL)
├── topic (TEXT)
├── notes (TEXT)
├── meeting_url (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

teacher_profiles
├── id (UUID, PK)
├── user_id (UUID, FK → profiles, UNIQUE)
├── bio (TEXT)
├── experience_years (INTEGER)
├── hourly_rate (DECIMAL)
├── avg_rating (DECIMAL)
├── total_reviews (INTEGER)
├── specialties (TEXT[])
├── verified (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

cookie_balances
├── id (UUID, PK)
├── user_id (UUID, FK → profiles, UNIQUE)
├── balance (INTEGER)
├── lifetime_earned (INTEGER)
├── lifetime_spent (INTEGER)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

cookie_transactions
├── id (UUID, PK)
├── user_id (UUID, FK → profiles)
├── amount (INTEGER)
├── type (TEXT) - earn|spend
├── source (TEXT)
├── description (TEXT, nullable)
└── created_at (TIMESTAMP)
```

---

**Questions?** Review the Supabase documentation: https://supabase.com/docs/guides/getting-started
