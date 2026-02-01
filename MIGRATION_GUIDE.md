# Database Migration Guide

## Migration 006a: Enhanced Gems Transaction Integrity

**Date**: 2026-01-31
**Purpose**: Add idempotency, audit logging, rollback support, and concurrency protection to Gems system

---

## Option 1: Apply via Supabase SQL Editor (Recommended)

### Steps:

1. **Open your Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the migration**
   - Open `supabase/APPLY_006A_MIGRATION.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for completion

5. **Verify success**
   - You should see success messages in the output
   - Check for "✅ Migration 006a Applied Successfully!"

---

## Option 2: Apply via Supabase CLI

### Prerequisites:
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login
```

### Steps:

```bash
# Navigate to project directory
cd /f/Git/easy_eng

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push --db-url "your-database-url"
```

---

## Option 3: Apply Complete Migrations (Fresh Database)

If you're setting up a fresh database, use the complete migration file:

### Via Supabase SQL Editor:

1. Open `supabase/APPLY_MIGRATIONS.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Run

This will apply ALL migrations including:
- 004_classes.sql
- 005_bookings.sql
- 006_gem_transactions.sql
- 006a_gem_constraints.sql ⭐ **NEW**
- 007_booking_rls.sql

---

## Verification

After applying the migration, verify it was successful:

### 1. Check New Tables

```sql
-- Should return the audit log table
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'gem_transaction_audit_log';
```

### 2. Check New Functions

```sql
-- Should return 5 functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_gems_balance',
  'validate_gems_balance',
  'refresh_gems_balances',
  'rollback_gems_transaction',
  'atomic_deduct_gems'
);
```

### 3. Check New Views

```sql
-- Should return 3 views
SELECT table_name
FROM information_schema.views
WHERE table_name IN (
  'user_gems_balances',
  'gem_balance_discrepancies'
);
```

### 4. Test Balance Discrepancy Detection

```sql
-- Should return 0 rows (no discrepancies)
SELECT * FROM gem_balance_discrepancies;
```

### 5. Check Audit Log Structure

```sql
-- Should show the audit log structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gem_transaction_audit_log'
ORDER BY ordinal_position;
```

---

## What This Migration Adds

### ✅ Idempotency Support
- Prevents duplicate transactions with unique keys
- Protects against double-clicking and network retries

### ✅ Audit Log Table
- `gem_transaction_audit_log` tracks ALL transaction attempts
- Records both successful and failed operations
- Includes balance before/after for each operation
- Enables fraud detection and debugging

### ✅ Enhanced Validation
- Updated `validate_gems_balance()` function
- Logs all transactions to audit trail
- Provides detailed error messages
- Tracks failed negative balance attempts

### ✅ Rollback Support
- `rollback_gems_transaction(transaction_id, reason)` function
- Creates reversal transactions
- Maintains audit trail
- **Admin only** - restricted to service_role

### ✅ Concurrency Protection
- `atomic_deduct_gems()` function
- Row-level locking prevents race conditions
- Atomic check-and-deduct operation
- Prevents double-spending

### ✅ Reconciliation Tools
- `gem_balance_discrepancies` view
- Detects balance calculation errors
- Enables proactive monitoring

---

## Testing the Migration

### Test 1: Create a Test Transaction

```sql
-- Insert a test earning transaction
INSERT INTO gem_transactions (
  user_id,
  amount,
  transaction_type,
  description
) VALUES (
  auth.uid(), -- Your user ID
  100,
  'admin_grant',
  'Test transaction'
);

-- Check audit log
SELECT * FROM gem_transaction_audit_log
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2: Test Negative Balance Prevention

```sql
-- Try to deduct more than you have (should fail)
INSERT INTO gem_transactions (
  user_id,
  amount,
  transaction_type,
  description
) VALUES (
  auth.uid(),
  -99999,
  'booking_discount',
  'Test overdraft'
);

-- Check failed attempt in audit log
SELECT * FROM gem_transaction_audit_log
WHERE user_id = auth.uid()
AND success = false
ORDER BY created_at DESC
LIMIT 1;
```

### Test 3: Test Atomic Deduction

```sql
-- Use atomic deduction (safe for concurrent operations)
SELECT atomic_deduct_gems(
  auth.uid(),           -- user_id
  50,                   -- amount to deduct
  'booking_discount',   -- transaction_type
  'Test booking'        -- description
);

-- Check your balance
SELECT get_gems_balance(auth.uid());
```

---

## Rollback Instructions

If you need to rollback this migration:

```sql
BEGIN;

-- Drop new objects
DROP VIEW IF EXISTS gem_balance_discrepancies CASCADE;
DROP FUNCTION IF EXISTS rollback_gems_transaction(UUID, TEXT);
DROP FUNCTION IF EXISTS atomic_deduct_gems(UUID, INTEGER, gem_transaction_type, TEXT, UUID, UUID, JSONB);
DROP TABLE IF EXISTS gem_transaction_audit_log CASCADE;

-- Remove idempotency column
ALTER TABLE gem_transactions DROP COLUMN IF EXISTS idempotency_key;

-- Restore original validation function
CREATE OR REPLACE FUNCTION validate_gems_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  current_balance := get_gems_balance(NEW.user_id);
  new_balance := current_balance + NEW.amount;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Gems balance. Current: %, Attempting to deduct: %, Would result in: %',
      current_balance, ABS(NEW.amount), new_balance;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## Troubleshooting

### Error: "relation 'gem_transactions' does not exist"

**Solution**: You need to apply migration 006_gem_transactions.sql first.

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'gem_transactions';
```

### Error: "function get_gems_balance does not exist"

**Solution**: Run the base migration 006 first, then 006a.

### Error: "trigger 'validate_gems_before_insert' does not exist"

**Solution**: The base trigger from migration 006 is missing. Apply that migration first.

---

## Support

If you encounter issues:

1. Check the Supabase logs in Dashboard → Database → Logs
2. Verify all prerequisites are met
3. Try the verification queries above
4. Check for error messages in the SQL Editor output

---

**Migration Status**: Ready to apply ✅
**Estimated Duration**: < 1 minute
**Risk Level**: Low (non-destructive, adds new features)
**Rollback Available**: Yes

---

*Last Updated: 2026-01-31*
