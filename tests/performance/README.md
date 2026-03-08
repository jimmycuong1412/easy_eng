# Performance Testing Suite

This directory contains load testing and performance validation for the Easy English Learning Platform.

## 📋 Requirements Validated

This test suite validates the following Non-Functional Requirements (NFRs) and Success Criteria (SCs):

- **NFR-007**: Platform handles peak booking loads (500 bookings/minute during promotions)
- **SC-002**: System maintains <200ms p95 response time for browsing and booking operations
- **SC-006**: Platform handles 1000+ concurrent users without performance degradation
- **NFR-002**: Class search results return in under 500ms for catalogs up to 10,000 classes
- **NFR-004**: Payment processing completes within 10 seconds under normal conditions

## 🛠️ Setup

### Prerequisites

1. **Install k6** (load testing tool):
   ```bash
   # macOS
   brew install k6

   # Windows (via Chocolatey)
   choco install k6

   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   ```

2. **Install Node.js dependencies**:
   ```bash
   cd tests/performance
   npm install
   ```

3. **Generate test data**:
   ```bash
   # Set Supabase credentials
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_KEY="your-service-role-key"

   # Generate default test data (1000 users, 500 classes, 5000 bookings)
   npm run generate-data

   # Or customize
   node generate-test-data.ts --users=5000 --classes=1000 --bookings=10000
   ```

## 🚀 Running Tests

### Quick Test (Smoke)

Verify system works with minimal load:

```bash
export API_BASE_URL="http://localhost:3001"
export SCENARIO="smoke"
npm run test:booking
```

### Individual Test Suites

```bash
# Booking API load test (validates NFR-007: 500 bookings/min)
npm run test:booking

# Class search performance (validates NFR-002: <500ms)
npm run test:search

# Dashboard load test (validates SC-002: p95 <200ms)
npm run test:dashboard

# Gem transaction performance
npm run test:gems

# Concurrent user simulation (validates SC-006: 1000+ users)
npm run test:concurrent

# Concurrent booking conflicts
npm run test:conflicts
```

### Run All Tests

```bash
npm run test:all
```

### Test Scenarios

Control test intensity via `SCENARIO` environment variable:

```bash
# Smoke test (1 user, 30s)
SCENARIO=smoke npm run test:booking

# Average load (100 users, 9 min)
SCENARIO=average_load npm run test:booking

# Stress test (up to 1500 users, 26 min) - validates SC-006
SCENARIO=stress npm run test:booking

# Spike test (sudden 1000 user surge, 7 min)
SCENARIO=spike npm run test:booking

# Soak test (200 users, 30 min) - detect memory leaks
SCENARIO=soak npm run test:booking

# Peak booking load (500 bookings/min, 5 min) - validates NFR-007
SCENARIO=peak_bookings npm run test:booking
```

## 📊 Reading Results

### Success Criteria

Tests PASS if:
- ✅ `http_req_failed` < 1% (less than 1% failure rate)
- ✅ `http_req_duration{endpoint:search}` p95 < 500ms (NFR-002)
- ✅ `http_req_duration{endpoint:dashboard}` p95 < 200ms (SC-002)
- ✅ `http_req_duration{endpoint:booking}` p95 < 200ms (SC-002)
- ✅ `http_req_duration{endpoint:payment}` p95 < 10000ms (NFR-004)
- ✅ `checks` > 95% (custom assertions pass)
- ✅ System remains stable at 1000+ concurrent users (SC-006)

### Example Output

```
     ✓ status is 200
     ✓ response time < 200ms

     checks.........................: 98.50% ✓ 9850      ✗ 150
     data_received..................: 125 MB 20 MB/s
     data_sent......................: 15 MB  2.5 MB/s
     http_req_blocked...............: avg=1.2ms    min=0ms    med=0ms    max=150ms   p(90)=0ms    p(95)=0ms
     http_req_connecting............: avg=0.5ms    min=0ms    med=0ms    max=50ms    p(90)=0ms    p(95)=0ms
   ✓ http_req_duration..............: avg=150ms    min=50ms   med=120ms  max=800ms   p(90)=250ms  p(95)=350ms
     http_req_failed................: 0.50%  ✓ 50        ✗ 9950
     http_req_receiving.............: avg=2ms      min=0ms    med=1ms    max=100ms   p(90)=5ms    p(95)=10ms
     http_req_sending...............: avg=1ms      min=0ms    med=0ms    max=50ms    p(90)=2ms    p(95)=5ms
     http_req_waiting...............: avg=147ms    min=50ms   med=118ms  max=750ms   p(90)=245ms  p(95)=340ms
     iterations.....................: 10000  1666.67/s
     vus............................: 100    min=100     max=100
     vus_max........................: 100    min=100     max=100
```

### Interpreting Results

- **Green ✓**: Threshold passed (performance meets requirements)
- **Red ✗**: Threshold failed (performance issue detected)
- **p(95)**: 95th percentile - 95% of requests were faster than this
- **http_req_duration**: Total request time (network + server processing)
- **http_req_waiting**: Server processing time only
- **checks**: Custom assertions (e.g., status code, response content)

## 🔧 Configuration

Edit `k6.config.js` to customize:
- Load scenarios (VUs, duration, ramp patterns)
- Performance thresholds
- HTTP settings (timeouts, batching)

## 📁 Test Files

### 1. booking-load.test.js
**Validates**: NFR-007 (500 bookings/min peak load), SC-002 (p95 <200ms)

Tests peak booking loads and validates the system can handle 500 bookings per minute without errors. Ensures gem transactions remain atomic and booking response times stay under 200ms.

**Key Metrics**:
- `booking_success`: Must be >99%
- `booking_duration`: p95 <200ms
- `gem_deduction_errors`: Must be <10
- `concurrency_conflicts`: Must be <50

**Scenarios**: All standard scenarios supported

---

### 2. class-search.test.js
**Validates**: NFR-002 (search response <500ms with 10,000+ classes)

Tests class search performance with various filter combinations, pagination, and sorting. Validates system maintains fast search response times even with large class catalogs.

**Tests**:
- Basic search (no filters)
- Single filter (level, type, price)
- Multiple filters combined
- Pagination with large datasets
- Sort by date, price, popularity, rating

**Key Metrics**:
- `search_success`: Must be >99%
- `search_duration`: p95 <500ms
- `filter_duration`: p95 <500ms
- `pagination_errors`: Must be <10

**Scenarios**: smoke, average_load, stress recommended

---

### 3. dashboard-load.test.js
**Validates**: SC-002 (dashboard p95 <200ms)

Tests dashboard load times for all user roles (student, teacher, admin). Validates individual widget performance and ensures dashboards remain responsive under concurrent load.

**Tests**:
- Student dashboard (upcoming classes, progress, achievements, recommendations)
- Teacher dashboard (schedule, students, earnings, reviews)
- Admin dashboard (users, classes, revenue, analytics, approvals)
- Widget load times (target <150ms)

**Key Metrics**:
- `dashboard_success`: Must be >99%
- `student_dashboard_duration`: p95 <200ms
- `teacher_dashboard_duration`: p95 <200ms
- `admin_dashboard_duration`: p95 <200ms
- `widget_load_duration`: p95 <150ms

**Scenarios**: smoke, average_load, stress recommended

---

### 4. gem-transaction.test.js
**Tests**: Gem system performance, transaction atomicity, audit logging

Critical test for gem transaction integrity. Validates atomic transactions, prevents double-spending, and ensures balance consistency under concurrent load.

**Transaction Types Tested**:
- Earning: Class completion, achievements, referrals, daily login
- Spending: Bookings, item purchases, gifts

**Critical Validations**:
- No double-spending (double_spend_errors must be 0)
- Balance consistency (balance_inconsistencies must be 0)
- Audit log accuracy
- Transaction rollback on failure

**Key Metrics**:
- `transaction_success`: Must be >98%
- `transaction_duration`: p95 <200ms
- `double_spend_errors`: **MUST BE 0** (Critical)
- `balance_inconsistencies`: **MUST BE 0** (Critical)
- `audit_log_duration`: p95 <150ms

**Scenarios**: average_load, soak recommended

---

### 5. concurrent-users.test.js
**Validates**: SC-006 (1000+ concurrent users without degradation)

Comprehensive test simulating real user behavior across all user types. Validates system stability and response times at 500, 1000, and 1500 concurrent users.

**Test Stages**:
1. 500 users (2min ramp, 3min hold) - Baseline performance
2. 1000 users (2min ramp, 5min hold) - **Critical validation period for SC-006**
3. 1500 users (2min ramp, 3min hold) - System limit testing

**User Actions Simulated**:
- Students: Browse/search classes, view dashboard, check balance, view schedule/progress
- Teachers: View dashboard, check schedule, view students/earnings, update availability
- Admins: View dashboard, manage users, analytics, revenue, system health

**Key Metrics**:
- `user_session_success`: Must be >95%
- `login_duration`: p95 <300ms
- `action_duration`: p95 <500ms
- `session_failures`: Must be <100
- Monitor response time degradation at each load level

**Scenarios**: Use built-in multi-stage scenario (no SCENARIO variable needed)

---

### 6. concurrent-bookings.test.js
**Tests**: Race condition handling, database locking, booking conflicts

Specialized test for concurrent booking scenarios. Validates that multiple users attempting to book the same class (especially last spots) are handled correctly with proper database locking.

**Test Scenarios**:
1. **Last-spot race**: Multiple users competing for final spots in nearly-full classes
2. **Sustained concurrent**: 300 bookings/second sustained load

**Critical Validations**:
- No double-bookings (database locking works)
- No orphaned transactions (gem deduction rolled back on failure)
- Proper conflict resolution (409 responses)
- Class capacity constraints enforced
- Failed bookings don't deduct gems

**Key Metrics**:
- `booking_success`: Must be >85% (lower due to expected conflicts)
- `double_booking_errors`: **MUST BE 0** (Critical)
- `orphaned_transactions`: **MUST BE 0** (Critical)
- `race_condition_conflicts`: Should be >0 (proves conflicts detected)
- `conflict_resolution_time`: p95 <200ms

**Scenarios**: Use built-in multi-stage scenario

## 🐛 Troubleshooting

### Test Fails: Connection Refused

**Problem**: k6 can't connect to API
**Solution**: Ensure backend is running at `API_BASE_URL`

```bash
# Check backend is running
curl http://localhost:3001/health

# Start backend if needed
cd backend && npm run dev
```

### Test Fails: 401 Unauthorized

**Problem**: Authentication tokens missing or invalid
**Solution**: Set valid JWT tokens

```bash
export STUDENT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export TEACHER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Test Fails: Performance Thresholds

**Problem**: Response times exceed thresholds
**Solution**:
1. Check database indexes (see `docs/performance/indexing.md`)
2. Verify adequate server resources (CPU, RAM)
3. Check for N+1 query problems
4. Review database connection pool settings

### Memory Issues

**Problem**: k6 runs out of memory with high VU count
**Solution**: Increase Node.js memory limit

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test:stress
```

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Project NFRs](../../specs/001-english-learning-platform/spec.md#non-functional-requirements-optional)
