# Data Model: Supabase MCP Integration

**Feature**: Supabase MCP Integration
**Date**: 2026-01-31
**Branch**: `001-english-learning-platform`

## Overview

This feature is **configuration and documentation-focused** rather than data model changes. The Supabase MCP integration does not introduce new database entities or modify existing schema. Instead, it provides AI-assisted access to the existing data model.

## Existing Data Model (No Changes Required)

The integration works with the **existing database schema** defined in `supabase/migrations/`:

### Core Entities (Unchanged)

**Users** (`auth.users`)
- Managed by Supabase Auth
- Fields: id, email, encrypted_password, email_confirmed_at, etc.

**Profiles** (`public.profiles`)
- Links to auth.users
- Fields: id, role (student/teacher/admin), display_name, avatar_url, timezone, created_at, updated_at
- Relationships: One-to-one with auth.users

**Classes** (`public.classes`)
- Fields: id, teacher_id, title, description, scheduled_at, duration_minutes, capacity, price, status
- Relationships: Many-to-one with Profiles (teacher)

**Bookings** (`public.bookings`)
- Fields: id, student_id, class_id, gems_used, discount_amount, final_price, status, created_at
- Relationships: Many-to-one with Profiles (student), Many-to-one with Classes

**Gem Transactions** (`public.gem_transactions`)
- Fields: id, student_id, amount, transaction_type, reason, related_booking_id, created_at
- Relationships: Many-to-one with Profiles (student)

**Student Characters** (`public.student_characters`)
- Fields: id, student_id, career_path, total_xp, gold_balance, current_level, daily_streak, weekly_streak
- Relationships: One-to-one with Profiles (student)

**Marketplace Items** (`public.marketplace_items`)
- Fields: id, name, category, price_gold, career_compatibility, sprite_url

**Student Inventory** (`public.student_inventory`)
- Fields: id, student_id, item_id, purchased_at, is_equipped
- Relationships: Many-to-one with Student Characters, Many-to-one with Marketplace Items

## MCP Configuration Entities (New)

While the database schema remains unchanged, the following configuration artifacts are introduced:

### MCP Server Configuration

**File**: `.claude/mcp-servers.json` (or IDE-specific config)

**Structure**:
```json
{
  "mcpServers": {
    "supabase-dev": {
      "url": "https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>",
      "transport": "sse",
      "oauth": {
        "enabled": true,
        "provider": "supabase"
      }
    }
  }
}
```

**Fields**:
- `url`: Supabase MCP server endpoint with project reference
- `transport`: Communication protocol (SSE - Server-Sent Events)
- `oauth`: Authentication configuration

### MCP Access Control (Conceptual)

**Entity**: Team Member Access
- **team_member_id**: Developer's Supabase org user ID
- **project_access**: Array of project refs they can access via MCP
- **permissions**: read_only | read_write
- **granted_at**: Timestamp of access grant
- **granted_by**: Admin who granted access

Note: This is managed in Supabase organization settings, not in application database.

## Data Flow Diagrams

### Current Architecture (Without MCP)

```
┌─────────────────┐
│  Developer      │
│  (VS Code)      │
└────────┬────────┘
         │
         │ Supabase SDK
         ▼
┌─────────────────┐
│  Supabase API   │
│  (REST/GraphQL) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
│  (Production)   │
└─────────────────┘
```

### With MCP Integration (Recommended)

```
┌─────────────────┐
│  Developer      │
│  (Claude Code)  │
└────────┬────────┘
         │
         │ MCP Protocol
         ▼
┌─────────────────┐
│ Supabase MCP    │
│ Server (Hosted) │
└────────┬────────┘
         │
         │ OAuth 2.1
         ▼
┌─────────────────┐
│  Supabase API   │
│  (Development)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
│  (Dev Project)  │
└─────────────────┘
```

### Future: Custom MCP Server (Phase 2)

```
┌─────────────────┐
│  Developer      │
│  (Claude Code)  │
└────────┬────────┘
         │
         │ MCP Protocol
         ▼
┌─────────────────┐
│  Custom MCP     │
│  Server         │
│  (Node.js)      │
└────────┬────────┘
         │
         │ Internal API
         ▼
┌─────────────────┐
│  Backend        │
│  Services       │
└────────┬────────┘
         │
         │ Supabase SDK
         ▼
┌─────────────────┐
│  Supabase API   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
└─────────────────┘
```

## Entity Relationships (Unchanged)

```
auth.users (1) ──────── (1) public.profiles
                               │
                               ├── role: student ──── (1) student_characters
                               │                            │
                               │                            ├── (N) progression_transactions
                               │                            └── (N) student_inventory
                               │                                      │
                               │                                      └── (N) marketplace_items
                               │
                               ├── role: student ──── (N) bookings ──── (1) classes
                               │                      │
                               │                      └── related to ─── (N) gem_transactions
                               │
                               └── role: teacher ──── (N) classes
```

This diagram remains valid with or without MCP integration.

## Validation Rules (Unchanged)

The MCP integration respects all existing validation rules:

**Profiles**:
- `role` MUST be one of: 'student', 'teacher', 'admin'
- `timezone` MUST be valid IANA timezone string

**Classes**:
- `capacity` MUST be > 0
- `price` MUST be >= $5.00 USD (minimum booking price)
- `scheduled_at` MUST be in the future

**Bookings**:
- `gems_used` MUST be <= student's gem balance
- `discount_amount` MUST be <= 50% of class price
- `final_price` = class.price - discount_amount

**Gem Transactions**:
- Student's gem balance MUST NOT go negative
- `amount` MUST be > 0

**Student Characters**:
- `current_level` = floor(total_xp / 500) + 1
- `career_path` MUST be one of: 'doctor', 'engineer', 'warrior', 'business', 'artist', 'scientist'

## State Transitions (Unchanged)

**Booking States**: pending → confirmed → attended | cancelled
**Class States**: scheduled → live → completed | cancelled

MCP integration does not alter these state machines but can help query and visualize state transitions.

## Indexes and Performance (Unchanged)

Existing indexes continue to serve application and MCP queries:
- `idx_profiles_role` on profiles(role)
- `idx_classes_teacher_id` on classes(teacher_id)
- `idx_bookings_student_id` on bookings(student_id)
- `idx_bookings_class_id` on bookings(class_id)
- `idx_gem_transactions_student_id` on gem_transactions(student_id)

MCP server uses same Supabase API, benefiting from these indexes.

## Security Model (Row Level Security)

**Existing RLS Policies** (in `supabase/migrations/003_rls_policies.sql`):

**Profiles**:
- Users can read their own profile
- Users can update their own profile
- Admins can read all profiles

**Classes**:
- Everyone can read published classes
- Teachers can create/update own classes
- Admins can manage all classes

**Bookings**:
- Students can read own bookings
- Teachers can read bookings for their classes
- Students can create bookings (with validation)

**Gem Transactions**:
- Students can read own transactions
- System can create transactions (via service role)

**MCP Access Considerations**:
- MCP uses service role key (bypasses RLS)
- Security relies on OAuth + project scoping
- Manual tool approval required
- Development database only (isolated from production)

## Migration Strategy

**No database migrations required** for MCP integration.

**Configuration migrations**:
1. Create `.claude/mcp-servers.json` with Supabase MCP server config
2. Document in `docs/supabase-mcp-setup.md`
3. Update `.gitignore` to exclude sensitive MCP configs
4. Create template config files with placeholder values

**Team migration**:
1. Train developers on MCP usage
2. Establish security policies
3. Set up development Supabase projects
4. Grant OAuth access to team members

## Future Considerations (Phase 2: Custom MCP Server)

If implementing a custom MCP server, consider exposing:

**Virtual Entities** (not stored, computed on-demand):
- `StudentProgress`: Aggregated XP, level, achievements
- `TeacherSchedule`: Combined view of classes and bookings
- `PlatformAnalytics`: Aggregated metrics and KPIs

**Computed Fields**:
- `available_gems`: Current gem balance
- `next_level_xp`: XP needed for next level
- `class_availability`: Calculated seats remaining

**Transactional Operations**:
- `book_class_with_gems`: Atomic booking + gem deduction
- `award_xp_and_gold`: Atomic character progression update
- `process_refund`: Atomic money + gems return

These would be exposed as MCP tools rather than database tables.

## Summary

The Supabase MCP integration is a **non-invasive enhancement** that:
- ✅ Requires ZERO database schema changes
- ✅ Preserves all existing validation rules
- ✅ Respects Row Level Security policies (via proper configuration)
- ✅ Adds AI-assisted database exploration capabilities
- ✅ Documents path for future custom MCP server

The existing data model remains the single source of truth, with MCP providing an additional access layer for development workflows.
