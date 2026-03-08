# Performance Testing - Quick Start Guide

Get started with performance testing in 5 minutes.

## 1. Install k6

**Windows:**
```powershell
choco install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
wget -qO- https://dl.k6.io/key.gpg | sudo apt-key add -
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## 2. Start Your API

Ensure your backend API is running:
```bash
cd backend
npm run dev
# API should be running on http://localhost:3001
```

## 3. Run Tests

### Option A: Interactive Mode (Recommended for beginners)

**Windows:**
```powershell
cd tests/performance
.\run-tests.bat
```

**macOS/Linux:**
```bash
cd tests/performance
./run-tests.sh
```

Then follow the prompts to select a scenario and test.

### Option B: Direct Commands

**Quick smoke test (30 seconds):**
```bash
cd tests/performance
k6 run -e SCENARIO=smoke booking-load.test.js
```

**Run all tests:**

Windows:
```powershell
.\run-tests.bat smoke all
```

macOS/Linux:
```bash
./run-tests.sh smoke all
```

## 4. Understanding Results

Look for these key indicators:

### ✅ Success (All Green)
```
✓ http_req_duration..............: avg=150ms  p(95)=189ms
✓ http_req_failed................: 0.50%
✓ checks.........................: 98.50%
```

All metrics with green checkmarks = Tests passed!

### ❌ Failure (Red X)
```
✗ http_req_duration..............: avg=650ms  p(95)=1200ms
✗ http_req_failed................: 15.00%
```

Red X marks indicate performance issues that need investigation.

## 5. Common Test Scenarios

### Smoke Test (Quick Validation)
**Duration:** 30 seconds
**Users:** 1
**Purpose:** Verify system works

```bash
k6 run -e SCENARIO=smoke class-search.test.js
```

### Average Load (Daily Operations)
**Duration:** 9 minutes
**Users:** 100
**Purpose:** Test normal usage

```bash
k6 run -e SCENARIO=average_load dashboard-load.test.js
```

### Stress Test (Find Breaking Point)
**Duration:** 26 minutes
**Users:** 500 → 1000 → 1500
**Purpose:** Test system limits

```bash
k6 run -e SCENARIO=stress concurrent-users.test.js
```

## 6. Test-Specific Commands

```bash
# Booking performance (NFR-007: 500 bookings/min)
k6 run -e SCENARIO=peak_bookings booking-load.test.js

# Search performance (NFR-002: <500ms)
k6 run -e SCENARIO=average_load class-search.test.js

# Dashboard performance (SC-002: <200ms p95)
k6 run -e SCENARIO=average_load dashboard-load.test.js

# Gem transaction integrity
k6 run -e SCENARIO=average_load gem-transaction.test.js

# Concurrent users (SC-006: 1000+ users)
k6 run concurrent-users.test.js

# Race condition testing
k6 run concurrent-bookings.test.js
```

## 7. Environment Variables

Set these if your API is not on localhost:3001:

**Windows:**
```powershell
$env:API_BASE_URL="https://api.example.com"
$env:FRONTEND_URL="https://example.com"
```

**macOS/Linux:**
```bash
export API_BASE_URL="https://api.example.com"
export FRONTEND_URL="https://example.com"
```

## 8. Troubleshooting

### "k6: command not found"
Install k6 (see step 1)

### "Connection refused"
Start your backend API (see step 2)

### "Performance thresholds exceeded"
Your API is too slow. Common causes:
- Missing database indexes
- Too many database queries (N+1 problem)
- Insufficient server resources
- Network latency

Check the detailed output to see which endpoints are slow.

### "Out of memory"
Reduce virtual users:
```bash
k6 run -e SCENARIO=smoke test.js  # Uses only 1 user
```

## 9. NFR Validation Checklist

After running all tests, verify these requirements:

- [ ] **NFR-002**: Search response p95 < 500ms *(class-search.test.js)*
- [ ] **NFR-007**: 500 bookings/minute *(booking-load.test.js)*
- [ ] **SC-002**: Dashboard p95 < 200ms *(dashboard-load.test.js)*
- [ ] **SC-002**: Booking p95 < 200ms *(booking-load.test.js)*
- [ ] **SC-006**: 1000+ concurrent users *(concurrent-users.test.js)*
- [ ] **Atomicity**: No double-spending *(gem-transaction.test.js)*
- [ ] **Race Conditions**: No double-booking *(concurrent-bookings.test.js)*

## 10. Next Steps

1. **Review full README.md** for detailed test descriptions
2. **Check k6.config.js** to customize scenarios
3. **Generate test data** with `generate-test-data.ts` if needed
4. **Set up CI/CD** to run tests automatically (see README.md)

---

## Quick Reference

| Command | Test | Scenario | Duration |
|---------|------|----------|----------|
| `./run-tests.sh smoke all` | All tests | Smoke | ~5 min |
| `./run-tests.sh average_load booking` | Booking | Average | 9 min |
| `./run-tests.sh stress concurrent` | Concurrent users | Stress | 26 min |
| `k6 run -e SCENARIO=peak_bookings booking-load.test.js` | Booking | Peak | 5 min |

**Need help?** See `README.md` for detailed documentation.
