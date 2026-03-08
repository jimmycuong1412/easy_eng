/**
 * k6 Load Testing Configuration
 * Easy English Learning Platform - Performance Testing Suite
 *
 * This configuration defines load testing parameters for validating NFR requirements:
 * - NFR-007: Peak booking loads (500 bookings/minute)
 * - SC-002: API response times (p95 <200ms)
 * - SC-006: Concurrent users (1000+ users without degradation)
 */

// Base URL for API endpoints (override via environment variable)
export const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// Authentication tokens (set via environment variables for security)
export const STUDENT_TOKEN = __ENV.STUDENT_TOKEN || '';
export const TEACHER_TOKEN = __ENV.TEACHER_TOKEN || '';
export const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

// Load test scenarios
export const scenarios = {
  // Smoke test: Minimal load to verify system works
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Average load: Normal operating conditions
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
    gracefulRampDown: '30s',
  },

  // Stress test: Push system to limits (1000+ concurrent users - SC-006)
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 500 },   // Ramp to 500
      { duration: '5m', target: 500 },   // Hold at 500
      { duration: '2m', target: 1000 },  // Ramp to 1000
      { duration: '5m', target: 1000 },  // Hold at 1000 (SC-006)
      { duration: '2m', target: 1500 },  // Push beyond
      { duration: '5m', target: 1500 },  // Hold to observe breaking point
      { duration: '5m', target: 0 },     // Ramp down
    ],
    gracefulRampDown: '1m',
  },

  // Spike test: Sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },  // Normal load
      { duration: '1m', target: 1000 },  // Sudden spike
      { duration: '3m', target: 1000 },  // Sustained spike
      { duration: '10s', target: 100 },  // Return to normal
      { duration: '3m', target: 100 },   // Recovery
      { duration: '10s', target: 0 },    // End
    ],
    gracefulRampDown: '30s',
  },

  // Soak test: Extended duration to detect memory leaks
  soak: {
    executor: 'constant-vus',
    vus: 200,
    duration: '30m',  // Run for 30 minutes
  },

  // Peak booking load: Validate NFR-007 (500 bookings/min)
  peak_bookings: {
    executor: 'constant-arrival-rate',
    rate: 500,        // 500 iterations per minute
    timeUnit: '1m',   // Per minute
    duration: '5m',   // Run for 5 minutes
    preAllocatedVUs: 100,
    maxVUs: 500,
  },
};

// Performance thresholds (based on NFRs and Success Criteria)
export const thresholds = {
  // NFR-002: Class search results return in <500ms
  'http_req_duration{endpoint:search}': ['p(95)<500'],

  // SC-002: System maintains <200ms p95 response time
  'http_req_duration{endpoint:dashboard}': ['p(95)<200'],
  'http_req_duration{endpoint:booking}': ['p(95)<200'],

  // NFR-004: Payment processing completes within 10 seconds
  'http_req_duration{endpoint:payment}': ['p(95)<10000'],

  // General API health
  http_req_failed: ['rate<0.01'],        // Less than 1% failure rate
  http_req_duration: ['p(95)<500'],      // 95th percentile under 500ms
  http_req_waiting: ['p(95)<400'],       // Server processing under 400ms

  // Iteration duration (complete user flow)
  iteration_duration: ['p(95)<5000'],    // Complete flow under 5 seconds

  // Virtual users
  vus: ['value>0'],                      // Ensure VUs are running
  vus_max: ['value>0'],                  // Ensure max VUs allocated

  // Data transfer
  data_received: ['rate>10000'],         // At least 10KB/s received
  data_sent: ['rate>5000'],              // At least 5KB/s sent

  // Iterations
  iterations: ['count>0'],               // At least some iterations completed
  iteration_duration: ['avg<3000'],      // Average iteration under 3 seconds

  // Checks (custom success criteria)
  checks: ['rate>0.95'],                 // 95% of checks pass
};

// HTTP configuration
export const http = {
  batch: 10,                    // Batch up to 10 requests
  batchPerHost: 6,              // Up to 6 per host
  timeout: '30s',               // Request timeout
  responseType: 'text',         // Response type
};

// Teardown timeout
export const teardownTimeout = '60s';

// Summary export configuration
export const summaryTrendStats = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];

// Custom summary output
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Helper function to select scenario
export function getScenario() {
  const scenario = __ENV.SCENARIO || 'smoke';
  return scenarios[scenario] || scenarios.smoke;
}

// Helper function to get thresholds
export function getThresholds() {
  return thresholds;
}

export default {
  scenarios,
  thresholds,
  http,
  teardownTimeout,
  summaryTrendStats,
};
