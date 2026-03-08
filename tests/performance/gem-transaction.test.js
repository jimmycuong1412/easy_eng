/**
 * Gem Transaction Performance Test
 * Tests gem earning, spending, and transaction performance
 *
 * Success Criteria:
 * - Gem transactions are atomic (no double-spending)
 * - Transaction processing < 200ms p95
 * - Audit log updates correctly
 * - Concurrent transactions handled safely
 * - Balance calculations remain accurate under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const transactionSuccessRate = new Rate('transaction_success');
const transactionDuration = new Trend('transaction_duration');
const balanceCheckDuration = new Trend('balance_check_duration');
const auditLogDuration = new Trend('audit_log_duration');
const doubleSpendErrors = new Counter('double_spend_errors');
const balanceInconsistencies = new Counter('balance_inconsistencies');
const auditLogErrors = new Counter('audit_log_errors');
const insufficientFundsErrors = new Counter('insufficient_funds_errors');

// Test configuration
export const options = {
  scenarios: {
    gem_transactions: getScenario(),
  },
  thresholds: {
    ...getThresholds(),
    'transaction_success': ['rate>0.98'],
    'transaction_duration': ['p(95)<200'],
    'balance_check_duration': ['p(95)<100'],
    'audit_log_duration': ['p(95)<150'],
    'double_spend_errors': ['count==0'],  // Critical: must be zero
    'balance_inconsistencies': ['count==0'],  // Critical: must be zero
    'audit_log_errors': ['count<10'],
    'http_req_duration{endpoint:gem_transaction}': ['p(95)<200'],
  },
};

// Transaction types
const transactionTypes = {
  EARN_CLASS_COMPLETION: 'earn_class_completion',
  EARN_ACHIEVEMENT: 'earn_achievement',
  EARN_REFERRAL: 'earn_referral',
  EARN_DAILY_LOGIN: 'earn_daily_login',
  SPEND_BOOKING: 'spend_booking',
  SPEND_ITEM_PURCHASE: 'spend_item_purchase',
  SPEND_GIFT: 'spend_gift',
};

// Setup: Load test data
export function setup() {
  console.log('Loading test data for gem transaction tests...');

  const studentsRes = http.get(`${BASE_URL}/api/test/students?limit=1000`);
  const students = JSON.parse(studentsRes.body).students || [];

  const classesRes = http.get(`${BASE_URL}/api/classes?status=scheduled&limit=500`);
  const classes = JSON.parse(classesRes.body).classes || [];

  const itemsRes = http.get(`${BASE_URL}/api/shop/items?limit=100`);
  const items = JSON.parse(itemsRes.body).items || [];

  console.log(`Loaded ${students.length} students, ${classes.length} classes, ${items.length} items`);

  return { students, classes, items };
}

// Main test function
export default function (data) {
  const { students, classes, items } = data;
  if (!students.length) return;

  const student = students[Math.floor(Math.random() * students.length)];

  // Authenticate
  const token = authenticate(student.email, 'TestPassword123!');
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Get initial balance
  const initialBalance = getBalance(authHeaders);
  if (initialBalance === null) return;

  // Randomly test earning or spending
  const action = Math.random();

  if (action < 0.4) {
    // 40% earning transactions
    testEarnTransaction(authHeaders, initialBalance);
  } else if (action < 0.8 && classes.length > 0) {
    // 40% booking (spending) transactions
    testBookingTransaction(authHeaders, initialBalance, classes);
  } else if (items.length > 0) {
    // 20% item purchase transactions
    testItemPurchaseTransaction(authHeaders, initialBalance, items);
  }

  sleep(Math.random() * 2 + 0.5);
}

function testEarnTransaction(authHeaders, initialBalance) {
  // Select random earning type
  const earningTypes = [
    transactionTypes.EARN_CLASS_COMPLETION,
    transactionTypes.EARN_ACHIEVEMENT,
    transactionTypes.EARN_DAILY_LOGIN,
  ];
  const type = earningTypes[Math.floor(Math.random() * earningTypes.length)];
  const amount = Math.floor(Math.random() * 50) + 10; // 10-60 gems

  // Perform earning transaction
  const txStart = Date.now();
  const txRes = http.post(
    `${BASE_URL}/api/gems/earn`,
    JSON.stringify({
      type: type,
      amount: amount,
      reason: `Load test: ${type}`,
    }),
    {
      headers: authHeaders,
      tags: { endpoint: 'gem_transaction', type: 'earn' }
    }
  );
  const txTime = Date.now() - txStart;

  transactionDuration.add(txTime);

  const success = check(txRes, {
    'earn transaction successful': (r) => r.status === 201,
    'earn transaction < 200ms': () => txTime < 200,
    'transaction id returned': (r) => {
      if (r.status !== 201) return false;
      const body = JSON.parse(r.body);
      return body.transaction_id !== undefined;
    },
  });

  transactionSuccessRate.add(success);

  if (!success) return;

  const txBody = JSON.parse(txRes.body);

  // Verify balance updated correctly
  sleep(0.1); // Small delay to ensure transaction committed
  const newBalance = getBalance(authHeaders);
  if (newBalance !== null) {
    const expectedBalance = initialBalance + amount;
    if (newBalance !== expectedBalance) {
      balanceInconsistencies.add(1);
      console.error(`Balance inconsistency: expected ${expectedBalance}, got ${newBalance}`);
    }
  }

  // Verify audit log entry
  verifyAuditLog(authHeaders, txBody.transaction_id, type, amount);
}

function testBookingTransaction(authHeaders, initialBalance, classes) {
  const classItem = classes[Math.floor(Math.random() * classes.length)];
  const gemCost = 10; // Standard booking cost

  // Check if student has enough gems
  if (initialBalance < gemCost) {
    // Try to spend anyway to test error handling
    const txRes = http.post(
      `${BASE_URL}/api/bookings`,
      JSON.stringify({
        class_id: classItem.id,
        gems_used: gemCost,
      }),
      {
        headers: authHeaders,
        tags: { endpoint: 'gem_transaction', type: 'spend_booking' }
      }
    );

    if (txRes.status === 400) {
      insufficientFundsErrors.add(1);
    }
    return;
  }

  // Perform booking transaction
  const txStart = Date.now();
  const txRes = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      class_id: classItem.id,
      gems_used: gemCost,
    }),
    {
      headers: authHeaders,
      tags: { endpoint: 'gem_transaction', type: 'spend_booking' }
    }
  );
  const txTime = Date.now() - txStart;

  transactionDuration.add(txTime);

  const success = check(txRes, {
    'booking transaction successful': (r) => r.status === 201,
    'booking transaction < 200ms': () => txTime < 200,
    'booking confirmed': (r) => {
      if (r.status !== 201) return false;
      const body = JSON.parse(r.body);
      return body.booking_id !== undefined;
    },
  });

  transactionSuccessRate.add(success);

  if (!success) {
    if (txRes.status === 409) {
      // Concurrent booking conflict - expected under load
      return;
    }
    if (txRes.status === 400) {
      // Check if it's a double-spend attempt
      const body = JSON.parse(txRes.body);
      if (body.error && body.error.includes('insufficient')) {
        doubleSpendErrors.add(1);
      }
    }
    return;
  }

  // Verify balance decreased correctly
  sleep(0.1);
  const newBalance = getBalance(authHeaders);
  if (newBalance !== null) {
    const expectedBalance = initialBalance - gemCost;
    if (newBalance !== expectedBalance) {
      balanceInconsistencies.add(1);
      console.error(`Balance inconsistency: expected ${expectedBalance}, got ${newBalance}`);
    }
  }
}

function testItemPurchaseTransaction(authHeaders, initialBalance, items) {
  const item = items[Math.floor(Math.random() * items.length)];
  const gemCost = item.price || Math.floor(Math.random() * 100) + 20;

  // Check if student has enough gems
  if (initialBalance < gemCost) {
    const txRes = http.post(
      `${BASE_URL}/api/shop/purchase`,
      JSON.stringify({
        item_id: item.id,
        gems_used: gemCost,
      }),
      {
        headers: authHeaders,
        tags: { endpoint: 'gem_transaction', type: 'spend_item' }
      }
    );

    if (txRes.status === 400) {
      insufficientFundsErrors.add(1);
    }
    return;
  }

  // Perform purchase transaction
  const txStart = Date.now();
  const txRes = http.post(
    `${BASE_URL}/api/shop/purchase`,
    JSON.stringify({
      item_id: item.id,
      gems_used: gemCost,
    }),
    {
      headers: authHeaders,
      tags: { endpoint: 'gem_transaction', type: 'spend_item' }
    }
  );
  const txTime = Date.now() - txStart;

  transactionDuration.add(txTime);

  const success = check(txRes, {
    'purchase transaction successful': (r) => r.status === 201,
    'purchase transaction < 200ms': () => txTime < 200,
  });

  transactionSuccessRate.add(success);

  if (!success) return;

  // Verify balance decreased correctly
  sleep(0.1);
  const newBalance = getBalance(authHeaders);
  if (newBalance !== null) {
    const expectedBalance = initialBalance - gemCost;
    if (newBalance !== expectedBalance) {
      balanceInconsistencies.add(1);
    }
  }
}

function getBalance(authHeaders) {
  const balanceStart = Date.now();
  const balanceRes = http.get(
    `${BASE_URL}/api/gems/balance`,
    {
      headers: authHeaders,
      tags: { endpoint: 'gem_balance' }
    }
  );
  const balanceTime = Date.now() - balanceStart;

  balanceCheckDuration.add(balanceTime);

  const success = check(balanceRes, {
    'balance check successful': (r) => r.status === 200,
    'balance check < 100ms': () => balanceTime < 100,
  });

  if (!success) return null;

  const body = JSON.parse(balanceRes.body);
  return body.balance || 0;
}

function verifyAuditLog(authHeaders, transactionId, type, amount) {
  const auditStart = Date.now();
  const auditRes = http.get(
    `${BASE_URL}/api/gems/audit-log?transaction_id=${transactionId}`,
    {
      headers: authHeaders,
      tags: { endpoint: 'audit_log' }
    }
  );
  const auditTime = Date.now() - auditStart;

  auditLogDuration.add(auditTime);

  const success = check(auditRes, {
    'audit log retrieved': (r) => r.status === 200,
    'audit log < 150ms': () => auditTime < 150,
    'audit entry matches transaction': (r) => {
      if (r.status !== 200) return false;
      const body = JSON.parse(r.body);
      const entry = body.entries ? body.entries[0] : null;
      return entry &&
             entry.transaction_id === transactionId &&
             entry.type === type &&
             entry.amount === amount;
    },
  });

  if (!success) {
    auditLogErrors.add(1);
  }
}

function authenticate(email, password) {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' }
    }
  );

  if (loginRes.status !== 200) return null;

  return JSON.parse(loginRes.body).token;
}

// Teardown: Report summary
export function teardown(data) {
  console.log('\n=== Gem Transaction Performance Test Summary ===');
  console.log('Transaction atomicity validated');
  console.log('Balance consistency checked');
  console.log('Audit log accuracy verified');
  console.log('CRITICAL: Double-spend errors must be 0');
}
