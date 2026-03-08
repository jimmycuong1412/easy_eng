-- Critical Query Performance Analysis
-- Run EXPLAIN ANALYZE on critical queries to validate performance

-- NFR-002: Class search (should return in <500ms for 10,000 classes)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  c.id,
  c.title,
  c.description,
  c.schedule,
  c.duration_minutes,
  c.price,
  c.capacity,
  c.level,
  p.full_name as teacher_name
FROM classes c
JOIN profiles p ON c.teacher_id = p.id
WHERE c.status = 'scheduled'
  AND c.schedule >= NOW()
  AND c.level = 'Intermediate'
  AND c.price BETWEEN 10 AND 30
ORDER BY c.schedule ASC
LIMIT 50;

-- SC-002: Student dashboard data (should load in <200ms)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  b.id,
  b.booking_date,
  b.status,
  b.final_price,
  c.title,
  c.schedule,
  p.full_name as teacher_name
FROM bookings b
JOIN classes c ON b.class_id = c.id
JOIN profiles p ON c.teacher_id = p.id
WHERE b.student_id = 'test-student-uuid'
  AND c.schedule >= NOW()
ORDER BY c.schedule ASC
LIMIT 10;

-- Gem balance calculation (frequent query)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0) as balance
FROM gem_transactions
WHERE student_id = 'test-student-uuid';

-- Teacher earnings summary
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) as total_earnings,
  COUNT(*) as num_classes
FROM teacher_earnings
WHERE teacher_id = 'test-teacher-uuid'
  AND created_at >= NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month DESC;

-- Admin analytics: User growth
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  DATE_TRUNC('day', created_at) as day,
  role,
  COUNT(*) as new_users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day, role
ORDER BY day DESC;

-- Concurrent booking check (critical for race conditions)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  c.id,
  c.capacity,
  COUNT(b.id) as current_bookings
FROM classes c
LEFT JOIN bookings b ON c.id = b.class_id AND b.status = 'confirmed'
WHERE c.id = 'test-class-uuid'
GROUP BY c.id, c.capacity
FOR UPDATE;
