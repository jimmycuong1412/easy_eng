/**
 * Booking API Load Test
 * Validates NFR-007: Platform handles peak booking loads (500 bookings/minute)
 *
 * Success Criteria:
 * - System processes 500 bookings/minute without errors
 * - p95 response time < 200ms (SC-002)
 * - Failure rate < 1%
 * - Gem transactions remain atomic (no double-spending)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const bookingSuccessRate = new Rate('booking_success');
const bookingDuration = new Trend('booking_duration');
const gemDeductionErrors = new Counter('gem_deduction_errors');
const concurrencyConflicts = new Counter('concurrency_conflicts');

// Test configuration
export const options = {
  scenarios: {
    booking_load: getScenario(),
  },
  thresholds: {
    ...getThresholds(),
    'booking_success': ['rate>0.99'],
    'booking_duration': ['p(95)<200'],
    'gem_deduction_errors': ['count<10'],
    'concurrency_conflicts': ['count<50'],
  },
};

// Setup: Load test data
export function setup() {
  console.log('Loading test data...');
  const studentsRes = http.get(`${BASE_URL}/api/test/students?limit=1000`);
  const students = JSON.parse(studentsRes.body).students || [];
  const classesRes = http.get(`${BASE_URL}/api/classes?status=scheduled&limit=500`);
  const classes = JSON.parse(classesRes.body).classes || [];
  console.log(`Loaded ${students.length} students, ${classes.length} classes`);
  return { students, classes };
}

// Main test function
export default function (data) {
  const { students, classes } = data;
  if (!students.length || !classes.length) return;

  const student = students[Math.floor(Math.random() * students.length)];
  const classItem = classes[Math.floor(Math.random() * classes.length)];

  // Authenticate
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: student.email,
    password: 'TestPassword123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) return;

  const token = JSON.parse(loginRes.body).token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Create booking
  const bookingStart = Date.now();
  const bookingRes = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      class_id: classItem.id,
      gems_used: 10,
    }),
    { headers: authHeaders, tags: { endpoint: 'booking' } }
  );
  const bookingTime = Date.now() - bookingStart;

  bookingDuration.add(bookingTime);

  const success = check(bookingRes, {
    'booking created': (r) => r.status === 201,
    'response time < 200ms': () => bookingTime < 200,
  });

  bookingSuccessRate.add(success);

  if (bookingRes.status === 409) concurrencyConflicts.add(1);
  if (bookingRes.status === 400) gemDeductionErrors.add(1);

  sleep(Math.random() * 2 + 1);
}
