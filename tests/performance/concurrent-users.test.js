/**
 * Concurrent Users Performance Test
 * Validates SC-006: System handles 1000+ concurrent users without performance degradation
 *
 * Success Criteria:
 * - System stable with 1000+ concurrent users
 * - Response times remain within thresholds under load
 * - No significant error rate increase
 * - Resource usage remains acceptable
 * - All user types (student, teacher, admin) function correctly
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const userSessionSuccessRate = new Rate('user_session_success');
const loginDuration = new Trend('login_duration');
const actionDuration = new Trend('action_duration');
const errorsByType = new Counter('errors_by_type');
const concurrentUserCount = new Counter('concurrent_user_count');
const sessionFailures = new Counter('session_failures');

// Test configuration
export const options = {
  scenarios: {
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },   // Ramp up to 500 users
        { duration: '3m', target: 500 },   // Hold at 500
        { duration: '2m', target: 1000 },  // Ramp to 1000 (SC-006)
        { duration: '5m', target: 1000 },  // Hold at 1000 - critical test period
        { duration: '2m', target: 1500 },  // Push beyond to test limits
        { duration: '3m', target: 1500 },  // Hold at 1500
        { duration: '3m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: {
    ...getThresholds(),
    'user_session_success': ['rate>0.95'],
    'login_duration': ['p(95)<300'],
    'action_duration': ['p(95)<500'],
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'],  // Allow 5% failures under extreme load
    'errors_by_type': ['count<500'],
    'session_failures': ['count<100'],
  },
};

// User actions to simulate
const userActions = {
  student: [
    'browse_classes',
    'search_classes',
    'view_dashboard',
    'check_balance',
    'view_schedule',
    'view_progress',
  ],
  teacher: [
    'view_dashboard',
    'check_schedule',
    'view_students',
    'view_earnings',
    'update_availability',
  ],
  admin: [
    'view_dashboard',
    'view_users',
    'view_analytics',
    'view_revenue',
    'check_system_health',
  ],
};

// Setup: Load test data
export function setup() {
  console.log('Loading test data for concurrent users test...');

  const studentsRes = http.get(`${BASE_URL}/api/test/students?limit=1500`);
  const students = JSON.parse(studentsRes.body).students || [];

  const teachersRes = http.get(`${BASE_URL}/api/test/teachers?limit=300`);
  const teachers = JSON.parse(teachersRes.body).teachers || [];

  const adminsRes = http.get(`${BASE_URL}/api/test/admins?limit=20`);
  const admins = JSON.parse(adminsRes.body).admins || [];

  const classesRes = http.get(`${BASE_URL}/api/classes?status=scheduled&limit=500`);
  const classes = JSON.parse(classesRes.body).classes || [];

  console.log(`Loaded ${students.length} students, ${teachers.length} teachers, ${admins.length} admins`);
  console.log(`Available classes: ${classes.length}`);

  return { students, teachers, admins, classes };
}

// Main test function - simulates a complete user session
export default function (data) {
  const { students, teachers, admins, classes } = data;

  concurrentUserCount.add(1);

  // Randomly select user type (weighted distribution)
  const userType = Math.random();
  let user, role, actions;

  if (userType < 0.7 && students.length > 0) {
    // 70% students
    user = students[Math.floor(Math.random() * students.length)];
    role = 'student';
    actions = userActions.student;
  } else if (userType < 0.95 && teachers.length > 0) {
    // 25% teachers
    user = teachers[Math.floor(Math.random() * teachers.length)];
    role = 'teacher';
    actions = userActions.teacher;
  } else if (admins.length > 0) {
    // 5% admins
    user = admins[Math.floor(Math.random() * admins.length)];
    role = 'admin';
    actions = userActions.admin;
  } else {
    return;
  }

  // Simulate user session
  const sessionSuccess = simulateUserSession(user, role, actions, classes);

  if (!sessionSuccess) {
    sessionFailures.add(1);
  }

  // Variable think time between actions
  sleep(Math.random() * 3 + 1);
}

function simulateUserSession(user, role, actions, classes) {
  // Login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: 'TestPassword123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth', role: role }
    }
  );
  const loginTime = Date.now() - loginStart;

  loginDuration.add(loginTime);

  const loginSuccess = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login < 300ms': () => loginTime < 300,
    'token received': (r) => {
      if (r.status !== 200) return false;
      const body = JSON.parse(r.body);
      return body.token !== undefined;
    },
  });

  if (!loginSuccess) {
    errorsByType.add(1, { type: 'login_failed' });
    return false;
  }

  const token = JSON.parse(loginRes.body).token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Perform 3-5 random actions
  const actionCount = Math.floor(Math.random() * 3) + 3;
  let successfulActions = 0;

  for (let i = 0; i < actionCount; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const actionSuccess = performAction(action, role, authHeaders, classes);

    if (actionSuccess) {
      successfulActions++;
    }

    // Think time between actions
    sleep(Math.random() * 2 + 0.5);
  }

  const sessionSuccess = successfulActions >= actionCount * 0.8;
  userSessionSuccessRate.add(sessionSuccess);

  return sessionSuccess;
}

function performAction(action, role, authHeaders, classes) {
  let endpoint;
  let method = 'GET';
  let body = null;

  // Map action to endpoint
  switch (action) {
    case 'browse_classes':
      endpoint = '/api/classes?status=scheduled&limit=20';
      break;
    case 'search_classes':
      endpoint = '/api/classes/search?level=B1&limit=20';
      break;
    case 'view_dashboard':
      endpoint = `/api/dashboard/${role}`;
      break;
    case 'check_balance':
      endpoint = '/api/gems/balance';
      break;
    case 'view_schedule':
      endpoint = '/api/bookings/my-schedule';
      break;
    case 'view_progress':
      endpoint = '/api/students/progress';
      break;
    case 'check_schedule':
      endpoint = '/api/teachers/schedule';
      break;
    case 'view_students':
      endpoint = '/api/teachers/students';
      break;
    case 'view_earnings':
      endpoint = '/api/teachers/earnings';
      break;
    case 'update_availability':
      endpoint = '/api/teachers/availability';
      method = 'PUT';
      body = JSON.stringify({
        available_slots: [
          { day: 'monday', start_time: '09:00', end_time: '17:00' }
        ]
      });
      break;
    case 'view_users':
      endpoint = '/api/admin/users?limit=50';
      break;
    case 'view_analytics':
      endpoint = '/api/admin/analytics';
      break;
    case 'view_revenue':
      endpoint = '/api/admin/revenue';
      break;
    case 'check_system_health':
      endpoint = '/api/admin/system-health';
      break;
    default:
      endpoint = '/api/health';
  }

  // Perform action
  const actionStart = Date.now();
  let response;

  if (method === 'GET') {
    response = http.get(
      `${BASE_URL}${endpoint}`,
      {
        headers: authHeaders,
        tags: { endpoint: action, role: role }
      }
    );
  } else if (method === 'PUT') {
    response = http.put(
      `${BASE_URL}${endpoint}`,
      body,
      {
        headers: authHeaders,
        tags: { endpoint: action, role: role }
      }
    );
  }

  const actionTime = Date.now() - actionStart;
  actionDuration.add(actionTime);

  const success = check(response, {
    'action successful': (r) => r.status >= 200 && r.status < 300,
    'action < 500ms': () => actionTime < 500,
  });

  if (!success) {
    errorsByType.add(1, { type: action, status: response.status });
  }

  return success;
}

// Teardown: Report summary
export function teardown(data) {
  console.log('\n=== Concurrent Users Performance Test Summary ===');
  console.log('SC-006 Requirement: 1000+ concurrent users without degradation');
  console.log('Test progression:');
  console.log('  - 500 users: Baseline performance');
  console.log('  - 1000 users: Target requirement validation');
  console.log('  - 1500 users: System limit testing');
  console.log('\nMonitor metrics at each stage to identify degradation points');
}
