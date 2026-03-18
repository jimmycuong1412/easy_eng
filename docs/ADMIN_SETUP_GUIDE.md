# Admin Dashboard Setup Guide

## Complete Instructions for Setting Up Admin User & Real Data

This guide will help you set up a test admin user in Supabase and enable real data in the admin dashboard.

---

## Step 1: Create Admin User in Supabase Auth

### 1.1 Go to Supabase Dashboard

1. Open [Supabase Console](https://supabase.com)
2. Select your project: `easy_eng`
3. Click on **Authentication** in the left sidebar
4. Click **Users** tab

### 1.2 Create New Auth User

1. Click **Add User** button
2. Fill in the form:
   - **Email**: `admin@easyeng.com` (or your preferred email)
   - **Password**: Create a strong password (e.g., `SecureAdminPass123!`)
   - **Auto Confirm User**: Toggle ON (so you don't need email verification)
3. Click **Create User**
4. **Important**: Copy the User ID (UUID) that appears after creation

**Example User ID**: `550e8400-e29b-41d4-a716-446655440000`

---

## Step 2: Create Admin Profile in Database

### 2.1 Update SQL Script

Open the SQL script: `database/migrations/create_admin_user.sql`

Replace this line:
```sql
'YOUR_SUPABASE_AUTH_USER_ID', -- Replace with actual UUID
```

With your actual user ID copied in Step 1.2:
```sql
'550e8400-e29b-41d4-a716-446655440000',
```

### 2.2 Run SQL Script in Supabase

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy and paste the entire SQL script from `create_admin_user.sql`
4. Click **Run** button
5. You should see: "Rows updated: 1"

**Verify**: Run this query to confirm:
```sql
SELECT id, email, full_name, role FROM profiles WHERE email = 'admin@easyeng.com';
```

You should see one row with `role = 'admin'`.

---

## Step 3: Test Admin Login

### 3.1 Start Development Server

```bash
cd f:/Git/easy_eng/frontend
npm run dev
```

The server will start at `http://localhost:3000`

### 3.2 Login with Admin Account

1. Navigate to: `http://localhost:3000/vi/auth/login`
   (or `http://localhost:3000/en/auth/login` for English)

2. Enter credentials:
   - **Email**: `admin@easyeng.com`
   - **Password**: The password you set in Step 1.2

3. Click **Login**

4. You should be redirected to: `http://localhost:3000/vi/dashboard/admin`

---

## Step 4: Verify Admin Dashboard

### 4.1 Dashboard Should Display:

✅ Real data from your Supabase database:
- **Total Users**: Count from `profiles` table
- **Total Revenue**: Sum of completed bookings' prices
- **Cookies in Circulation**: Sum of cookie balances
- **Total Bookings**: Count from `bookings` table
- **Top Teachers**: Teachers ranked by revenue
- **Cookie Analytics**: Monthly issued/redeemed cookies
- **Recent Activities**: System events (if any exist)

### 4.2 What If You See Loading State?

If you see "جاري التحميل..." (Loading):

1. Wait a few seconds - data is being fetched
2. If it stays loading, check browser console (F12):
   - Look for errors in the Console tab
   - Check Network tab for failed requests

### 4.3 What If Data Shows Zero?

This is normal! It means:
- You don't have any users created yet
- No bookings have been made
- No cookies have been issued

**Next step**: Create some test data to populate the dashboard.

---

## Step 5: Create Test Data (Optional)

To populate the dashboard with sample data, follow these steps:

### 5.1 Create Test Users

Run in Supabase SQL Editor:

```sql
-- Create test students
INSERT INTO profiles (id, email, full_name, role, timezone, locale, currency) VALUES
('11111111-1111-1111-1111-111111111111', 'student1@test.com', 'Student One', 'student', 'Asia/Ho_Chi_Minh', 'vi', 'VND'),
('22222222-2222-2222-2222-222222222222', 'student2@test.com', 'Student Two', 'student', 'Asia/Ho_Chi_Minh', 'vi', 'VND');

-- Create test teachers
INSERT INTO profiles (id, email, full_name, role, timezone, locale, currency) VALUES
('33333333-3333-3333-3333-333333333333', 'teacher1@test.com', 'Teacher One', 'teacher', 'Asia/Ho_Chi_Minh', 'vi', 'VND'),
('44444444-4444-4444-4444-444444444444', 'teacher2@test.com', 'Teacher Two', 'teacher', 'Asia/Ho_Chi_Minh', 'vi', 'VND');
```

### 5.2 Create Test Bookings

```sql
-- Create completed bookings with revenue
INSERT INTO bookings (student_id, teacher_id, scheduled_at, status, price, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 days', 'completed', 150000, NOW() - INTERVAL '2 days'),
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '1 day', 'completed', 200000, NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NOW(), 'confirmed', 150000, NOW());
```

### 5.3 Create Test Cookies

```sql
-- Create cookie balances
INSERT INTO cookie_balances (user_id, balance, lifetime_earned, lifetime_spent) VALUES
('11111111-1111-1111-1111-111111111111', 500, 1000, 500),
('22222222-2222-2222-2222-222222222222', 750, 1500, 750);

-- Create cookie transactions
INSERT INTO cookie_transactions (user_id, amount, type, source, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 100, 'earn', 'booking', NOW() - INTERVAL '5 days'),
('11111111-1111-1111-1111-111111111111', 50, 'spend', 'booking_discount', NOW() - INTERVAL '3 days'),
('22222222-2222-2222-2222-222222222222', 150, 'earn', 'booking', NOW() - INTERVAL '4 days');
```

### 5.4 Refresh Dashboard

1. Go back to admin dashboard: `http://localhost:3000/vi/dashboard/admin`
2. Press **F5** to refresh or click the **Xuất báo cáo** button area
3. Data should now display with your test values

---

## Step 6: Admin Dashboard Features

### Available Statistics

**Platform Stats:**
- Total Users (students, teachers, parents)
- User growth percentages

**Revenue Stats:**
- Total Revenue (VND)
- Monthly Revenue
- Average Booking Value
- Pending Payouts

**Cookie System:**
- Total Circulating Cookies
- Monthly Issued Cookies
- Monthly Redeemed Cookies
- Average Redemption per Booking

**Booking Stats:**
- Total Bookings
- Completed This Month
- Completion Rate %
- Average Rating

**Top Teachers:**
- Ranked by revenue earned
- Number of bookings
- Average rating
- Avatar display (if available)

**Recent Activities:**
- User signups
- Bookings created
- Payments processed
- Teacher verifications
- User reports

---

## Troubleshooting

### Issue: "Access Denied" on Admin Dashboard

**Solution:**
1. Check your user's role in Supabase:
   ```sql
   SELECT email, role FROM profiles WHERE email = 'admin@easyeng.com';
   ```
2. Make sure role is `'admin'` (not `'student'`, `'teacher'`, etc.)
3. If needed, update it:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@easyeng.com';
   ```

### Issue: "Failed to load data" Error

**Solution:**
1. Open browser console (F12)
2. Check for error messages
3. Verify Supabase credentials in `.env.local` are correct
4. Restart dev server: `npm run dev`

### Issue: Dashboard Shows Only Zeros

**Solution:**
1. This is normal for a new database
2. Create test data following Step 5
3. Or create real bookings by using the app

### Issue: Can't Login

**Solution:**
1. Make sure user was created with **Auto Confirm User** enabled
2. Check email matches exactly: `admin@easyeng.com`
3. Try resetting password in Supabase

---

## Next Steps

Once the admin dashboard is working:

1. **Add more admin features**:
   - User management (suspend, delete, change roles)
   - Booking analytics and export
   - Teacher performance metrics
   - Payment reconciliation

2. **Set up real data**:
   - Create more test users
   - Simulate real bookings and transactions
   - Test cookie system flows

3. **Configure alerts**:
   - Low revenue alerts
   - Unusual activity detection
   - System health monitoring

---

## Files Created/Modified

**New Files:**
- `database/migrations/create_admin_user.sql` - Admin user setup SQL
- `src/app/[locale]/dashboard/admin/actions.ts` - Server actions for data fetching

**Modified Files:**
- `src/app/[locale]/dashboard/admin/page.tsx` - Updated to use real data

---

## API Endpoints Used

The admin dashboard uses these server actions to fetch real data:

- `getPlatformStats()` - User counts from profiles table
- `getRevenueStats()` - Revenue calculations from bookings
- `getCookieStats()` - Cookie balance and transaction summaries
- `getBookingStats()` - Booking counts and completion rates
- `getTopTeachers()` - Teacher rankings by revenue
- `getRecentActivities()` - System activity log

All data fetching happens server-side for security.

---

## Questions?

If you encounter issues:

1. Check the console for error messages
2. Verify credentials in Supabase
3. Make sure user role is set to `'admin'`
4. Restart the development server

Good luck! 🚀
