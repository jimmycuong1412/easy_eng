# Database Indexing Recommendations

## Overview

This document provides indexing recommendations for optimizing database query performance to meet NFR requirements.

## Performance Requirements

- **NFR-002**: Class search results < 500ms for 10,000+ classes
- **SC-002**: Dashboard queries p95 < 200ms
- **NFR-007**: Support 500 bookings/minute peak load

## Critical Indexes

### Classes Table

```sql
-- Composite index for class search with filters
CREATE INDEX idx_classes_search ON classes(status, schedule, level, price)
WHERE status = 'scheduled';

-- Index for teacher's classes
CREATE INDEX idx_classes_teacher_schedule ON classes(teacher_id, schedule)
WHERE status IN ('scheduled', 'live');

-- Full-text search for class titles/descriptions
CREATE INDEX idx_classes_fulltext ON classes USING GIN(
  to_tsvector('english', title || ' ' || description)
);
```

### Bookings Table

```sql
-- Student's bookings (frequent dashboard query)
CREATE INDEX idx_bookings_student ON bookings(student_id, status)
INCLUDE (class_id, booking_date, final_price);

-- Class capacity check (concurrent booking conflicts)
CREATE INDEX idx_bookings_class_status ON bookings(class_id, status)
WHERE status = 'confirmed';

-- Booking date range queries
CREATE INDEX idx_bookings_date ON bookings(booking_date DESC);
```

### Gem Transactions Table

```sql
-- Student gem balance calculation (very frequent)
CREATE INDEX idx_gem_transactions_student ON gem_transactions(student_id, type, amount);

-- Audit queries by date
CREATE INDEX idx_gem_transactions_audit ON gem_transactions(created_at DESC, student_id);

-- Admin gem analytics
CREATE INDEX idx_gem_transactions_analytics ON gem_transactions(created_at, type);
```

### Profiles Table

```sql
-- Role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- Teacher lookup by rating
CREATE INDEX idx_profiles_teacher_rating ON profiles(role, rating DESC)
WHERE role = 'teacher';
```

### Teacher Earnings Table

```sql
-- Teacher revenue dashboard
CREATE INDEX idx_teacher_earnings_summary ON teacher_earnings(teacher_id, created_at DESC);

-- Monthly aggregations
CREATE INDEX idx_teacher_earnings_month ON teacher_earnings(
  teacher_id,
  DATE_TRUNC('month', created_at)
);
```

## Query Optimization Tips

### 1. Use Covering Indexes

Include frequently accessed columns in indexes to avoid table lookups:

```sql
CREATE INDEX idx_bookings_student_covering ON bookings(student_id)
INCLUDE (class_id, final_price, gems_used, status);
```

### 2. Partial Indexes

Index only relevant rows to reduce index size:

```sql
CREATE INDEX idx_active_bookings ON bookings(class_id)
WHERE status IN ('confirmed', 'pending');
```

### 3. Index on Foreign Keys

Always index foreign keys for join performance:

```sql
CREATE INDEX idx_bookings_class_fk ON bookings(class_id);
CREATE INDEX idx_bookings_student_fk ON bookings(student_id);
```

## Monitoring Index Usage

### Check Index Usage Stats

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Identify Unused Indexes

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Find Missing Indexes

```sql
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND schemaname = 'public'
ORDER BY seq_tup_read DESC
LIMIT 20;
```

## Maintenance

### Reindex Schedule

```sql
-- Weekly reindex of heavily-updated tables
REINDEX TABLE bookings;
REINDEX TABLE gem_transactions;

-- Monthly reindex of all tables
REINDEX DATABASE easy_eng;
```

### Vacuum Schedule

```sql
-- Nightly vacuum
VACUUM ANALYZE bookings;
VACUUM ANALYZE gem_transactions;
VACUUM ANALYZE classes;
```

## Performance Validation

After applying indexes, run `tests/performance/query-analysis.sql` to verify:

1. **Class search** execution time < 50ms (10x safety margin for 500ms requirement)
2. **Dashboard queries** execution time < 20ms (10x safety margin for 200ms requirement)
3. **Gem balance** calculation < 10ms
4. **Index scan** used instead of sequential scan for all queries

## References

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Index-Only Scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
- [Query Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
