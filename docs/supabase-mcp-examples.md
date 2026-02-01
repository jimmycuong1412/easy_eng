# Supabase MCP Usage Examples

**Last Updated**: 2026-01-31

## Overview

This document provides practical examples of using Supabase MCP for common database development tasks.

## Table of Contents

1. [Database Exploration](#database-exploration)
2. [Natural Language Queries](#natural-language-queries)
3. [Schema Management](#schema-management)
4. [Type Generation](#type-generation)
5. [Migration Creation](#migration-creation)
6. [Performance Analysis](#performance-analysis)
7. [Data Analysis](#data-analysis)

---

## Database Exploration

### List All Tables

**Ask**:
```
Show me all tables in the database
```

**Result**: List of all tables in the `public` schema

### Describe Table Schema

**Ask**:
```
What columns does the profiles table have?
```

**Result**: Column names, types, constraints, defaults, and nullability

### Find Relationships

**Ask**:
```
Show me how the bookings table relates to other tables
```

**Result**: Foreign key relationships, referenced tables, and cardinality

### List Indexes

**Ask**:
```
What indexes exist on the gem_transactions table?
```

**Result**: Index names, columns, index type, and usage statistics

---

## Natural Language Queries

### Count Records

**Ask**:
```
How many students are registered?
```

**Translates To**:
```sql
SELECT COUNT(*)
FROM profiles
WHERE role = 'student';
```

### Find Recent Records

**Ask**:
```
Show me the 10 most recent bookings
```

**Translates To**:
```sql
SELECT *
FROM bookings
ORDER BY created_at DESC
LIMIT 10;
```

### Aggregate Queries

**Ask**:
```
What's the average number of gems used per booking in the last 30 days?
```

**Translates To**:
```sql
SELECT AVG(gems_used) as avg_gems
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND gems_used > 0;
```

### Join Queries

**Ask**:
```
Show me all bookings with student names and class titles
```

**Translates To**:
```sql
SELECT
  b.id,
  p.display_name as student_name,
  c.title as class_title,
  b.created_at
FROM bookings b
JOIN profiles p ON b.student_id = p.id
JOIN classes c ON b.class_id = c.id
ORDER BY b.created_at DESC;
```

---

## Schema Management

### Add Column

**Ask**:
```
Add an 'email_verified' boolean column to profiles table with default false
```

**Generates Migration**:
```sql
-- Up Migration
ALTER TABLE profiles
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;

-- Down Migration
ALTER TABLE profiles
DROP COLUMN email_verified;
```

**Remember**: Review the migration and commit it to version control!

### Create Index

**Ask**:
```
Create an index on bookings(class_id, created_at) for faster queries
```

**Generates Migration**:
```sql
-- Up Migration
CREATE INDEX idx_bookings_class_created
ON bookings(class_id, created_at DESC);

-- Down Migration
DROP INDEX idx_bookings_class_created;
```

### Add Constraint

**Ask**:
```
Add a check constraint to ensure gems_used is not negative in bookings
```

**Generates Migration**:
```sql
-- Up Migration
ALTER TABLE bookings
ADD CONSTRAINT chk_gems_non_negative
CHECK (gems_used >= 0);

-- Down Migration
ALTER TABLE bookings
DROP CONSTRAINT chk_gems_non_negative;
```

---

## Type Generation

### Generate Types for Single Table

**Ask**:
```
Generate TypeScript types for the bookings table
```

**Result**:
```typescript
export interface Booking {
  id: string;
  student_id: string;
  class_id: string;
  gems_used: number;
  discount_amount: number;
  final_price: number;
  status: 'pending' | 'confirmed' | 'attended' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

### Generate Types for All Tables

**Ask**:
```
Generate TypeScript types for all database tables
```

**Result**: Complete type definitions for the entire schema

### Generate Zod Schemas

**Ask**:
```
Generate Zod schemas for the profiles table for runtime validation
```

**Result**:
```typescript
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['student', 'teacher', 'admin']),
  display_name: z.string().min(1).max(100),
  avatar_url: z.string().url().optional(),
  timezone: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
```

---

## Migration Creation

### Simple Column Addition

**Ask**:
```
Create a migration to add a 'bio' text column to profiles
```

**Review Generated SQL**:
- Check column name spelling
- Verify data type is appropriate
- Ensure DEFAULT value is correct
- Confirm NULL/NOT NULL constraint

**Then**: Commit migration to `supabase/migrations/`

### Complex Schema Change

**Ask**:
```
Create a migration to add a 'referral_codes' table with columns: id, student_id (fk to profiles), code (unique), used_count, created_at
```

**Review Carefully**:
- Foreign key relationships
- Unique constraints
- Index creation for FKs
- RLS policies needed

### Add Enum Type

**Ask**:
```
Create a migration to add a booking_status enum type and update bookings table to use it
```

**Steps MCP Will Generate**:
1. Create enum type
2. Add temporary column
3. Migrate data
4. Drop old column
5. Rename new column

---

## Performance Analysis

### Explain Query Plan

**Ask**:
```
Explain the query plan for: SELECT * FROM bookings WHERE student_id = 'abc' ORDER BY created_at DESC
```

**Result**: Query execution plan with:
- Index usage
- Scan type (Index Scan vs Seq Scan)
- Estimated rows and cost
- Optimization suggestions

### Find Slow Queries

**Ask**:
```
Show me queries running for more than 5 seconds in the logs
```

**Result**: Recent slow queries with execution time and query text

### Suggest Indexes

**Ask**:
```
Suggest indexes for the bookings table based on common query patterns
```

**Result**: Recommended indexes with rationale

---

## Data Analysis

### Revenue Analysis

**Ask**:
```
Show me total revenue per teacher for the last month
```

**Generates**:
```sql
SELECT
  t.display_name as teacher_name,
  COUNT(b.id) as total_bookings,
  SUM(b.final_price) as total_revenue,
  SUM(b.final_price * 0.7) as teacher_earnings
FROM bookings b
JOIN classes c ON b.class_id = c.id
JOIN profiles t ON c.teacher_id = t.id
WHERE b.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  AND b.created_at < DATE_TRUNC('month', NOW())
  AND b.status = 'attended'
GROUP BY t.id, t.display_name
ORDER BY total_revenue DESC;
```

### User Engagement Metrics

**Ask**:
```
Calculate student engagement: total classes booked, gems earned, and gems spent per student
```

**Generates Complex Query**: Joins bookings, gem_transactions, and profiles

### Data Quality Checks

**Ask**:
```
Find bookings where final_price doesn't match (class price - discount_amount)
```

**Identifies Data Integrity Issues**: Useful for debugging and validation

---

## Best Practices

### ✅ DO

- Always review AI-generated SQL before executing
- Start with simple queries and build complexity gradually
- Use LIMIT for exploratory queries on large tables
- Test migrations on database branches first
- Document why a migration was created (in commit message)
- Use descriptive names for indexes and constraints

### ❌ DON'T

- Don't execute raw SQL without reviewing it first
- Don't disable manual approval for write operations
- Don't query production databases via MCP
- Don't share query results containing sensitive data
- Don't apply migrations without code review
- Don't assume AI-generated SQL is always optimal

---

## Troubleshooting Examples

### Query Timeout

**Problem**: Query taking too long

**Ask**:
```
Optimize this query: SELECT * FROM bookings WHERE created_at > '2024-01-01' ORDER BY created_at
```

**AI Suggests**:
- Add index on `created_at`
- Use `LIMIT` if you don't need all results
- Consider pagination

### Type Mismatch

**Problem**: Column type doesn't match application expectations

**Ask**:
```
Show me the data type of the 'price' column in classes table
```

**Then**:
```
Create a migration to change classes.price from integer to decimal(10,2)
```

### Missing Index

**Problem**: Slow foreign key lookups

**Ask**:
```
Does bookings.student_id have an index?
```

**If not**:
```
Create an index on bookings(student_id)
```

---

## Advanced Examples

### Create Complex View

**Ask**:
```
Create a view called student_stats that shows each student's total bookings, gems balance, and last class date
```

### Batch Data Update

**Ask**:
```
Generate a safe migration to update all profiles where timezone is null to 'Asia/Ho_Chi_Minh'
```

### Database Branching

**Ask**:
```
Create a database branch called 'test-new-indexes' to test performance improvements
```

---

## Next Steps

- Review `supabase-mcp-quick-ref.md` for a quick command reference
- Check `supabase-mcp-vs-cli.md` for guidance on when to use MCP vs CLI
- See `supabase-mcp-patterns.md` for workflow patterns

**Happy querying!** 🚀
