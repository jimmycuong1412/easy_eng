/**
 * Dashboard Load Performance Test
 * Validates SC-002: System maintains <200ms p95 response time for dashboards
 *
 * Success Criteria:
 * - Student dashboard p95 < 200ms
 * - Teacher dashboard p95 < 200ms
 * - Admin dashboard p95 < 200ms
 * - Widget load times optimized
 * - Concurrent dashboard loads handled efficiently
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const dashboardSuccessRate = new Rate('dashboard_success');
const studentDashboardDuration = new Trend('student_dashboard_duration');
const teacherDashboardDuration = new Trend('teacher_dashboard_duration');
const adminDashboardDuration = new Trend('admin_dashboard_duration');
const widgetLoadDuration = new Trend('widget_load_duration');
const authErrors = new Counter('auth_errors');
const widgetErrors = new Counter('widget_errors');

// Test configuration
export const options = {
  scenarios: {
    dashboard_load: getScenario(),
  },
  thresholds: {
    ...getThresholds(),
    'dashboard_success': ['rate>0.99'],
    'student_dashboard_duration': ['p(95)<200'],  // SC-002 requirement
    'teacher_dashboard_duration': ['p(95)<200'],  // SC-002 requirement
    'admin_dashboard_duration': ['p(95)<200'],    // SC-002 requirement
    'widget_load_duration': ['p(95)<150'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<200'],
    'auth_errors': ['count<10'],
    'widget_errors': ['count<20'],
  },
};

// Setup: Load test users
export function setup() {
  console.log('Loading test users for dashboard tests...');

  const studentsRes = http.get(`${BASE_URL}/api/test/students?limit=500`);
  const students = JSON.parse(studentsRes.body).students || [];

  const teachersRes = http.get(`${BASE_URL}/api/test/teachers?limit=100`);
  const teachers = JSON.parse(teachersRes.body).teachers || [];

  const adminsRes = http.get(`${BASE_URL}/api/test/admins?limit=10`);
  const admins = JSON.parse(adminsRes.body).admins || [];

  console.log(`Loaded ${students.length} students, ${teachers.length} teachers, ${admins.length} admins`);

  return { students, teachers, admins };
}

// Main test function
export default function (data) {
  const { students, teachers, admins } = data;

  // Randomly select user type to simulate real usage
  const userType = Math.random();

  if (userType < 0.6 && students.length > 0) {
    // 60% student dashboards
    testStudentDashboard(students);
  } else if (userType < 0.9 && teachers.length > 0) {
    // 30% teacher dashboards
    testTeacherDashboard(teachers);
  } else if (admins.length > 0) {
    // 10% admin dashboards
    testAdminDashboard(admins);
  }

  sleep(Math.random() * 2 + 1);
}

function testStudentDashboard(students) {
  const student = students[Math.floor(Math.random() * students.length)];

  // Authenticate
  const token = authenticate(student.email, 'TestPassword123!');
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Load student dashboard
  const dashboardStart = Date.now();
  const dashboardRes = http.get(
    `${BASE_URL}/api/dashboard/student`,
    {
      headers: authHeaders,
      tags: { endpoint: 'dashboard', role: 'student' }
    }
  );
  const dashboardTime = Date.now() - dashboardStart;

  studentDashboardDuration.add(dashboardTime);

  const success = check(dashboardRes, {
    'student dashboard loaded': (r) => r.status === 200,
    'student dashboard < 200ms': () => dashboardTime < 200,
    'dashboard data complete': (r) => {
      const body = JSON.parse(r.body);
      return body.upcoming_classes !== undefined &&
             body.completed_classes !== undefined &&
             body.gem_balance !== undefined &&
             body.learning_stats !== undefined;
    },
  });

  dashboardSuccessRate.add(success);

  // Load dashboard widgets in parallel
  const widgetStart = Date.now();
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/dashboard/student/upcoming-classes`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'upcoming' } }],
    ['GET', `${BASE_URL}/api/dashboard/student/progress`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'progress' } }],
    ['GET', `${BASE_URL}/api/dashboard/student/achievements`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'achievements' } }],
    ['GET', `${BASE_URL}/api/dashboard/student/recommended-classes`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'recommended' } }],
  ]);
  const widgetTime = Date.now() - widgetStart;

  widgetLoadDuration.add(widgetTime);

  responses.forEach((res, idx) => {
    const widgetSuccess = check(res, {
      'widget loaded': (r) => r.status === 200,
      'widget < 150ms': () => res.timings.duration < 150,
    });

    if (!widgetSuccess) {
      widgetErrors.add(1);
    }
  });
}

function testTeacherDashboard(teachers) {
  const teacher = teachers[Math.floor(Math.random() * teachers.length)];

  // Authenticate
  const token = authenticate(teacher.email, 'TestPassword123!');
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Load teacher dashboard
  const dashboardStart = Date.now();
  const dashboardRes = http.get(
    `${BASE_URL}/api/dashboard/teacher`,
    {
      headers: authHeaders,
      tags: { endpoint: 'dashboard', role: 'teacher' }
    }
  );
  const dashboardTime = Date.now() - dashboardStart;

  teacherDashboardDuration.add(dashboardTime);

  const success = check(dashboardRes, {
    'teacher dashboard loaded': (r) => r.status === 200,
    'teacher dashboard < 200ms': () => dashboardTime < 200,
    'dashboard data complete': (r) => {
      const body = JSON.parse(r.body);
      return body.upcoming_classes !== undefined &&
             body.total_students !== undefined &&
             body.earnings !== undefined &&
             body.rating !== undefined;
    },
  });

  dashboardSuccessRate.add(success);

  // Load teacher widgets
  const widgetStart = Date.now();
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/dashboard/teacher/schedule`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'schedule' } }],
    ['GET', `${BASE_URL}/api/dashboard/teacher/students`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'students' } }],
    ['GET', `${BASE_URL}/api/dashboard/teacher/earnings`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'earnings' } }],
    ['GET', `${BASE_URL}/api/dashboard/teacher/reviews`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'reviews' } }],
  ]);
  const widgetTime = Date.now() - widgetStart;

  widgetLoadDuration.add(widgetTime);

  responses.forEach((res) => {
    const widgetSuccess = check(res, {
      'widget loaded': (r) => r.status === 200,
      'widget < 150ms': () => res.timings.duration < 150,
    });

    if (!widgetSuccess) {
      widgetErrors.add(1);
    }
  });
}

function testAdminDashboard(admins) {
  const admin = admins[Math.floor(Math.random() * admins.length)];

  // Authenticate
  const token = authenticate(admin.email, 'TestPassword123!');
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Load admin dashboard
  const dashboardStart = Date.now();
  const dashboardRes = http.get(
    `${BASE_URL}/api/dashboard/admin`,
    {
      headers: authHeaders,
      tags: { endpoint: 'dashboard', role: 'admin' }
    }
  );
  const dashboardTime = Date.now() - dashboardStart;

  adminDashboardDuration.add(dashboardTime);

  const success = check(dashboardRes, {
    'admin dashboard loaded': (r) => r.status === 200,
    'admin dashboard < 200ms': () => dashboardTime < 200,
    'dashboard data complete': (r) => {
      const body = JSON.parse(r.body);
      return body.total_users !== undefined &&
             body.active_classes !== undefined &&
             body.revenue !== undefined &&
             body.system_health !== undefined;
    },
  });

  dashboardSuccessRate.add(success);

  // Load admin widgets
  const widgetStart = Date.now();
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/dashboard/admin/users`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'users' } }],
    ['GET', `${BASE_URL}/api/dashboard/admin/classes`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'classes' } }],
    ['GET', `${BASE_URL}/api/dashboard/admin/revenue`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'revenue' } }],
    ['GET', `${BASE_URL}/api/dashboard/admin/analytics`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'analytics' } }],
    ['GET', `${BASE_URL}/api/dashboard/admin/pending-approvals`, null, { headers: authHeaders, tags: { endpoint: 'widget', type: 'approvals' } }],
  ]);
  const widgetTime = Date.now() - widgetStart;

  widgetLoadDuration.add(widgetTime);

  responses.forEach((res) => {
    const widgetSuccess = check(res, {
      'widget loaded': (r) => r.status === 200,
      'widget < 150ms': () => res.timings.duration < 150,
    });

    if (!widgetSuccess) {
      widgetErrors.add(1);
    }
  });
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

  const authSuccess = check(loginRes, {
    'authentication successful': (r) => r.status === 200,
  });

  if (!authSuccess) {
    authErrors.add(1);
    return null;
  }

  return JSON.parse(loginRes.body).token;
}

// Teardown: Report summary
export function teardown(data) {
  console.log('\n=== Dashboard Load Performance Test Summary ===');
  console.log('SC-002 Requirement: Dashboard p95 < 200ms');
  console.log('Tested student, teacher, and admin dashboards');
  console.log('Widget load times validated');
}
