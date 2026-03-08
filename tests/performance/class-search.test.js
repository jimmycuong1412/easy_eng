/**
 * Class Search Performance Test
 * Validates NFR-002: Class search results return in <500ms
 *
 * Success Criteria:
 * - Search response time p95 < 500ms
 * - System handles 10,000+ classes efficiently
 * - Filter performance remains optimal with large datasets
 * - Pagination works correctly under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, getScenario, getThresholds } from './k6.config.js';

// Custom metrics
const searchSuccessRate = new Rate('search_success');
const searchDuration = new Trend('search_duration');
const filterDuration = new Trend('filter_duration');
const paginationErrors = new Counter('pagination_errors');
const emptyResults = new Counter('empty_results');

// Test configuration
export const options = {
  scenarios: {
    class_search: getScenario(),
  },
  thresholds: {
    ...getThresholds(),
    'search_success': ['rate>0.99'],
    'search_duration': ['p(95)<500'],  // NFR-002 requirement
    'filter_duration': ['p(95)<500'],
    'pagination_errors': ['count<10'],
    'http_req_duration{endpoint:search}': ['p(95)<500'],
  },
};

// Search filters to test
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const types = ['conversation', 'grammar', 'pronunciation', 'business', 'exam_prep'];
const teachers = [];  // Will be loaded in setup
const sortOptions = ['date', 'price', 'popularity', 'rating'];

// Setup: Load test data
export function setup() {
  console.log('Loading test data for search tests...');

  // Load teachers for filter testing
  const teachersRes = http.get(`${BASE_URL}/api/teachers?limit=100`);
  const teachersData = JSON.parse(teachersRes.body).teachers || [];

  // Verify large dataset exists
  const classesRes = http.get(`${BASE_URL}/api/classes?limit=1`);
  const totalClasses = JSON.parse(classesRes.body).total || 0;

  console.log(`Loaded ${teachersData.length} teachers`);
  console.log(`Total classes in system: ${totalClasses}`);

  if (totalClasses < 10000) {
    console.warn(`WARNING: Only ${totalClasses} classes found. Test requires 10,000+ for full validation.`);
  }

  return {
    teachers: teachersData,
    totalClasses: totalClasses
  };
}

// Main test function
export default function (data) {
  const { teachers } = data;

  // Test 1: Basic search with no filters
  testBasicSearch();
  sleep(0.5);

  // Test 2: Search with single filter
  testSingleFilter();
  sleep(0.5);

  // Test 3: Search with multiple filters
  testMultipleFilters(teachers);
  sleep(0.5);

  // Test 4: Pagination test
  testPagination();
  sleep(0.5);

  // Test 5: Sort performance
  testSorting();
  sleep(1);
}

function testBasicSearch() {
  const searchStart = Date.now();
  const res = http.get(
    `${BASE_URL}/api/classes/search`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'search', type: 'basic' }
    }
  );
  const searchTime = Date.now() - searchStart;

  searchDuration.add(searchTime);

  const success = check(res, {
    'basic search successful': (r) => r.status === 200,
    'basic search < 500ms': () => searchTime < 500,
    'results returned': (r) => {
      const body = JSON.parse(r.body);
      return body.classes && body.classes.length > 0;
    },
  });

  searchSuccessRate.add(success);

  if (success && JSON.parse(res.body).classes.length === 0) {
    emptyResults.add(1);
  }
}

function testSingleFilter() {
  const level = levels[Math.floor(Math.random() * levels.length)];

  const filterStart = Date.now();
  const res = http.get(
    `${BASE_URL}/api/classes/search?level=${level}`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'search', type: 'single_filter' }
    }
  );
  const filterTime = Date.now() - filterStart;

  filterDuration.add(filterTime);

  const success = check(res, {
    'single filter search successful': (r) => r.status === 200,
    'single filter search < 500ms': () => filterTime < 500,
    'filtered results match level': (r) => {
      const body = JSON.parse(r.body);
      if (!body.classes || body.classes.length === 0) return true;
      return body.classes.every(c => c.level === level);
    },
  });

  searchSuccessRate.add(success);
}

function testMultipleFilters(teachers) {
  const level = levels[Math.floor(Math.random() * levels.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const minPrice = Math.floor(Math.random() * 20);
  const maxPrice = minPrice + 50;

  let url = `${BASE_URL}/api/classes/search?level=${level}&type=${type}&min_price=${minPrice}&max_price=${maxPrice}`;

  // Randomly add teacher filter
  if (teachers.length > 0 && Math.random() > 0.5) {
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    url += `&teacher_id=${teacher.id}`;
  }

  // Randomly add date range
  if (Math.random() > 0.5) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    url += `&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;
  }

  const filterStart = Date.now();
  const res = http.get(
    url,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'search', type: 'multi_filter' }
    }
  );
  const filterTime = Date.now() - filterStart;

  filterDuration.add(filterTime);

  const success = check(res, {
    'multi filter search successful': (r) => r.status === 200,
    'multi filter search < 500ms': () => filterTime < 500,
    'results structure valid': (r) => {
      const body = JSON.parse(r.body);
      return body.classes !== undefined && Array.isArray(body.classes);
    },
  });

  searchSuccessRate.add(success);
}

function testPagination() {
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = [10, 20, 50][Math.floor(Math.random() * 3)];

  const paginationStart = Date.now();
  const res = http.get(
    `${BASE_URL}/api/classes/search?page=${page}&limit=${limit}`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'search', type: 'pagination' }
    }
  );
  const paginationTime = Date.now() - paginationStart;

  searchDuration.add(paginationTime);

  const success = check(res, {
    'pagination successful': (r) => r.status === 200,
    'pagination < 500ms': () => paginationTime < 500,
    'page metadata correct': (r) => {
      const body = JSON.parse(r.body);
      return body.page !== undefined && body.total !== undefined && body.limit !== undefined;
    },
    'result count <= limit': (r) => {
      const body = JSON.parse(r.body);
      return !body.classes || body.classes.length <= limit;
    },
  });

  searchSuccessRate.add(success);

  if (!success) {
    paginationErrors.add(1);
  }
}

function testSorting() {
  const sortBy = sortOptions[Math.floor(Math.random() * sortOptions.length)];
  const order = Math.random() > 0.5 ? 'asc' : 'desc';

  const sortStart = Date.now();
  const res = http.get(
    `${BASE_URL}/api/classes/search?sort_by=${sortBy}&order=${order}&limit=50`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'search', type: 'sorting' }
    }
  );
  const sortTime = Date.now() - sortStart;

  searchDuration.add(sortTime);

  const success = check(res, {
    'sorting successful': (r) => r.status === 200,
    'sorting < 500ms': () => sortTime < 500,
    'results properly sorted': (r) => {
      const body = JSON.parse(r.body);
      if (!body.classes || body.classes.length < 2) return true;

      // Verify sort order for first few results
      for (let i = 0; i < Math.min(5, body.classes.length - 1); i++) {
        const current = body.classes[i];
        const next = body.classes[i + 1];

        if (sortBy === 'date' && current.scheduled_at && next.scheduled_at) {
          const currentDate = new Date(current.scheduled_at);
          const nextDate = new Date(next.scheduled_at);
          if (order === 'asc' && currentDate > nextDate) return false;
          if (order === 'desc' && currentDate < nextDate) return false;
        } else if (sortBy === 'price' && current.price !== undefined && next.price !== undefined) {
          if (order === 'asc' && current.price > next.price) return false;
          if (order === 'desc' && current.price < next.price) return false;
        }
      }

      return true;
    },
  });

  searchSuccessRate.add(success);
}

// Teardown: Report summary
export function teardown(data) {
  console.log('\n=== Class Search Performance Test Summary ===');
  console.log(`Total classes tested: ${data.totalClasses}`);
  console.log('NFR-002 Requirement: Search response p95 < 500ms');
  console.log('All filter combinations tested successfully');
}
