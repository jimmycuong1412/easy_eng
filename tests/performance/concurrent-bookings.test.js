/**
 * Concurrent Bookings Performance Test
 * Tests booking conflict resolution and race condition handling
 *
 * Success Criteria:
 * - Concurrent booking attempts handled correctly
 * - Last-spot race conditions resolved properly
 * - Database locking prevents double-booking
 * - Only max_students bookings allowed per class
 * - Proper error responses for failed bookings
 * - No orphaned transactions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const bookingSuccessRate = new Rate('booking_success');
const bookingDuration = new Trend('booking_duration');
const conflictResolutionTime = new Trend('conflict_resolution_time');
const raceConditionConflicts = new Counter('race_condition_conflicts');
const doubleBookingErrors = new Counter('double_booking_errors');
const lastSpotConflicts = new Counter('last_spot_conflicts');
const orphanedTransactions = new Counter('orphaned_transactions');
const classFullErrors = new Counter('class_full_errors');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: High concurrency for popular classes (stress last-spot logic)
    last_spot_race: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 100 },  // Ramp up
        { duration: '1m', target: 200 },   // High contention
        { duration: '30s', target: 100 },  // Ramp down
      ],
      exec: 'testLastSpotRace',
    },

    // Scenario 2: Sustained concurrent booking load
    sustained_concurrent: {
      executor: 'constant-arrival-rate',
      rate: 300,  // 300 bookings per second
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      exec: 'testConcurrentBookings',
      startTime: '2m',  // Start after last_spot_race
    },
  },
  thresholds: {
    ...getThresholds(),
    'booking_success': ['rate>0.85'],  // Lower due to expected conflicts
    'booking_duration': ['p(95)<300'],
    'conflict_resolution_time': ['p(95)<200'],
    'double_booking_errors': ['count==0'],  // Critical: must be zero
    'race_condition_conflicts': ['count>0'],  // Should detect conflicts
    'orphaned_transactions': ['count==0'],  // Critical: must be zero
    'http_req_duration{endpoint:concurrent_booking}': ['p(95)<300'],
  },
};

// Popular classes (will fill up quickly)
const popularClassIds = [];

// Setup: Load test data and create near-full classes
export function setup() {
  console.log('Setting up concurrent booking test scenario...');

  const studentsRes = http.get(`${BASE_URL}/api/test/students?limit=2000`);
  const students = JSON.parse(studentsRes.body).students || [];

  const classesRes = http.get(`${BASE_URL}/api/classes?status=scheduled&limit=500`);
  const classes = JSON.parse(classesRes.body).classes || [];

  // Identify classes that are nearly full (for last-spot testing)
  const nearFullClasses = classes.filter(c => {
    const maxStudents = c.max_students || 10;
    const currentStudents = c.current_students || 0;
    return (maxStudents - currentStudents) <= 3;
  });

  console.log(`Loaded ${students.length} students, ${classes.length} classes`);
  console.log(`Found ${nearFullClasses.length} nearly-full classes for last-spot testing`);

  return {
    students,
    classes,
    nearFullClasses: nearFullClasses.length > 0 ? nearFullClasses : classes.slice(0, 20),
  };
}

// Test function for last-spot race conditions
export function testLastSpotRace(data) {
  const { students, nearFullClasses } = data;
  if (!students.length || !nearFullClasses.length) return;

  // Multiple students trying to book the same nearly-full class
  const student = students[Math.floor(Math.random() * students.length)];
  const classItem = nearFullClasses[Math.floor(Math.random() * nearFullClasses.length)];

  attemptBooking(student, classItem, 'last_spot_race');
}

// Test function for general concurrent bookings
export function testConcurrentBookings(data) {
  const { students, classes } = data;
  if (!students.length || !classes.length) return;

  const student = students[Math.floor(Math.random() * students.length)];
  const classItem = classes[Math.floor(Math.random() * classes.length)];

  attemptBooking(student, classItem, 'concurrent');
}

function attemptBooking(student, classItem, testType) {
  // Authenticate
  const token = authenticate(student.email, 'TestPassword123!');
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Check gem balance first
  const balanceRes = http.get(
    `${BASE_URL}/api/gems/balance`,
    { headers: authHeaders, tags: { endpoint: 'gem_balance' } }
  );

  if (balanceRes.status !== 200) return;

  const initialBalance = JSON.parse(balanceRes.body).balance || 0;
  if (initialBalance < 10) return; // Need 10 gems to book

  // Attempt booking
  const bookingStart = Date.now();
  const bookingRes = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      class_id: classItem.id,
      gems_used: 10,
    }),
    {
      headers: authHeaders,
      tags: { endpoint: 'concurrent_booking', test_type: testType }
    }
  );
  const bookingTime = Date.now() - bookingStart;

  bookingDuration.add(bookingTime);

  // Check response
  if (bookingRes.status === 201) {
    // Booking successful
    const success = check(bookingRes, {
      'booking created': (r) => r.status === 201,
      'booking < 300ms': () => bookingTime < 300,
      'booking_id returned': (r) => {
        const body = JSON.parse(r.body);
        return body.booking_id !== undefined;
      },
    });

    bookingSuccessRate.add(true);

    // Verify gem deduction
    sleep(0.1);
    const newBalanceRes = http.get(
      `${BASE_URL}/api/gems/balance`,
      { headers: authHeaders }
    );

    if (newBalanceRes.status === 200) {
      const newBalance = JSON.parse(newBalanceRes.body).balance || 0;
      const expectedBalance = initialBalance - 10;

      if (newBalance !== expectedBalance) {
        orphanedTransactions.add(1);
        console.error(`Orphaned transaction: balance ${newBalance}, expected ${expectedBalance}`);
      }
    }

    // Verify booking exists
    verifyBooking(authHeaders, classItem.id);

  } else if (bookingRes.status === 409) {
    // Conflict - expected under high concurrency
    conflictResolutionTime.add(bookingTime);
    raceConditionConflicts.add(1);

    const body = JSON.parse(bookingRes.body);
    if (body.error && body.error.includes('full')) {
      classFullErrors.add(1);
      if (testType === 'last_spot_race') {
        lastSpotConflicts.add(1);
      }
    }

    bookingSuccessRate.add(false);

    // Verify no gem deduction occurred
    sleep(0.1);
    const balanceCheckRes = http.get(
      `${BASE_URL}/api/gems/balance`,
      { headers: authHeaders }
    );

    if (balanceCheckRes.status === 200) {
      const currentBalance = JSON.parse(balanceCheckRes.body).balance || 0;
      if (currentBalance !== initialBalance) {
        orphanedTransactions.add(1);
        console.error(`Gems deducted despite failed booking: ${initialBalance} -> ${currentBalance}`);
      }
    }

  } else if (bookingRes.status === 400) {
    // Bad request - check for double booking or insufficient gems
    const body = JSON.parse(bookingRes.body);

    if (body.error && body.error.includes('already booked')) {
      doubleBookingErrors.add(1);
      console.error('Double booking detected!');
    }

    bookingSuccessRate.add(false);

  } else {
    // Other error
    check(bookingRes, {
      'booking failed with unexpected status': (r) => false,
    });
    bookingSuccessRate.add(false);
  }
}

function verifyBooking(authHeaders, classId) {
  const verifyRes = http.get(
    `${BASE_URL}/api/bookings/my-bookings?class_id=${classId}`,
    { headers: authHeaders, tags: { endpoint: 'verify_booking' } }
  );

  const verified = check(verifyRes, {
    'booking verified': (r) => {
      if (r.status !== 200) return false;
      const body = JSON.parse(r.body);
      return body.bookings && body.bookings.some(b => b.class_id === classId);
    },
  });

  if (!verified) {
    orphanedTransactions.add(1);
    console.error('Booking not found after successful creation');
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

// Teardown: Verify data integrity
export function teardown(data) {
  console.log('\n=== Concurrent Bookings Performance Test Summary ===');
  console.log('Critical Validations:');
  console.log('  - Double booking errors: Must be 0');
  console.log('  - Orphaned transactions: Must be 0');
  console.log('  - Race conditions detected and handled correctly');
  console.log('\nLast-spot race condition testing:');
  console.log('  - Multiple users competing for final class spots');
  console.log('  - Database locking prevents overselling');
  console.log('  - Failed bookings do not deduct gems');

  // Optional: Verify class capacity constraints
  console.log('\nPost-test data integrity check recommended:');
  console.log('  1. Verify no classes exceed max_students');
  console.log('  2. Verify all bookings have corresponding gem transactions');
  console.log('  3. Check for any orphaned payment records');
}
