# Phase 3 Implementation - Setup Guide

## ✅ What's Been Implemented

### Frontend (59/59 tests passing)
- ✅ Shared constants (`shared/constants/gems.ts`)
- ✅ Utility functions (`gemCalculator.ts`, `discountValidation.ts`)
- ✅ React hook (`useGemsBalance.ts`)
- ✅ UI Components:
  - `GemDiscountSlider.tsx` - Interactive Gems slider
  - `ClassCard.tsx` - Class display component
  - `ClassCatalog.tsx` - Browse and filter classes
  - `BookingFlow.tsx` - Complete booking process
  - `book/page.tsx` - Main booking page

### Backend (TypeScript compiles ✅)
- ✅ Services (`gems.service.ts`, `booking.service.ts`)
- ✅ API Routes (`bookings.routes.ts`, `classes.routes.ts`, `gems.routes.ts`)
- ✅ Authentication middleware
- ✅ Environment configuration

### Database Migrations
- ✅ `004_classes.sql` - Classes table with capacity management
- ✅ `005_bookings.sql` - Bookings with 50% cap & $5 floor constraints
- ✅ `006_gem_transactions.sql` - Append-only ledger with balance validation
- ✅ `007_booking_rls.sql` - Row Level Security policies

## 🚀 Setup Instructions

### 1. Apply Database Migrations

#### Option A: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/APPLY_MIGRATIONS.sql`
4. Copy the entire content
5. Paste into the SQL Editor
6. Click **Run**

You should see success messages for all migrations.

#### Option B: Manual Migration Files

If you prefer to run migrations individually:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run each migration in order:
   - `supabase/migrations/004_classes.sql`
   - `supabase/migrations/005_bookings.sql`
   - `supabase/migrations/006_gem_transactions.sql`
   - `supabase/migrations/007_booking_rls.sql`

### 2. Verify Database Setup

After applying migrations, run this check:

```bash
cd backend
npx tsx scripts/check-tables.ts
```

You should see:
```
✅ profiles: Exists
✅ classes: Exists
✅ bookings: Exists
✅ gem_transactions: Exists
```

### 3. Start the Backend Server

```bash
cd backend
npm run dev
```

Server should start on http://localhost:4000

Test the API:
```bash
curl http://localhost:4000/health
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend should start on http://localhost:3000

Visit: http://localhost:3000/en/book

### 5. Test the Flow

#### Create a Test User

1. Register at http://localhost:3000/en/auth/register
2. Create account with:
   - Email: student@test.com
   - Password: Test123!
   - Role: Student

#### Grant Test Gems (Via Supabase SQL Editor)

```sql
-- Get your user ID
SELECT id FROM profiles WHERE email = 'student@test.com';

-- Grant 10,000 test Gems
INSERT INTO gem_transactions (user_id, amount, transaction_type, description)
VALUES 
  ('<your-user-id>', 10000, 'admin_grant', 'Test Gems for development');

-- Verify balance
SELECT get_gems_balance('<your-user-id>');
```

#### Create a Test Class (As Teacher)

1. Create teacher account or switch role
2. Use API or create via SQL:

```sql
-- Create a test class
INSERT INTO classes (
  teacher_id, 
  title, 
  description, 
  level, 
  price, 
  max_students, 
  start_time, 
  end_time, 
  duration_minutes,
  status
)
VALUES (
  '<teacher-user-id>',
  'Beginner English Conversation',
  'Practice basic English conversation skills',
  'beginner',
  20.00,
  10,
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days 1 hour',
  60,
  'scheduled'
);
```

#### Test Booking Flow

1. Login as student
2. Navigate to http://localhost:3000/en/book
3. Browse available classes
4. Click "Book Now" on a class
5. Use the Gems slider to apply discount
6. Observe:
   - Real-time price updates
   - 50% discount cap enforcement
   - $5 minimum price enforcement
   - Gems balance validation
7. Complete booking

## 📊 Testing the Business Rules

### Test 50% Discount Cap

For a $20 class:
- Max Gems usable: 1,000 (= $10 = 50%)
- Final price: $10 minimum

### Test $5 Minimum Price

For a $8 class:
- Max Gems usable: 300 (= $3)
- Final price: $5 minimum (cannot go lower)

For a $5 class:
- Max Gems usable: 0
- No discount allowed

### Test Negative Balance Prevention

Try to use more Gems than you have:
- Should show error: "Insufficient Gems balance"
- Transaction should be rejected

### Test Atomicity

Simulate payment failure:
- Booking should rollback
- Gems should NOT be deducted
- Class enrollment should NOT increment

## 🔧 Troubleshooting

### Migration Errors

If you see "type already exists":
- These errors are expected and safe (using `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object ...`)
- The migration checks if types exist before creating

### Connection Errors

If backend can't connect to Supabase:
1. Check `.env` file exists in `backend/` directory
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
3. Test connection: `npx tsx scripts/check-tables.ts`

### Frontend Build Errors

If you see missing UI component errors (radio-group, dropdown-menu, switch):
- These are unrelated to Phase 3 implementation
- They're from other parts of the app
- Phase 3 components work independently

## 📁 File Structure

```
backend/
  src/
    config/
      supabase.ts          # Supabase client
    services/
      gems.service.ts      # Gems operations
      booking.service.ts   # Booking with Gems
    routes/
      bookings.routes.ts   # Booking API
      classes.routes.ts    # Classes API  
      gems.routes.ts       # Gems API
    types/
      express.d.ts         # Type extensions
  scripts/
    check-tables.ts        # Verify migrations
  .env                     # Environment config

frontend/
  src/
    hooks/
      useGemsBalance.ts    # Gems balance hook
    components/booking/
      ClassCatalog.tsx     # Browse classes
      ClassCard.tsx        # Class display
      GemDiscountSlider.tsx # Gems slider
      BookingFlow.tsx      # Booking process
    app/[locale]/book/
      page.tsx             # Booking page
    utils/
      gemCalculator.ts     # Calculations (30 tests ✅)
      discountValidation.ts # Validation (29 tests ✅)

shared/
  constants/
    gems.ts                # Business rules

supabase/
  migrations/
    004_classes.sql        # Classes table
    005_bookings.sql       # Bookings table
    006_gem_transactions.sql # Gems ledger
    007_booking_rls.sql    # Security policies
  APPLY_MIGRATIONS.sql     # Consolidated migration
```

## ✅ Success Criteria

Phase 3 implementation is complete when:

- [x] All unit tests pass (59/59 ✅)
- [x] Backend compiles without errors ✅
- [ ] Database migrations applied successfully
- [ ] Backend server starts without errors
- [ ] Frontend dev server starts
- [ ] Can browse classes
- [ ] Can apply Gems discount with slider
- [ ] Can complete a booking
- [ ] Gems balance updates correctly
- [ ] Business rules enforced (50% cap, $5 floor)

## 🎯 Next Steps

After verifying the implementation:

1. **Integration Testing**: Test end-to-end flow with real data
2. **Payment Gateway**: Replace mock payment with Stripe/PayPal/VNPay
3. **Email Notifications**: Send booking confirmations
4. **Class Management**: Teacher dashboard for class creation
5. **Gems Earning**: Implement earning mechanisms (class completion, referrals)
6. **Phase 4**: Implement next user story

## 📝 Notes

- All business rules are enforced at database level (constraints + triggers)
- Frontend validation provides immediate UX feedback
- Backend services handle atomic transactions
- RLS policies ensure secure multi-tenant access
- Append-only ledger prevents Gems balance corruption
