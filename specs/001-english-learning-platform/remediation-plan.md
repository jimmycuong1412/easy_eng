# Remediation Plan: Critical and High-Priority Issues

**Project**: Modern English Learning Platform
**Branch**: `001-english-learning-platform`
**Date**: 2026-01-28
**Input**: Cross-artifact analysis (spec.md, plan.md, tasks.md)

---

## Executive Summary

This document provides detailed remediation steps for the top 10 critical/high-priority issues identified in the cross-artifact analysis. Each remediation includes:

- Specific task additions with IDs, priorities, and file paths
- Exact file edits with line numbers and replacement text
- Configuration examples and test templates
- Effort estimates and dependency mappings

**Total Estimated Effort**: 18-22 developer-days
**Critical Path**: Issues 1-4 (Testing & Security) must be completed before MVP deployment

---

## CRITICAL Issue 1: D1-D3 Testing Discipline Violations

### Problem Statement

The current implementation plan violates the project constitution's **Principle II: Testing Discipline (NON-NEGOTIABLE)**. Tests are not created before implementation code, and no test infrastructure exists.

**Impact**: HIGH - Cannot verify code correctness, violates constitution, blocks production deployment
**Effort**: 3-4 days
**Priority**: P0 (Must complete before any implementation)

---

### Remediation 1.1: Add Phase 0 - Test Infrastructure Setup

**Location**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`
**Action**: Insert new Phase 0 before Phase 1

**Line Number**: Insert after line 14 (before Phase 1)

**New Content**:

```markdown
## Phase 0: Test Infrastructure Setup (CRITICAL - Constitution Requirement)

**Purpose**: Establish test-first development environment per Constitution Principle II

**⚠️ CRITICAL**: This phase MUST be complete before ANY implementation code is written

### Frontend Testing Setup

- [ ] T000 [P0] [TDD] Install Jest 29+ and configure in frontend/jest.config.js
- [ ] T001 [P0] [TDD] Install React Testing Library and configure test utilities in frontend/src/test/setup.ts
- [ ] T002 [P0] [TDD] Install Playwright and configure E2E testing in frontend/playwright.config.ts
- [ ] T003 [P0] [TDD] Configure code coverage reporting (80% threshold) in frontend/jest.config.js
- [ ] T004 [P0] [TDD] Create test helper utilities in frontend/src/test/helpers/
- [ ] T005 [P0] [TDD] Setup mock Supabase client for testing in frontend/src/test/mocks/supabase.ts

### Backend Testing Setup

- [ ] T006 [P0] [TDD] Install Vitest for Edge Functions in supabase/functions/package.json
- [ ] T007 [P0] [TDD] Configure Vitest in supabase/functions/vitest.config.ts
- [ ] T008 [P0] [TDD] Create Edge Function test helpers in supabase/functions/_shared/test-helpers.ts
- [ ] T009 [P0] [TDD] Setup database test fixtures in supabase/tests/fixtures/

### CI/CD Integration

- [ ] T010 [P0] [TDD] Create GitHub Actions workflow for test execution in .github/workflows/test.yml
- [ ] T011 [P0] [TDD] Configure pre-commit hook to run tests in .husky/pre-commit
- [ ] T012 [P0] [TDD] Setup coverage reporting to GitHub in .github/workflows/coverage.yml
- [ ] T013 [P0] [TDD] Configure test failure blocking for PR merges in .github/workflows/pr-checks.yml

**Checkpoint**: Test infrastructure ready - TDD can begin

---
```

---

### Remediation 1.2: Configure 80% Coverage Threshold

**File**: `F:/Git/easy_eng/frontend/jest.config.js` (new file)

**Action**: Create new file

**Content**:

```javascript
// jest.config.js - Enforce 80% coverage threshold per Constitution
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/test/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

---

### Remediation 1.3: Insert Test Tasks Before Implementation

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Action**: For EACH user story phase, insert test tasks BEFORE implementation tasks

**Example for Phase 3 (User Story 1)**:

**Line Number**: Insert after line 69 (before "### Database Schema for US1")

**New Content**:

```markdown
### Test Suite for US1 (Test-First Approach)

- [ ] T023A [P0] [US1] [TEST] Write unit tests for Cookie calculation utilities in frontend/src/utils/__tests__/cookieCalculator.test.ts
- [ ] T023B [P0] [US1] [TEST] Write integration tests for booking flow in frontend/src/components/booking/__tests__/BookingFlow.test.tsx
- [ ] T023C [P0] [US1] [TEST] Write E2E test for complete booking with Cookie discount in frontend/tests/e2e/booking.spec.ts
- [ ] T023D [P0] [US1] [TEST] Write unit tests for process-booking Edge Function in supabase/functions/process-booking/__tests__/index.test.ts
- [ ] T023E [P0] [US1] [TEST] Write integration tests for Cookie transaction atomicity in supabase/functions/__tests__/cookie-transactions.test.ts

**⚠️ CRITICAL**: All T023A-T023E tests must be written AND PASSING before implementing T024-T046
```

**Repeat this pattern for Phases 4-7 (User Stories 2-5)**

---

### Remediation 1.4: GitHub Actions Workflow

**File**: `F:/Git/easy_eng/.github/workflows/test.yml` (new file)

**Content**:

```yaml
name: Test Suite

on:
  push:
    branches: [main, 001-english-learning-platform]
  pull_request:
    branches: [main, 001-english-learning-platform]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run unit tests with coverage
        working-directory: frontend
        run: npm run test:coverage

      - name: Check coverage threshold (80%)
        working-directory: frontend
        run: |
          npm run test:coverage -- --coverageReporters=json-summary
          node -e "
            const coverage = require('./coverage/coverage-summary.json').total;
            const threshold = 80;
            const metrics = ['lines', 'statements', 'functions', 'branches'];
            metrics.forEach(m => {
              if (coverage[m].pct < threshold) {
                throw new Error(\`Coverage for \${m} is \${coverage[m].pct}%, below \${threshold}%\`);
              }
            });
            console.log('✅ All coverage metrics meet 80% threshold');
          "

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          directory: ./frontend/coverage

  edge-function-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - name: Run Edge Function tests
        working-directory: supabase/functions
        run: deno test --allow-all --coverage=coverage

      - name: Check Edge Function coverage
        working-directory: supabase/functions
        run: deno coverage coverage --lcov --output=coverage.lcov

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Playwright
        working-directory: frontend
        run: npx playwright install --with-deps

      - name: Run E2E tests
        working-directory: frontend
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

### Remediation 1.5: Update package.json Scripts

**File**: `F:/Git/easy_eng/frontend/package.json`

**Line Number**: Find the `"scripts"` section and add/update:

**Old Content** (if exists):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

**New Content**:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "jest --watch",
  "test:ci": "jest --ci --coverage",
  "test:coverage": "jest --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "lint": "next lint",
  "type-check": "tsc --noEmit"
}
```

---

## CRITICAL Issue 2: D4 - RBAC Server-Side Enforcement Testing

### Problem Statement

Role-based access control (RBAC) is mentioned in the plan but lacks automated server-side permission tests. This creates a security vulnerability where client-side checks could be bypassed.

**Impact**: CRITICAL - Security vulnerability, unauthorized data access
**Effort**: 2-3 days
**Priority**: P0 (Must complete before MVP deployment)

---

### Remediation 2.1: Add RBAC Test Tasks

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line Number**: Insert after Phase 4 checkpoint (line 148)

**New Content**:

```markdown
### RBAC Security Testing (Critical)

- [ ] T063A [P0] [US2] [SECURITY] Write RLS policy tests for student-only data access in supabase/tests/rls/student-access.test.sql
- [ ] T063B [P0] [US2] [SECURITY] Write RLS policy tests for teacher-only data access in supabase/tests/rls/teacher-access.test.sql
- [ ] T063C [P0] [US2] [SECURITY] Write RLS policy tests for admin-only data access in supabase/tests/rls/admin-access.test.sql
- [ ] T063D [P0] [US2] [SECURITY] Write automated tests for cross-role permission violations in supabase/tests/rls/cross-role-violations.test.sql
- [ ] T063E [P0] [US2] [SECURITY] Create E2E test for role escalation attempts in frontend/tests/e2e/security/role-escalation.spec.ts
- [ ] T063F [P0] [US2] [SECURITY] Create E2E test for unauthorized dashboard access in frontend/tests/e2e/security/unauthorized-access.spec.ts

**⚠️ SECURITY GATE**: All RBAC tests must pass before production deployment
```

---

### Remediation 2.2: RLS Test Template

**File**: `F:/Git/easy_eng/supabase/tests/rls/student-access.test.sql` (new file)

**Content**:

```sql
-- Test: Student can only access their own data
BEGIN;

-- Setup test data
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(10);

-- Create test users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'student2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'teacher1@test.com');

INSERT INTO profiles (id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'student'),
  ('22222222-2222-2222-2222-222222222222', 'student'),
  ('33333333-3333-3333-3333-333333333333', 'teacher');

-- Insert test bookings
INSERT INTO bookings (id, student_id, class_id, cookies_used) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'class-1', 10),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'class-2', 5);

-- Test 1: Student can read their own bookings
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims ->> 'sub' TO '11111111-1111-1111-1111-111111111111';

SELECT ok(
  COUNT(*) = 1,
  'Student can read their own bookings'
) FROM bookings WHERE student_id = '11111111-1111-1111-1111-111111111111';

-- Test 2: Student CANNOT read other students' bookings
SELECT ok(
  COUNT(*) = 0,
  'Student cannot read other students bookings'
) FROM bookings WHERE student_id = '22222222-2222-2222-2222-222222222222';

-- Test 3: Student CANNOT update other students' bookings
UPDATE bookings SET cookies_used = 999
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT ok(
  (SELECT cookies_used FROM bookings WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 5,
  'Student cannot update other students bookings'
);

-- Test 4: Student CANNOT delete other students' bookings
DELETE FROM bookings WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT ok(
  EXISTS(SELECT 1 FROM bookings WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Student cannot delete other students bookings'
);

-- Test 5: Student CANNOT read Cookie transactions of other students
SELECT ok(
  COUNT(*) = 0,
  'Student cannot read other students Cookie transactions'
) FROM cookie_transactions WHERE user_id = '22222222-2222-2222-2222-222222222222';

-- Test 6: Student CANNOT insert Cookie transactions manually
INSERT INTO cookie_transactions (user_id, amount, transaction_type, reason)
VALUES ('11111111-1111-1111-1111-111111111111', 999, 'earned', 'manual_insert');

SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM cookie_transactions
    WHERE reason = 'manual_insert'
  ),
  'Student cannot manually insert Cookie transactions'
);

-- Test 7: Student CANNOT access admin-only tables
SELECT ok(
  COUNT(*) = 0,
  'Student cannot read admin analytics'
) FROM analytics_summary;

-- Test 8: Student CANNOT modify class details
UPDATE classes SET price = 0 WHERE id = 'class-1';

SELECT ok(
  (SELECT price FROM classes WHERE id = 'class-1') > 0,
  'Student cannot modify class pricing'
);

-- Test 9: Student CANNOT access teacher earnings
SELECT ok(
  COUNT(*) = 0,
  'Student cannot read teacher earnings'
) FROM teacher_earnings;

-- Test 10: Student CAN read public class information
SELECT ok(
  COUNT(*) > 0,
  'Student can browse available classes'
) FROM classes WHERE status = 'published';

SELECT * FROM finish();
ROLLBACK;
```

---

### Remediation 2.3: E2E Security Test

**File**: `F:/Git/easy_eng/frontend/tests/e2e/security/unauthorized-access.spec.ts` (new file)

**Content**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('RBAC Security - Unauthorized Access Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('Student cannot access teacher dashboard', async ({ page }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'student@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-btn"]');

    // Wait for redirect to student dashboard
    await expect(page).toHaveURL('/student/dashboard');

    // Attempt to access teacher dashboard directly
    await page.goto('/teacher/dashboard');

    // Should be redirected or see 403 error
    await expect(page).toHaveURL(/\/(student\/dashboard|403|unauthorized)/);

    // Should NOT see teacher-specific content
    const teacherContent = page.locator('[data-testid="teacher-earnings"]');
    await expect(teacherContent).not.toBeVisible();
  });

  test('Student cannot access admin dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'student@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-btn"]');

    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/(student\/dashboard|403|unauthorized)/);

    const adminContent = page.locator('[data-testid="user-management"]');
    await expect(adminContent).not.toBeVisible();
  });

  test('Teacher cannot access admin user management', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'teacher@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-btn"]');

    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/(teacher\/dashboard|403|unauthorized)/);
  });

  test('Unauthenticated user cannot access any dashboard', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL('/auth/login');

    await page.goto('/teacher/dashboard');
    await expect(page).toHaveURL('/auth/login');

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/auth/login');
  });

  test('API calls enforce server-side role checks', async ({ page, request }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'student@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-btn"]');

    // Extract auth token from page context
    const cookies = await page.context().cookies();
    const authToken = cookies.find(c => c.name === 'sb-access-token')?.value;

    // Attempt to call admin-only API endpoint
    const response = await request.get('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // Should return 403 Forbidden
    expect(response.status()).toBe(403);
  });
});
```

---

## CRITICAL Issue 3: D5 - Currency Transaction Integrity Tests

### Problem Statement

Cookie transactions lack comprehensive test coverage for atomic operations, rollback scenarios, and balance integrity. This risks financial inconsistencies in the virtual currency system.

**Impact**: CRITICAL - Financial integrity, user trust, audit compliance
**Effort**: 2-3 days
**Priority**: P0 (Must complete before MVP deployment)

---

### Remediation 3.1: Add Cookie Transaction Test Tasks

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line Number**: Insert after Phase 9 (line 337)

**New Content**:

```markdown
### Cookie Transaction Integrity Testing (Critical)

- [ ] T139A [P0] [CURRENCY] [TEST] Write unit tests for Cookie balance calculations in frontend/src/utils/__tests__/cookieBalance.test.ts
- [ ] T139B [P0] [CURRENCY] [TEST] Write integration tests for atomic Cookie transactions in supabase/functions/__tests__/cookie-atomicity.test.ts
- [ ] T139C [P0] [CURRENCY] [TEST] Write rollback tests for failed booking after Cookie deduction in supabase/functions/__tests__/cookie-rollback.test.ts
- [ ] T139D [P0] [CURRENCY] [TEST] Write negative balance prevention tests in supabase/functions/__tests__/cookie-negative-balance.test.ts
- [ ] T139E [P0] [CURRENCY] [TEST] Write concurrent transaction conflict tests in supabase/functions/__tests__/cookie-concurrency.test.ts
- [ ] T139F [P0] [CURRENCY] [TEST] Write audit log completeness tests in supabase/tests/cookie-audit.test.sql
- [ ] T139G [P0] [CURRENCY] [TEST] Write Cookie expiration correctness tests in supabase/functions/__tests__/cookie-expiration.test.ts
- [ ] T139H [P0] [CURRENCY] [TEST] Write E2E test for complete booking-payment-Cookie flow in frontend/tests/e2e/booking-cookie-flow.spec.ts

**⚠️ FINANCIAL GATE**: All Cookie integrity tests must pass before production deployment
```

---

### Remediation 3.2: Cookie Atomicity Test

**File**: `F:/Git/easy_eng/supabase/functions/__tests__/cookie-atomicity.test.ts` (new file)

**Content**:

```typescript
import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
);

Deno.test('Cookie Transaction - Atomic booking with rollback', async () => {
  const testStudentId = 'test-student-001';

  // Setup: Give student 100 Cookies
  await supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: 100,
    transaction_type: 'earned',
    reason: 'test_setup'
  });

  // Verify initial balance
  const { data: initialBalance } = await supabase
    .from('student_cookies')
    .select('balance')
    .eq('student_id', testStudentId)
    .single();

  assertEquals(initialBalance?.balance, 100);

  // Simulate booking that FAILS after Cookie deduction
  try {
    // Step 1: Deduct Cookies
    await supabase.from('cookie_transactions').insert({
      user_id: testStudentId,
      amount: -50,
      transaction_type: 'spent',
      reason: 'class_booking'
    });

    // Step 2: Simulate booking failure (throw error)
    throw new Error('Payment gateway timeout');

  } catch (error) {
    // Step 3: ROLLBACK - Restore Cookies
    await supabase.from('cookie_transactions').insert({
      user_id: testStudentId,
      amount: 50,
      transaction_type: 'refunded',
      reason: 'booking_failed'
    });
  }

  // Verify balance restored to 100
  const { data: finalBalance } = await supabase
    .from('student_cookies')
    .select('balance')
    .eq('student_id', testStudentId)
    .single();

  assertEquals(finalBalance?.balance, 100, 'Cookie balance should be restored after failed booking');

  // Verify audit trail shows all 3 transactions
  const { data: transactions } = await supabase
    .from('cookie_transactions')
    .select('*')
    .eq('user_id', testStudentId)
    .order('created_at', { ascending: true });

  assertEquals(transactions?.length, 3);
  assertEquals(transactions?.[0].transaction_type, 'earned');
  assertEquals(transactions?.[1].transaction_type, 'spent');
  assertEquals(transactions?.[2].transaction_type, 'refunded');
});

Deno.test('Cookie Transaction - Prevent negative balance', async () => {
  const testStudentId = 'test-student-002';

  // Setup: Give student 10 Cookies
  await supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: 10,
    transaction_type: 'earned',
    reason: 'test_setup'
  });

  // Attempt to spend 50 Cookies (more than available)
  const { error } = await supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: -50,
    transaction_type: 'spent',
    reason: 'attempted_overspend'
  });

  // Should fail with constraint violation
  assertEquals(error !== null, true, 'Should prevent negative balance');

  // Verify balance unchanged
  const { data: balance } = await supabase
    .from('student_cookies')
    .select('balance')
    .eq('student_id', testStudentId)
    .single();

  assertEquals(balance?.balance, 10, 'Balance should remain unchanged');
});

Deno.test('Cookie Transaction - Concurrent booking conflict resolution', async () => {
  const testStudentId = 'test-student-003';

  // Setup: Give student 100 Cookies
  await supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: 100,
    transaction_type: 'earned',
    reason: 'test_setup'
  });

  // Simulate two concurrent bookings trying to spend 60 Cookies each
  const booking1 = supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: -60,
    transaction_type: 'spent',
    reason: 'booking_1'
  });

  const booking2 = supabase.from('cookie_transactions').insert({
    user_id: testStudentId,
    amount: -60,
    transaction_type: 'spent',
    reason: 'booking_2'
  });

  // Execute concurrently
  const results = await Promise.allSettled([booking1, booking2]);

  // Exactly ONE should succeed, ONE should fail
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;

  assertEquals(successCount, 1, 'Only one concurrent booking should succeed');
  assertEquals(failCount, 1, 'One concurrent booking should fail due to insufficient balance');

  // Final balance should be 40 (100 - 60)
  const { data: balance } = await supabase
    .from('student_cookies')
    .select('balance')
    .eq('student_id', testStudentId)
    .single();

  assertEquals(balance?.balance, 40);
});
```

---

### Remediation 3.3: Database Constraint for Negative Balance Prevention

**File**: `F:/Git/easy_eng/supabase/migrations/026_cookie_balance_constraints.sql` (new file)

**Content**:

```sql
-- Migration: Enforce Cookie balance constraints at database level
-- Prevents negative balances and ensures transaction integrity

-- Add check constraint to prevent negative balance
ALTER TABLE cookie_transactions
ADD CONSTRAINT check_sufficient_balance
CHECK (
  -- For 'spent' transactions, verify user has enough balance
  CASE
    WHEN transaction_type = 'spent' THEN
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM cookie_transactions ct2
        WHERE ct2.user_id = user_id
          AND ct2.created_at <= created_at
      ) >= 0
    ELSE TRUE
  END
);

-- Create function to calculate current Cookie balance
CREATE OR REPLACE FUNCTION get_cookie_balance(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM cookie_transactions
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- Create trigger to validate balance before spending
CREATE OR REPLACE FUNCTION check_cookie_balance_before_spend()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Only check for 'spent' transactions
  IF NEW.transaction_type = 'spent' THEN
    -- Get current balance
    current_balance := get_cookie_balance(NEW.user_id);

    -- Check if spending would result in negative balance
    IF (current_balance + NEW.amount) < 0 THEN
      RAISE EXCEPTION 'Insufficient Cookie balance. Current: %, Attempting to spend: %',
        current_balance, ABS(NEW.amount)
        USING HINT = 'Cannot spend more Cookies than available';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_cookie_balance
BEFORE INSERT ON cookie_transactions
FOR EACH ROW
EXECUTE FUNCTION check_cookie_balance_before_spend();

-- Create audit trigger for Cookie transaction logging
CREATE OR REPLACE FUNCTION log_cookie_transaction_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    timestamp
  ) VALUES (
    'cookie_transactions',
    NEW.id,
    'INSERT',
    NULL,
    row_to_json(NEW),
    NEW.user_id,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_cookie_transactions
AFTER INSERT OR UPDATE OR DELETE ON cookie_transactions
FOR EACH ROW
EXECUTE FUNCTION log_cookie_transaction_audit();

-- Add transaction isolation for concurrent bookings
ALTER TABLE cookie_transactions
SET (fillfactor = 70); -- Leave space for row updates

-- Create index for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_cookie_transactions_user_balance
ON cookie_transactions (user_id, created_at DESC)
WHERE transaction_type IN ('earned', 'spent', 'refunded');

-- Add comment for documentation
COMMENT ON CONSTRAINT check_sufficient_balance ON cookie_transactions IS
'Ensures students cannot spend more Cookies than they have. Enforces balance >= 0 at all times.';
```

---

## CRITICAL Issue 4: D6 - Automated Accessibility Testing

### Problem Statement

WCAG 2.1 Level AA compliance is mentioned as a requirement (SC-003) but no automated accessibility testing is configured.

**Impact**: HIGH - Legal compliance risk, poor user experience for disabled users
**Effort**: 1-2 days
**Priority**: P0 (Must complete before MVP deployment)

---

### Remediation 4.1: Add Accessibility Test Tasks

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line Number**: Insert in Phase 16 (Polish) after line 543

**New Content**:

```markdown
### Automated Accessibility Testing

- [ ] T216A [P0] [A11Y] Install axe-core and configure in frontend/package.json
- [ ] T216B [P0] [A11Y] Install jest-axe for unit test integration in frontend/src/test/setup.ts
- [ ] T216C [P0] [A11Y] Install @axe-core/playwright for E2E testing in frontend/playwright.config.ts
- [ ] T216D [P0] [A11Y] Create accessibility test helpers in frontend/src/test/helpers/a11y.ts
- [ ] T216E [P0] [A11Y] Add accessibility tests to all page components in frontend/src/app/**/__tests__/*.a11y.test.tsx
- [ ] T216F [P0] [A11Y] Configure CI to run axe-core scans on all routes in .github/workflows/accessibility.yml
- [ ] T216G [P0] [A11Y] Create accessibility violation reporting in .github/workflows/accessibility-report.yml
```

---

### Remediation 4.2: Accessibility Test Setup

**File**: `F:/Git/easy_eng/frontend/src/test/setup.ts`

**Line Number**: Append to file

**Content**:

```typescript
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers with accessibility testing
expect.extend(toHaveNoViolations);

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Accessibility testing defaults
global.a11yConfig = {
  rules: {
    // WCAG 2.1 Level AA requirements
    'color-contrast': { enabled: true },
    'html-has-lang': { enabled: true },
    'valid-lang': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
  },
};
```

---

### Remediation 4.3: Accessibility Test Template

**File**: `F:/Git/easy_eng/frontend/src/app/student/dashboard/__tests__/page.a11y.test.tsx` (new file)

**Content**:

```typescript
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import StudentDashboard from '../page';

describe('Student Dashboard - Accessibility (WCAG 2.1 Level AA)', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<StudentDashboard />);
    const results = await axe(container, global.a11yConfig);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading hierarchy', () => {
    const { container } = render(<StudentDashboard />);
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    // First heading should be h1
    expect(headings[0].tagName).toBe('H1');

    // No heading level should be skipped
    const headingLevels = Array.from(headings).map(h => parseInt(h.tagName[1]));
    for (let i = 1; i < headingLevels.length; i++) {
      expect(headingLevels[i] - headingLevels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('should have ARIA labels for all interactive elements', () => {
    const { container } = render(<StudentDashboard />);
    const buttons = container.querySelectorAll('button');

    buttons.forEach(button => {
      const hasLabel = button.getAttribute('aria-label') ||
                      button.getAttribute('aria-labelledby') ||
                      button.textContent?.trim();
      expect(hasLabel).toBeTruthy();
    });
  });

  it('should have sufficient color contrast', async () => {
    const { container } = render(<StudentDashboard />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
  });

  it('should be keyboard navigable', () => {
    const { container } = render(<StudentDashboard />);
    const focusableElements = container.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      // Element should be reachable via keyboard
      expect(element.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
```

---

### Remediation 4.4: Playwright Accessibility Tests

**File**: `F:/Git/easy_eng/frontend/tests/e2e/accessibility.spec.ts` (new file)

**Content**:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pagesToTest = [
  { url: '/student/dashboard', name: 'Student Dashboard' },
  { url: '/teacher/dashboard', name: 'Teacher Dashboard' },
  { url: '/admin/dashboard', name: 'Admin Dashboard' },
  { url: '/student/classes', name: 'Class Catalog' },
  { url: '/auth/login', name: 'Login Page' },
];

test.describe('WCAG 2.1 Level AA Compliance', () => {
  for (const page of pagesToTest) {
    test(`${page.name} should have no accessibility violations`, async ({ page: browserPage }) => {
      await browserPage.goto(page.url);

      const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('All pages should support keyboard navigation', async ({ page }) => {
    await page.goto('/student/dashboard');

    // Tab through all focusable elements
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocus).toBeTruthy();

    // Shift+Tab should move backward
    await page.keyboard.press('Shift+Tab');
    const previousFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(previousFocus).toBeTruthy();
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/student/dashboard');

    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test('Forms should have proper labels', async ({ page }) => {
    await page.goto('/auth/login');

    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate(el => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('aria-labelledby') ||
               document.querySelector(`label[for="${el.id}"]`);
      });
      expect(hasLabel).toBeTruthy();
    }
  });
});
```

---

### Remediation 4.5: GitHub Actions Accessibility Workflow

**File**: `F:/Git/easy_eng/.github/workflows/accessibility.yml` (new file)

**Content**:

```yaml
name: Accessibility Tests (WCAG 2.1 Level AA)

on:
  push:
    branches: [main, 001-english-learning-platform]
  pull_request:
    branches: [main, 001-english-learning-platform]

jobs:
  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run accessibility unit tests
        working-directory: frontend
        run: npm run test -- --testMatch="**/*.a11y.test.tsx"

      - name: Install Playwright
        working-directory: frontend
        run: npx playwright install --with-deps

      - name: Run accessibility E2E tests
        working-directory: frontend
        run: npx playwright test tests/e2e/accessibility.spec.ts

      - name: Generate accessibility report
        if: always()
        working-directory: frontend
        run: |
          npx playwright show-report --reporter=html

      - name: Upload accessibility report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: frontend/playwright-report/

      - name: Fail on violations
        working-directory: frontend
        run: |
          if grep -q "violations" playwright-report/index.html; then
            echo "❌ Accessibility violations found. See report artifact."
            exit 1
          fi
          echo "✅ No accessibility violations found."
```

---

## HIGH Issue 5: C1-C4 - Cookie Reward Value Inconsistencies

### Problem Statement

Cookie reward values are inconsistent between spec.md and plan.md:

- **Lesson completion**: spec.md says 10 Cookies (line 53), plan.md says 5 Cookies (line 295)
- **Referral**: spec.md says 100 Cookies (line 55), plan.md says 50 Cookies (line 293)
- **Profile completion**: spec.md says 10 Cookies (line 56), plan.md says 15 Cookies (line 297)

**Impact**: MEDIUM - Implementation confusion, inconsistent user expectations
**Effort**: 0.5 days
**Priority**: P1

---

### Remediation 5.1: Reconcile Cookie Values (Choose Spec as Source of Truth)

**Decision**: Use spec.md values as authoritative (spec is the contract with stakeholders)

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/plan.md`

**Line 293-298**: Replace Cookie earning table

**Old Content**:
```markdown
| Activity | Cookies Earned | Conditions |
|----------|----------------|------------|
| **Referral Coupon** | 50 Cookies | When referred friend completes first booking |
| **First Booking Bonus** | 20 Cookies | One-time for new students |
| **Class Completion** | 5 Cookies | Per class attended (separate from XP/Gold) |
| **Leave a Review** | 10 Cookies | First review per teacher |
| **Profile Completion** | 15 Cookies | One-time for completing all profile fields |
```

**New Content**:
```markdown
| Activity | Cookies Earned | Conditions |
|----------|----------------|------------|
| **Referral Coupon** | 100 Cookies | When referred friend completes first booking (per spec.md line 55) |
| **First Booking Bonus** | 20 Cookies | One-time for new students |
| **Class Completion** | 10 Cookies | Per class attended (per spec.md line 53) |
| **Leave a Review** | 5 Cookies | First review per teacher (per spec.md line 57) |
| **Profile Completion** | 10 Cookies | One-time for completing all profile fields (per spec.md line 56) |
```

---

### Remediation 5.2: Update Constants File

**File**: `F:/Git/easy_eng/shared/constants/cookies.ts` (new file to create during T028)

**Content**:

```typescript
/**
 * Cookie Earning Rules
 * Source of truth: spec.md lines 53-57
 * Last updated: 2026-01-28
 */

export const COOKIE_EARNING_RULES = {
  // Activity-based rewards
  LESSON_COMPLETION: 10,        // Per lesson completed (spec.md line 53)
  ATTENDANCE_STREAK_7_DAYS: 50, // 7-day consecutive attendance (spec.md line 54)
  REFERRAL_BONUS: 100,           // Per successful referral (spec.md line 55)
  PROFILE_COMPLETION: 10,        // One-time profile completion (spec.md line 56)
  FIRST_REVIEW: 5,               // First review submitted (spec.md line 57)
  FIRST_BOOKING: 20,             // One-time first booking bonus (plan.md)
} as const;

export const COOKIE_CONVERSION_RATE = 0.5; // 1 Cookie = $0.50 discount (spec.md line 20)

export const COOKIE_CONSTRAINTS = {
  MAX_BALANCE: 1000,              // Maximum Cookies per student (spec.md line 103)
  MAX_DISCOUNT_PERCENTAGE: 0.5,   // 50% max discount (spec.md line 201)
  MIN_PRICE_PERCENTAGE: 0.25,     // 25% minimum price (spec.md line 200)
  EXPIRY_MONTHS: 12,              // Cookies expire after 12 months inactivity (spec.md line 103)
} as const;

/**
 * Calculate Cookie discount for a given class price
 * @param classPrice - Original class price in USD
 * @param cookiesUsed - Number of Cookies student wants to apply
 * @returns Object with discount amount and final price
 */
export function calculateCookieDiscount(
  classPrice: number,
  cookiesUsed: number
): { discount: number; finalPrice: number; maxCookiesAllowed: number } {
  // Calculate discount value
  const discountValue = cookiesUsed * COOKIE_CONVERSION_RATE;

  // Enforce 50% max discount cap
  const maxDiscountValue = classPrice * COOKIE_CONSTRAINTS.MAX_DISCOUNT_PERCENTAGE;
  const cappedDiscountValue = Math.min(discountValue, maxDiscountValue);

  // Calculate final price
  const finalPrice = classPrice - cappedDiscountValue;

  // Enforce 25% minimum price floor
  const minPrice = classPrice * COOKIE_CONSTRAINTS.MIN_PRICE_PERCENTAGE;
  const enforcedFinalPrice = Math.max(finalPrice, minPrice);

  // Calculate actual discount applied (may be less than requested)
  const actualDiscount = classPrice - enforcedFinalPrice;

  // Calculate maximum Cookies that can be used
  const maxCookiesAllowed = Math.floor(actualDiscount / COOKIE_CONVERSION_RATE);

  return {
    discount: actualDiscount,
    finalPrice: enforcedFinalPrice,
    maxCookiesAllowed,
  };
}
```

---

### Remediation 5.3: Update Task Descriptions with Correct Values

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line 64-65**: Update seed data task

**Old Content**:
```markdown
- [ ] T065 [P] [US3] Seed initial Cookie earning rules (10/lesson, 50/streak, 100/referral, 10/profile, 5/first review) in supabase/seed.sql
```

**New Content**:
```markdown
- [ ] T065 [P] [US3] Seed initial Cookie earning rules (10/lesson, 50/streak, 100/referral, 10/profile, 5/first review per spec.md) in supabase/seed.sql
```

---

## HIGH Issue 6: F1-F4 - Coverage Gaps

### Problem Statement

Several features mentioned in spec.md lack corresponding tasks in tasks.md:

- **F1**: Notification success criteria not defined
- **F2**: Admin Cookie rules editor missing
- **F3**: Database reconciliation tasks missing
- **F4**: Explicit rollback testing missing

**Impact**: MEDIUM - Incomplete feature implementation
**Effort**: 2 days
**Priority**: P1

---

### Remediation 6.1: Add Notification Success Criteria (F1)

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/spec.md`

**Line 143**: Add new functional requirement

**Insert after line 143**:

```markdown
- **FR-017**: System MUST deliver notifications within 5 seconds of triggering event (booking confirmations, Cookie earnings, class reminders)
- **FR-018**: Email notifications MUST have 99% delivery rate (measured via email service provider metrics)
- **FR-019**: Browser push notifications MUST respect user preferences and system permissions
```

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/spec.md`

**Line 183**: Add new success criteria

**Insert after line 183**:

```markdown
- **SC-011**: 95% of booking confirmation emails delivered within 30 seconds
- **SC-012**: 90% of students enable in-app notifications within first week
- **SC-013**: Class reminder push notifications sent 15 minutes before class start with 99% accuracy
```

---

### Remediation 6.2: Add Admin Cookie Rules Editor Tasks (F2)

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line 139**: Insert after admin dashboard phase

**New Content**:

```markdown
### Admin Cookie Management (F2 - Missing Feature)

- [ ] T060A [P2] [US5] [ADMIN] Create Cookie rules editor page in frontend/src/app/admin/cookie-rules/page.tsx
- [ ] T060B [P2] [US5] [ADMIN] Create Cookie rule editor component in frontend/src/components/admin/CookieRuleEditor.tsx
- [ ] T060C [P2] [US5] [ADMIN] Create update-cookie-rule Edge Function in supabase/functions/update-cookie-rule/index.ts
- [ ] T060D [P2] [US5] [ADMIN] Add audit logging for Cookie rule changes in supabase/migrations/044_cookie_rule_audit.sql
- [ ] T060E [P2] [US5] [ADMIN] Create Cookie rule validation (min/max values) in frontend/src/utils/cookieRuleValidation.ts
```

---

### Remediation 6.3: Add Database Reconciliation Tasks (F3)

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line 243**: Insert in Phase 7 (Admin Analytics)

**New Content**:

```markdown
### Database Reconciliation (F3 - Missing Feature)

- [ ] T104A [P2] [US5] [ADMIN] Create Cookie balance reconciliation script in supabase/functions/reconcile-cookie-balances/index.ts
- [ ] T104B [P2] [US5] [ADMIN] Create booking-payment reconciliation report in frontend/src/app/admin/reconciliation/page.tsx
- [ ] T104C [P2] [US5] [ADMIN] Create discrepancy detection Edge Function in supabase/functions/detect-discrepancies/index.ts
- [ ] T104D [P2] [US5] [ADMIN] Schedule daily reconciliation cron job in supabase/functions/daily-reconciliation/index.ts
- [ ] T104E [P2] [US5] [ADMIN] Create reconciliation report viewer in frontend/src/components/admin/ReconciliationReport.tsx
```

---

### Remediation 6.4: Add Explicit Rollback Testing (F4)

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line 335**: Insert in Phase 9 (Cookie Advanced)

**New Content**:

```markdown
### Transaction Rollback Testing (F4 - Missing Tests)

- [ ] T139I [P0] [CURRENCY] [TEST] Write E2E test for payment failure rollback in frontend/tests/e2e/rollback/payment-failure.spec.ts
- [ ] T139J [P0] [CURRENCY] [TEST] Write E2E test for booking capacity rollback in frontend/tests/e2e/rollback/capacity-conflict.spec.ts
- [ ] T139K [P0] [CURRENCY] [TEST] Write integration test for Cookie deduction rollback in supabase/functions/__tests__/cookie-rollback-scenarios.test.ts
- [ ] T139L [P0] [CURRENCY] [TEST] Write stress test for concurrent rollbacks in supabase/functions/__tests__/concurrent-rollback.test.ts
```

**File**: `F:/Git/easy_eng/frontend/tests/e2e/rollback/payment-failure.spec.ts` (template - new file)

**Content**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Transaction Rollback - Payment Failure', () => {
  test('Should restore Cookies if payment fails after deduction', async ({ page }) => {
    // Login as student
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'student@test.com');
    await page.fill('[data-testid="password"]', 'testpass123');
    await page.click('[data-testid="login-btn"]');

    // Check initial Cookie balance
    const initialBalance = await page.locator('[data-testid="cookie-balance"]').textContent();
    expect(initialBalance).toBe('100');

    // Start booking flow
    await page.goto('/student/classes');
    await page.click('[data-testid="class-card-1"]');
    await page.click('[data-testid="book-class-btn"]');

    // Apply 50 Cookies discount
    await page.fill('[data-testid="cookies-input"]', '50');
    await page.click('[data-testid="apply-cookies-btn"]');

    // Verify Cookies deducted in UI
    const balanceAfterApply = await page.locator('[data-testid="cookie-balance"]').textContent();
    expect(balanceAfterApply).toBe('50');

    // Proceed to payment (simulate payment failure)
    await page.route('**/api/payment/process', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Payment gateway timeout' }),
      });
    });

    await page.click('[data-testid="proceed-to-payment-btn"]');

    // Wait for error message
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();

    // Verify Cookies RESTORED to original balance
    await page.waitForTimeout(2000); // Wait for rollback
    const finalBalance = await page.locator('[data-testid="cookie-balance"]').textContent();
    expect(finalBalance).toBe('100');

    // Verify no booking created
    await page.goto('/student/bookings');
    const bookingCount = await page.locator('[data-testid="booking-item"]').count();
    expect(bookingCount).toBe(0);
  });
});
```

---

## HIGH Issue 7: C5 - Teacher Revenue Model Missing from Spec

### Problem Statement

Teacher revenue model (70/30 split) is detailed in plan.md but not in spec.md, creating a contract gap.

**Impact**: MEDIUM - Missing from stakeholder contract
**Effort**: 0.5 days
**Priority**: P1

---

### Remediation 7.1: Add Teacher Revenue to Spec Requirements

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/spec.md`

**Line 143**: Insert after FR-016

**New Content**:

```markdown
- **FR-020**: System MUST calculate teacher earnings as 70% of final booking price (after Cookie discounts applied)
- **FR-021**: System MUST track teacher earnings per class and provide weekly payout calculations
- **FR-022**: System MUST support minimum payout threshold of 500,000 VND ($20 USD equivalent)
```

---

### Remediation 7.2: Add Teacher Revenue to Key Entities

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/spec.md`

**Line 154**: Update Teacher entity

**Old Content**:
```markdown
- **Teacher**: Extends User, includes class history, rating, bio, availability schedule
```

**New Content**:
```markdown
- **Teacher**: Extends User, includes class history, rating, bio, availability schedule, earnings balance (70% of final booking prices), payout history, payout threshold (500,000 VND minimum)
```

---

### Remediation 7.3: Add Revenue Constraints

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/spec.md`

**Line 203**: Insert after Cookie constraints

**New Content**:

```markdown
### Revenue Sharing Constraints
- Teacher earnings calculated as 70% of final booking price (after Cookie discounts)
- Platform retains 30% of final booking price as commission
- Minimum class price is $5 USD to ensure viable teacher earnings
- Cookie discounts reduce both teacher earnings and platform commission proportionally
- Weekly payout minimum threshold: 500,000 VND ($20 USD equivalent)
- Teachers must complete tax documentation before receiving payouts
```

---

## HIGH Issue 8: C8 - Performance Validation Tasks Missing

### Problem Statement

Non-functional requirements specify performance targets (NFR-007: 500 bookings/min, SC-002: <200ms p95) but no load testing or benchmarking tasks exist.

**Impact**: MEDIUM - Cannot validate performance claims
**Effort**: 2-3 days
**Priority**: P1

---

### Remediation 8.1: Add Performance Testing Phase

**File**: `F:/Git/easy_eng/specs/001-english-learning-platform/tasks.md`

**Line 590**: Insert after Phase 16 (Polish)

**New Content**:

```markdown
---

## Phase 17: Performance Testing and Validation

**Purpose**: Validate performance requirements from spec.md (NFR-007, SC-002, SC-006)

### Load Testing Setup

- [ ] T246 [P0] [PERF] Install k6 load testing tool in tests/performance/
- [ ] T247 [P0] [PERF] Configure load test environment in tests/performance/k6.config.js
- [ ] T248 [P0] [PERF] Create test data generation script in tests/performance/generate-test-data.ts

### API Performance Tests

- [ ] T249 [P1] [PERF] Create booking API load test (500 bookings/min) in tests/performance/booking-load.test.js
- [ ] T250 [P1] [PERF] Create class search performance test (<500ms response) in tests/performance/class-search.test.js
- [ ] T251 [P1] [PERF] Create dashboard load test (p95 <200ms) in tests/performance/dashboard-load.test.js
- [ ] T252 [P1] [PERF] Create Cookie transaction performance test in tests/performance/cookie-transaction.test.js

### Concurrency Tests

- [ ] T253 [P1] [PERF] Create concurrent user simulation (1000+ users) in tests/performance/concurrent-users.test.js
- [ ] T254 [P1] [PERF] Create concurrent booking conflict test in tests/performance/concurrent-bookings.test.js

### Frontend Performance

- [ ] T255 [P1] [PERF] Configure Lighthouse CI in .github/workflows/lighthouse.yml
- [ ] T256 [P1] [PERF] Create page load time benchmarks (<3s) in tests/performance/page-load.test.js
- [ ] T257 [P1] [PERF] Create bundle size monitoring in frontend/package.json scripts

### Database Performance

- [ ] T258 [P1] [PERF] Create database query benchmarks in supabase/tests/performance/query-benchmarks.sql
- [ ] T259 [P1] [PERF] Analyze and optimize slow queries in supabase/migrations/046_query_optimization.sql
- [ ] T260 [P1] [PERF] Create connection pool stress test in supabase/tests/performance/connection-pool.test.ts

### Monitoring Setup

- [ ] T261 [P2] [PERF] Configure performance monitoring dashboard (Grafana/Datadog)
- [ ] T262 [P2] [PERF] Setup performance regression alerts in .github/workflows/perf-regression.yml

**Checkpoint**: Performance requirements validated - ready for production scale
```

---

### Remediation 8.2: K6 Load Test Example

**File**: `F:/Git/easy_eng/tests/performance/booking-load.test.js` (new file)

**Content**:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration - NFR-007: 500 bookings/minute
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs
    { duration: '5m', target: 100 },  // Stay at 100 VUs (should achieve ~500 req/min)
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% of requests under 200ms (SC-002)
    'http_req_failed': ['rate<0.01'],   // Error rate < 1%
    'errors': ['rate<0.05'],            // Business errors < 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // Test: Create booking with Cookie discount
  const payload = JSON.stringify({
    class_id: 'test-class-001',
    cookies_used: 50,
    payment_method: 'vnpay',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  const response = http.post(`${BASE_URL}/api/bookings`, payload, params);

  // Validation
  const success = check(response, {
    'status is 200 or 201': (r) => [200, 201].includes(r.status),
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has booking_id': (r) => JSON.parse(r.body).booking_id !== undefined,
  });

  errorRate.add(!success);

  sleep(1); // 1s think time between requests
}

// Validate NFR-007: 500 bookings/minute
export function handleSummary(data) {
  const requestsPerSecond = data.metrics.http_reqs.values.rate;
  const requestsPerMinute = requestsPerSecond * 60;

  console.log(`\n📊 Performance Summary:`);
  console.log(`   Requests/minute: ${requestsPerMinute.toFixed(2)}`);
  console.log(`   P95 latency: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`   Error rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);

  if (requestsPerMinute >= 500) {
    console.log(`   ✅ PASS: Meets NFR-007 (500 bookings/min)`);
  } else {
    console.log(`   ❌ FAIL: Does not meet NFR-007 (${requestsPerMinute.toFixed(2)} < 500)`);
  }

  return {
    'summary.json': JSON.stringify(data),
  };
}
```

---

### Remediation 8.3: Lighthouse CI Configuration

**File**: `F:/Git/easy_eng/.github/workflows/lighthouse.yml` (new file)

**Content**:

```yaml
name: Lighthouse Performance Audit

on:
  push:
    branches: [main, 001-english-learning-platform]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build production bundle
        working-directory: frontend
        run: npm run build
        env:
          NODE_ENV: production

      - name: Start server
        working-directory: frontend
        run: npm run start &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/student/dashboard
            http://localhost:3000/student/classes
          uploadArtifacts: true
          temporaryPublicStorage: true
          runs: 3
          budgetPath: frontend/lighthouse-budget.json

      - name: Check performance budget
        run: |
          # SC-006: Page load < 3 seconds on 3G
          # SC-002: p95 response time < 200ms
          echo "Validating against performance budgets..."
```

**File**: `F:/Git/easy_eng/frontend/lighthouse-budget.json` (new file)

**Content**:

```json
[
  {
    "path": "/*",
    "timings": [
      {
        "metric": "interactive",
        "budget": 3000,
        "tolerance": 500
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1500,
        "tolerance": 300
      }
    ],
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 300
      },
      {
        "resourceType": "stylesheet",
        "budget": 50
      },
      {
        "resourceType": "document",
        "budget": 30
      },
      {
        "resourceType": "total",
        "budget": 500
      }
    ]
  }
]
```

---

## Summary Table

| Issue | Description | Priority | Effort | Files Modified | New Files Created |
|-------|-------------|----------|--------|----------------|-------------------|
| **D1-D3** | Testing Discipline Violations | P0 Critical | 3-4 days | tasks.md, package.json | Phase 0 tasks, jest.config.js, test.yml, 13 test setup files |
| **D4** | RBAC Server-Side Testing | P0 Critical | 2-3 days | tasks.md | 6 RBAC test files, RLS test templates |
| **D5** | Currency Transaction Integrity | P0 Critical | 2-3 days | tasks.md | 8 Cookie transaction test files, migration |
| **D6** | Accessibility Testing | P0 Critical | 1-2 days | tasks.md, setup.ts | accessibility.yml, 3 a11y test files |
| **C1-C4** | Cookie Reward Inconsistencies | P1 High | 0.5 days | spec.md, plan.md | cookies.ts constants file |
| **F1-F4** | Coverage Gaps | P1 High | 2 days | spec.md, tasks.md | 15+ missing feature tasks |
| **C5** | Teacher Revenue in Spec | P1 High | 0.5 days | spec.md | None |
| **C8** | Performance Validation | P1 High | 2-3 days | tasks.md | Phase 17 tasks, k6 tests, lighthouse.yml |

**Total Effort**: 18-22 developer-days
**Critical Path**: Complete all P0 issues before MVP deployment
**Files Modified**: 5 core files
**New Files Created**: 50+ test files, configurations, and tasks

---

## Implementation Order

### Week 1: Critical Testing Infrastructure (P0)
1. **Day 1-2**: Issue D1-D3 (Phase 0 Test Infrastructure)
2. **Day 3**: Issue D6 (Accessibility Testing)
3. **Day 4-5**: Issue D4 (RBAC Testing)

### Week 2: Critical Financial Integrity (P0) + High Priority (P1)
4. **Day 6-8**: Issue D5 (Cookie Transaction Testing)
5. **Day 9**: Issues C1-C4, C5 (Documentation fixes)
6. **Day 10**: Issue F1-F4 (Coverage gaps)

### Week 3: Performance Validation (P1)
7. **Day 11-13**: Issue C8 (Performance testing)
8. **Day 14**: Integration testing of all remediations

---

## Validation Checklist

Before marking remediation complete:

- [ ] All new test files execute successfully
- [ ] Coverage reports show 80%+ for all modules
- [ ] GitHub Actions workflows pass on CI
- [ ] No accessibility violations in axe-core scans
- [ ] All Cookie transaction tests pass (including rollback)
- [ ] RBAC tests prevent unauthorized access
- [ ] Performance tests meet NFR thresholds (500 bookings/min, <200ms p95)
- [ ] Documentation updated to reflect changes
- [ ] Constitution compliance verified

---

**Document Version**: 1.0
**Created**: 2026-01-28
**Author**: AI Remediation Agent
**Status**: Ready for Implementation
