# Rollback Handling - Operations Guide

**Task**: T139F [P] [CURRENCY] [DOCS]
**Constitution Principle VI**: Currency system integrity
**Last Updated**: 2026-02-03

---

## Overview

This document provides comprehensive guidance for handling Gem transaction rollbacks in the Easy English Learning Platform. Transaction rollbacks are critical operations that reverse failed or cancelled transactions to maintain currency system integrity.

---

## Table of Contents

1. [Rollback Scenarios](#rollback-scenarios)
2. [Automatic Rollback Triggers](#automatic-rollback-triggers)
3. [Manual Rollback Procedures](#manual-rollback-procedures)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Troubleshooting](#troubleshooting)
6. [Recovery Procedures](#recovery-procedures)
7. [Audit and Compliance](#audit-and-compliance)

---

## Rollback Scenarios

### 1. Payment Gateway Failures

**Scenario**: User applies Gems to booking, payment gateway returns error

**Automatic Rollback**: ✅ Yes
**Trigger**: Payment API error response
**Expected Behavior**:
- Gem deduction reversed immediately
- Booking record NOT created
- Class capacity unchanged
- User sees error message with retry option

**Example**:
```typescript
// User applies 20 Gems ($10 discount) to $50 class
Initial Gems: 100
Deduction: -20 (optimistic)
Payment fails → Automatic rollback: +20
Final Gems: 100 ✅
```

**Audit Log Entry**:
```json
{
  "action": "booking_refund",
  "amount": 20,
  "reason": "Payment gateway failure: declined",
  "related_transaction_id": "original-booking-id",
  "timestamp": "2026-02-03T10:30:00Z"
}
```

---

### 2. Booking Capacity Conflicts

**Scenario**: Class fills up between user viewing and completing booking

**Automatic Rollback**: ✅ Yes
**Trigger**: Database constraint violation (max_capacity exceeded)
**Expected Behavior**:
- Gem deduction reversed
- Booking rejected
- User notified class is full
- Alternative classes suggested

**Race Condition Protection**:
```sql
-- Database-level check prevents overbooking
CREATE OR REPLACE FUNCTION check_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM bookings WHERE class_id = NEW.class_id) >=
     (SELECT max_capacity FROM classes WHERE id = NEW.class_id) THEN
    RAISE EXCEPTION 'Class is full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Rollback Process**:
1. Transaction begins
2. Gems deducted
3. Booking insert attempted
4. Capacity check fails → ROLLBACK
5. Gems restored automatically

---

### 3. Payment Timeouts

**Scenario**: Payment gateway doesn't respond within timeout period (30 seconds)

**Automatic Rollback**: ✅ Yes (after timeout)
**Trigger**: Payment API timeout exception
**Expected Behavior**:
- Pending transaction marked as "timeout"
- Automatic rollback after 60 seconds if no confirmation
- User notified to retry
- Webhook monitoring for late responses

**Timeout Configuration**:
```typescript
const PAYMENT_TIMEOUT = 30000; // 30 seconds
const ROLLBACK_GRACE_PERIOD = 60000; // 60 seconds

// If payment not confirmed within grace period, rollback
setTimeout(async () => {
  const status = await checkPaymentStatus(transactionId);
  if (status !== 'confirmed') {
    await rollbackTransaction(transactionId, 'timeout');
  }
}, PAYMENT_TIMEOUT + ROLLBACK_GRACE_PERIOD);
```

---

### 4. User-Initiated Cancellations

**Scenario**: User cancels booking within allowed cancellation window

**Automatic Rollback**: ⚠️ Partial (policy-dependent)
**Trigger**: User cancellation request
**Expected Behavior**:
- Gems refunded according to cancellation policy
- Booking marked as "cancelled"
- Class capacity freed
- Email confirmation sent

**Cancellation Policies**:

| Time Before Class | Gem Refund | Cash Refund |
|-------------------|------------|-------------|
| > 24 hours        | 100%       | 100%        |
| 12-24 hours       | 50%        | 80%         |
| < 12 hours        | 0%         | 50%         |

**Procedure**:
```sql
-- Calculate refund based on policy
SELECT calculate_cancellation_refund(
  booking_id := 'booking-123',
  cancellation_time := NOW()
);

-- Process refund
INSERT INTO gem_transactions (
  user_id, amount, transaction_type, description
) VALUES (
  user_id,
  refund_amount,
  'booking_refund',
  'Cancellation refund: 50% policy'
);
```

---

### 5. Fraud Detection Rollbacks

**Scenario**: Suspicious activity detected by fraud detection system

**Automatic Rollback**: ✅ Yes
**Trigger**: Fraud score exceeds threshold
**Expected Behavior**:
- All suspicious transactions rolled back
- User account flagged for review
- Admin notification sent
- Funds frozen pending investigation

**Fraud Indicators**:
- Multiple failed payment attempts (>5 in 10 minutes)
- Rapid Gem usage pattern (>500 Gems in 1 hour)
- IP address mismatch
- Unusual booking pattern

**Rollback Procedure**:
```typescript
async function handleFraudDetection(userId: string, transactionId: string) {
  // Rollback suspicious transaction
  await rollbackTransaction(transactionId, 'fraud_detected');

  // Freeze account
  await supabase.from('profiles').update({
    account_status: 'frozen',
    frozen_reason: 'Suspicious activity detected',
    frozen_at: new Date().toISOString()
  }).eq('id', userId);

  // Notify admin
  await notifyAdmin({
    type: 'fraud_alert',
    userId,
    transactionId,
    severity: 'high'
  });
}
```

---

### 6. System Errors and Database Failures

**Scenario**: Unexpected system error during transaction processing

**Automatic Rollback**: ✅ Yes (database transaction)
**Trigger**: Unhandled exception, database error
**Expected Behavior**:
- PostgreSQL ROLLBACK on transaction failure
- All changes reverted atomically
- Error logged with full context
- User sees generic error message

**Database Transaction Pattern**:
```sql
BEGIN;
  -- Deduct Gems
  INSERT INTO gem_transactions (...) VALUES (...);

  -- Create booking
  INSERT INTO bookings (...) VALUES (...);

  -- Process payment
  -- ... payment logic ...

  -- If ANY step fails, entire transaction rolls back
COMMIT; -- Only commits if all steps succeed
```

---

## Automatic Rollback Triggers

### Implemented Rollback Mechanisms

1. **Database-Level Rollbacks**
   - PostgreSQL transaction ROLLBACK on constraint violations
   - Foreign key violations
   - Check constraint failures
   - Unique constraint violations

2. **Application-Level Rollbacks**
   - Payment gateway errors
   - API timeout exceptions
   - Business logic validation failures
   - Fraud detection triggers

3. **Scheduled Rollbacks**
   - Pending transactions older than 5 minutes
   - Timeout scenarios without confirmation
   - Orphaned transactions cleanup

### Rollback Function

```sql
-- Main rollback function
CREATE OR REPLACE FUNCTION process_gem_transaction_rollback(
  p_original_transaction_id TEXT,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_transaction RECORD;
  v_rollback_id TEXT;
BEGIN
  -- Get original transaction
  SELECT * INTO v_transaction
  FROM gem_transactions
  WHERE idempotency_key = p_original_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original transaction not found';
  END IF;

  -- Check if already rolled back
  IF EXISTS (
    SELECT 1 FROM gem_transactions
    WHERE metadata->>'related_transaction_id' = p_original_transaction_id
    AND transaction_type IN ('booking_refund', 'purchase_refund')
  ) THEN
    RAISE NOTICE 'Transaction already rolled back';
    RETURN FALSE;
  END IF;

  -- Create rollback transaction
  v_rollback_id := p_original_transaction_id || '-rollback-' || EXTRACT(EPOCH FROM NOW());

  INSERT INTO gem_transactions (
    user_id,
    amount,
    transaction_type,
    status,
    idempotency_key,
    description,
    metadata
  ) VALUES (
    v_transaction.user_id,
    -v_transaction.amount, -- Reverse the amount
    CASE v_transaction.transaction_type
      WHEN 'booking_discount' THEN 'booking_refund'
      WHEN 'purchase' THEN 'purchase_refund'
      ELSE 'refund'
    END,
    'completed',
    v_rollback_id,
    'Rollback: ' || p_reason,
    jsonb_build_object(
      'related_transaction_id', p_original_transaction_id,
      'rollback_reason', p_reason,
      'rollback_timestamp', NOW()
    )
  );

  -- Log to audit
  INSERT INTO gem_transaction_audit_log (
    user_id, amount, action, status, description, metadata
  ) VALUES (
    v_transaction.user_id,
    -v_transaction.amount,
    'rollback',
    'completed',
    p_reason,
    jsonb_build_object(
      'original_transaction', p_original_transaction_id
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## Manual Rollback Procedures

### When to Perform Manual Rollbacks

- User support requests (verified legitimate issues)
- System bugs causing incorrect charges
- Administrative corrections
- Dispute resolutions

### Step-by-Step Manual Rollback

**Prerequisites**:
- Admin access to Supabase
- Transaction ID or booking ID
- Verified reason for rollback

**Procedure**:

1. **Identify Transaction**
   ```sql
   SELECT * FROM gem_transactions
   WHERE idempotency_key = 'transaction-id-here'
   OR metadata->>'booking_id' = 'booking-id-here';
   ```

2. **Verify Eligibility**
   - Check transaction hasn't been rolled back already
   - Verify user balance won't go negative (if partial rollback)
   - Confirm with team lead if amount > 100 Gems

3. **Execute Rollback**
   ```sql
   SELECT process_gem_transaction_rollback(
     p_original_transaction_id := 'transaction-id-here',
     p_reason := 'Admin correction: [detailed reason]'
   );
   ```

4. **Verify Rollback**
   ```sql
   -- Check user balance updated
   SELECT calculate_gem_balance('user-id-here');

   -- Check audit log
   SELECT * FROM gem_transaction_audit_log
   WHERE metadata->>'related_transaction_id' = 'transaction-id-here';
   ```

5. **Notify User**
   - Send email explaining rollback
   - Update support ticket
   - Document in CRM

---

## Monitoring and Alerts

### Dashboard Metrics

Access the Rollback Monitoring Dashboard: `/admin/monitoring/rollbacks`

**Key Metrics**:
- Total rollbacks (24h, 7d, 30d)
- Rollback rate (% of total transactions)
- Total Gems rolled back
- Affected users count
- Rollback reasons breakdown

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Rollback Rate | > 5% | > 10% | Investigate immediately |
| Rollbacks/Hour | > 50 | > 100 | Check payment gateway |
| Same User Rollbacks | > 3 | > 5 | Flag for fraud review |
| System Error Rollbacks | > 10 | > 20 | Check logs, page dev team |

### Real-Time Monitoring

```typescript
// Subscribe to rollback events
supabase
  .channel('rollback-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'gem_transaction_audit_log',
    filter: 'action=in.(booking_refund,purchase_refund)'
  }, (payload) => {
    const rollback = payload.new;

    // Check if critical
    if (rollback.amount > 100) {
      sendAdminAlert({
        type: 'large_rollback',
        amount: rollback.amount,
        user_id: rollback.user_id
      });
    }
  })
  .subscribe();
```

---

## Troubleshooting

### Common Issues

#### 1. Rollback Not Executing

**Symptoms**: Gems not restored, user still charged

**Diagnostic Steps**:
```sql
-- Check if transaction exists
SELECT * FROM gem_transactions WHERE idempotency_key = 'txn-id';

-- Check for rollback attempts
SELECT * FROM gem_transaction_audit_log
WHERE metadata->>'related_transaction_id' = 'txn-id';

-- Check for errors
SELECT * FROM system_logs
WHERE context->>'transaction_id' = 'txn-id'
ORDER BY created_at DESC;
```

**Solutions**:
- Manual rollback using admin function
- Check database constraints
- Verify idempotency key format

#### 2. Partial Rollback

**Symptoms**: Only part of transaction reversed

**Cause**: Database transaction not atomic

**Fix**:
```sql
-- Find incomplete rollback
SELECT * FROM gem_transactions
WHERE metadata->>'rollback_status' = 'partial';

-- Complete the rollback
-- [Execute completion logic]
```

#### 3. Duplicate Rollbacks

**Symptoms**: User refunded twice for same transaction

**Cause**: Idempotency key collision or retry logic error

**Fix**:
```sql
-- Identify duplicates
SELECT idempotency_key, COUNT(*)
FROM gem_transactions
WHERE transaction_type IN ('booking_refund', 'purchase_refund')
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- Reverse duplicate (keep earliest)
-- [Admin correction logic]
```

---

## Recovery Procedures

### Disaster Recovery

**Scenario**: Mass rollback failure due to system outage

**Recovery Plan**:

1. **Identify Affected Transactions**
   ```sql
   SELECT * FROM gem_transactions
   WHERE created_at > '[outage-start-time]'
   AND status = 'pending'
   AND transaction_type IN ('booking_discount', 'purchase');
   ```

2. **Batch Rollback**
   ```sql
   DO $$
   DECLARE
     txn RECORD;
   BEGIN
     FOR txn IN
       SELECT idempotency_key FROM gem_transactions
       WHERE status = 'pending' AND created_at > '[outage-time]'
     LOOP
       PERFORM process_gem_transaction_rollback(
         txn.idempotency_key,
         'System outage recovery'
       );
     END LOOP;
   END $$;
   ```

3. **Verify Balances**
   - Export user balances before recovery
   - Export user balances after recovery
   - Compare and identify discrepancies

4. **User Communication**
   - Send email to all affected users
   - Explain what happened
   - Confirm balances restored

---

## Audit and Compliance

### Audit Trail Requirements

Every rollback MUST have:
- ✅ Original transaction ID
- ✅ Rollback timestamp
- ✅ Reason (detailed)
- ✅ Admin ID (if manual)
- ✅ System context (if automatic)
- ✅ User notification status

### Compliance Checks

**Monthly Audit**:
```sql
-- Verify all rollbacks have audit entries
SELECT COUNT(*) FROM gem_transactions t
WHERE transaction_type IN ('booking_refund', 'purchase_refund')
AND NOT EXISTS (
  SELECT 1 FROM gem_transaction_audit_log a
  WHERE a.metadata->>'related_transaction_id' = t.idempotency_key
);
-- Should return 0
```

### Retention Policy

- Audit logs: Retained indefinitely
- Transaction records: 7 years (legal requirement)
- System logs: 90 days
- Rollback analytics: 2 years

---

## Best Practices

### For Development

1. **Always use idempotency keys** to prevent duplicate transactions
2. **Wrap in database transactions** for atomic operations
3. **Log every step** with sufficient context
4. **Test rollback scenarios** in staging environment
5. **Monitor rollback rates** as key health metric

### For Operations

1. **Review rollback dashboard daily**
2. **Investigate rollback rate spikes immediately**
3. **Document manual rollbacks thoroughly**
4. **Communicate with users proactively**
5. **Conduct monthly audit reviews**

---

## Emergency Contacts

**High Rollback Rate (>10%)**:
- DevOps Team: devops@example.com
- Payment Gateway Support: [provider contact]

**Suspected Fraud**:
- Security Team: security@example.com
- Fraud Detection Lead: [contact]

**System Outage**:
- On-Call Engineer: [on-call phone]
- Incident Commander: [contact]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-03 | Initial documentation |

---

**Related Documentation**:
- [Gem System Overview](../gem-system-overview.md)
- [Payment Integration Guide](../payment-integration.md)
- [Fraud Detection Guide](./fraud-detection.md)
- [Database Schema](../database-schema.md)

**Last Review**: 2026-02-03
**Next Review Due**: 2026-03-03
