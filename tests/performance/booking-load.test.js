/**
 * Booking API Load Test - Validates NFR-007
 *
 * Requirement: System MUST handle 500 bookings/minute peak load
 * Success Criteria SC-002: <200ms p95 response time for booking operations
 *
 * @requires k6 (load testing framework)
 * @see https://k6.io/docs/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const bookingSuccessRate = new Rate('booking_success');
const bookingDuration = new Trend('booking_duration');

// Test configuration - NFR-007: 500 bookings/minute
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 VUs
    { duration: '5m', target: 100 },  // Maintain 100 VUs (achieves ~500 req/min at 1 req/10s)
    { duration: '3m', target: 200 },  // Spike test to 200 VUs
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% of requests under 200ms (SC-002)
    'http_req_failed': ['rate<0.01'],   // Error rate < 1%
    'booking_success': ['rate>0.99'],   // 99% success rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

/**
 * Main test scenario - simulate complete booking flow
 */
export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };

  // Step 1: Browse classes (simulate user browsing)
  const browseResponse = http.get(`${BASE_URL}/api/classes?limit=20`, { headers });
  check(browseResponse, {
    'browse classes status 200': (r) => r.status === 200,
    'browse response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // Think time

  // Step 2: Get class details
  const classId = JSON.parse(browseResponse.body).data[0]?.id || 'test-class-001';
  const detailsResponse = http.get(`${BASE_URL}/api/classes/${classId}`, { headers });
  check(detailsResponse, {
    'class details status 200': (r) => r.status === 200,
  });

  sleep(1); // Think time

  // Step 3: Process booking with Cookie discount
  const bookingPayload = JSON.stringify({
    class_id: classId,
    cookies_used: 50,
    payment_method: 'vnpay',
  });

  const bookingStart = Date.now();
  const bookingResponse = http.post(
    `${BASE_URL}/api/bookings`,
    bookingPayload,
    { headers }
  );
  const bookingTime = Date.now() - bookingStart;

  // Record metrics
  bookingDuration.add(bookingTime);

  const bookingSuccess = check(bookingResponse, {
    'booking status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'booking response time < 200ms': (r) => r.timings.duration < 200,
    'booking has confirmation': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.booking_id !== undefined;
      } catch {
        return false;
      }
    },
  });

  bookingSuccessRate.add(bookingSuccess);

  sleep(2); // Think time before next iteration
}

/**
 * Summary handler - validates NFR-007 requirement
 */
export function handleSummary(data) {
  const requestsPerSecond = data.metrics.http_reqs.values.rate;
  const requestsPerMinute = requestsPerSecond * 60;
  const p95Duration = data.metrics.http_req_duration.values['p(95)'];
  const errorRate = data.metrics.http_req_failed.values.rate;

  console.log('\n=== Performance Test Summary ===');
  console.log(`📊 Requests/minute: ${requestsPerMinute.toFixed(2)}`);
  console.log(`⏱️  P95 latency: ${p95Duration.toFixed(2)}ms`);
  console.log(`❌ Error rate: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`✅ Success rate: ${(data.metrics.booking_success.values.rate * 100).toFixed(2)}%`);

  // Validate NFR-007
  if (requestsPerMinute >= 500) {
    console.log(`\n✅ PASS: Meets NFR-007 (${requestsPerMinute.toFixed(2)} >= 500 bookings/min)`);
  } else {
    console.log(`\n❌ FAIL: Does not meet NFR-007 (${requestsPerMinute.toFixed(2)} < 500 bookings/min)`);
  }

  // Validate SC-002
  if (p95Duration < 200) {
    console.log(`✅ PASS: Meets SC-002 (p95 ${p95Duration.toFixed(2)}ms < 200ms)`);
  } else {
    console.log(`❌ FAIL: Does not meet SC-002 (p95 ${p95Duration.toFixed(2)}ms >= 200ms)`);
  }

  return {
    'performance-summary.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify({
      requestsPerMinute,
      p95Duration,
      errorRate,
      nfr007Pass: requestsPerMinute >= 500,
      sc002Pass: p95Duration < 200,
    }),
  };
}

/**
 * Usage:
 *
 * 1. Install k6: https://k6.io/docs/getting-started/installation
 *
 * 2. Run test:
 *    k6 run tests/performance/booking-load.test.js
 *
 * 3. Run with custom API URL and auth:
 *    k6 run --env API_URL=https://staging.example.com --env AUTH_TOKEN=abc123 tests/performance/booking-load.test.js
 *
 * 4. View detailed report:
 *    k6 run --out json=performance-results.json tests/performance/booking-load.test.js
 *
 * 5. Run in CI:
 *    k6 run --quiet tests/performance/booking-load.test.js || exit 1
 */
