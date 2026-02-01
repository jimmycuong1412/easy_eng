# Implementation Plan: Supabase MCP Integration

**Branch**: `001-english-learning-platform` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: User request: "integrate with supabase MCP"

**Note**: This plan implements Model Context Protocol (MCP) integration for AI-assisted Supabase database management.

## Summary

Integrate Supabase MCP (Model Context Protocol) to enable AI assistants (Claude Code, Cursor, Windsurf) to interact with the project's Supabase database through natural language. This is a **configuration-based integration** requiring zero code changes to the application. The primary implementation uses the hosted Supabase MCP server for immediate value, with documentation for future custom MCP server development (Phase 2, out of scope for initial implementation).

**Technical Approach**:
- Configure hosted Supabase MCP server endpoint in AI tool settings
- Establish OAuth 2.1 authentication with Supabase organization
- Scope access to development database only (never production)
- Enable manual approval for write operations
- Document setup, security policies, and usage patterns
- Provide team training and onboarding materials

## Technical Context

**Language/Version**: Configuration files (JSON), Documentation (Markdown)
**Primary Dependencies**:
- Supabase MCP Server (hosted at https://mcp.supabase.com)
- Existing Supabase project (PostgreSQL 15)
- AI tool with MCP support (Claude Code, Cursor, or Windsurf)
**Storage**: N/A (uses existing Supabase PostgreSQL database)
**Testing**: Manual verification of MCP connection, query execution, and tool usage
**Target Platform**: Development environment (macOS, Linux, Windows)
**Project Type**: Web application (existing Next.js frontend + Node.js backend)
**Performance Goals**:
- MCP query response < 2 seconds
- OAuth authentication flow < 30 seconds
- Type generation for full schema < 10 seconds
**Constraints**:
- Development/staging databases only (NEVER production)
- Manual approval required for write operations
- OAuth 2.1 authentication required
- Team members must have Supabase organization admin access
**Scale/Scope**:
- Single Supabase project integration
- 3-5 developers with MCP access
- ~15 database tables
- Documentation and configuration artifacts only (no application code changes)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards

**Status**: ✅ PASS (Not Applicable - Configuration Only)

**Analysis**: This integration involves no code changes. Configuration files (JSON) and documentation (Markdown) are created, which are not subject to code quality standards for executable code.

### II. Testing Discipline (NON-NEGOTIABLE)

**Status**: ✅ PASS (Modified Approach)

**Analysis**: Traditional TDD does not apply to configuration artifacts. Testing approach:
- **Integration testing**: Manual verification that MCP server connects successfully
- **Functional testing**: Verify each MCP tool (query_database, describe_table, execute_sql, etc.) works as expected
- **Security testing**: Confirm OAuth authentication flow, manual approval enforcement, and read-only mode
- **Documentation testing**: Ensure quickstart guide is accurate and reproducible

**Justification**: Configuration and documentation require validation testing rather than unit tests. The testing discipline is honored through systematic verification of all MCP capabilities.

### III. User Experience Consistency

**Status**: ✅ PASS (Role-Based Access Enhanced)

**Analysis**: MCP integration enhances developer UX without affecting end-user experience:
- **Developers** gain AI-assisted database exploration (better DX)
- **End users** see no change (zero application code modifications)
- **Role-specific dashboards** remain unchanged
- Documentation provides clear, consistent guidance for MCP usage

**No violations**: UX consistency maintained.

### IV. Performance Requirements

**Status**: ✅ PASS (No Impact on Application Performance)

**Analysis**: MCP integration has **zero impact** on application performance:
- MCP queries execute in developer's AI tool, not in production
- Application API response times unchanged
- Database query performance unchanged (same Supabase API)
- Page load times unaffected

**Performance constraints apply to MCP usage itself** (documented in quickstart):
- MCP query response < 2 seconds (acceptable for dev tools)
- OAuth flow < 30 seconds (one-time setup)

**No violations**: Application performance requirements fully met.

### V. Role-Based Access Control

**Status**: ✅ PASS (Security Enhanced via Project Scoping)

**Analysis**: MCP integration **enhances** security controls:
- MCP access limited to **development databases only**
- OAuth 2.1 authentication enforces Supabase organization RBAC
- Manual approval required for write operations (execute_sql, generate_migration)
- Project scoping prevents access to unauthorized databases
- Existing application RBAC unchanged (MCP operates outside application)

**Security Policies Established**:
1. Never connect to production databases
2. Require manual tool approval for all write operations
3. Grant MCP access only to trusted developers with admin role
4. Audit MCP-generated migrations through code review

**No violations**: RBAC principles exceeded.

### VI. Virtual Currency System Integrity

**Status**: ✅ PASS (No Changes to Currency Logic)

**Analysis**: MCP integration makes **zero changes** to virtual currency system:
- Gem transaction logic unchanged
- Atomic transaction guarantees preserved
- Audit logging unchanged
- Currency validation rules unchanged

**MCP Use Case**: Developers can use MCP to **query** gem transaction data for debugging (read-only), which aids in maintaining system integrity.

**No violations**: Currency system integrity maintained.

### VII. UI Design Excellence

**Status**: ✅ PASS (Not Applicable - No UI Changes)

**Analysis**: MCP integration is backend tooling that does not modify any user-facing UI. Student dashboards, teacher interfaces, and admin panels remain unchanged.

**Developer documentation** (quickstart guide) follows clear, accessible formatting consistent with project documentation standards.

**No violations**: UI design unaffected.

---

### Constitution Compliance Summary

**Overall Status**: ✅ **FULL COMPLIANCE** - All constitution principles satisfied

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Configuration only, no code |
| II. Testing | ✅ PASS | Integration & functional testing approach |
| III. UX Consistency | ✅ PASS | Developer UX enhanced, user UX unchanged |
| IV. Performance | ✅ PASS | Zero application performance impact |
| V. RBAC | ✅ PASS | Security enhanced via OAuth + scoping |
| VI. Currency Integrity | ✅ PASS | No changes to currency logic |
| VII. UI Design | ✅ PASS | No UI changes |

**Gate Status**: ✅ **CLEARED** - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/001-english-learning-platform/
├── plan.md                     # This file (implementation plan)
├── research.md                 # Phase 0 output (technology & approach research)
├── data-model.md               # Phase 1 output (data model analysis - unchanged)
├── quickstart.md               # Phase 1 output (MCP setup guide)
├── contracts/
│   └── mcp-tools.json          # Phase 1 output (MCP tool definitions)
└── tasks.md                    # Phase 2 output (will be created by /speckit.tasks)
```

### Configuration Files (repository root)

```text
# MCP Configuration (to be created during implementation)
.claude/
└── mcp-servers.json            # Claude Code MCP server configuration

# OR (depending on AI tool)
.cursor/
└── mcp-config.json             # Cursor MCP configuration

# OR
.windsurf/
└── mcp.json                    # Windsurf MCP configuration

# Documentation (to be created)
docs/
├── supabase-mcp-setup.md       # Detailed setup guide
├── supabase-mcp-security.md    # Security policies and guidelines
└── supabase-mcp-examples.md    # Usage examples and patterns

# .gitignore Updates
.gitignore                       # Add MCP config files with sensitive data
```

### Existing Application Structure (unchanged)

```text
# Frontend (Next.js + React)
frontend/
├── src/
│   ├── components/             # React components (unchanged)
│   ├── pages/                  # Next.js pages (unchanged)
│   ├── lib/
│   │   └── supabase/           # Supabase clients (unchanged)
│   │       ├── client.ts       # Browser client
│   │       └── server.ts       # Server-side client
│   └── types/
│       └── database.ts         # Database types (may be regenerated via MCP)
└── tests/                      # Frontend tests (unchanged)

# Backend (Node.js + Express)
backend/
├── src/
│   ├── lib/
│   │   ├── supabase.ts         # Admin client (unchanged)
│   │   └── db.ts               # Database utilities (unchanged)
│   ├── services/               # Business logic (unchanged)
│   └── api/                    # API routes (unchanged)
└── tests/                      # Backend tests (unchanged)

# Database
supabase/
├── migrations/                 # SQL migrations (may add MCP-generated migrations)
│   ├── 001_users.sql
│   ├── 002_profiles.sql
│   └── ... (existing migrations)
└── tests/                      # Database tests (unchanged)
```

**Structure Decision**: This is a **web application** (Next.js frontend + Node.js backend) with Supabase as the backend service. The MCP integration adds **configuration files and documentation** but makes **zero changes to application source code**. The existing Supabase client setup remains unchanged; MCP provides an additional developer tooling layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - No constitution violations identified.

All constitution principles are satisfied. This integration is straightforward configuration and documentation with zero code complexity.

---

## Phase 0: Research & Planning (COMPLETED)

**Status**: ✅ COMPLETE

**Deliverable**: [`research.md`](./research.md)

**Key Findings**:
1. **MCP Protocol**: Open standard for AI-tool integration with data sources
2. **Hosted Server Approach**: Supabase provides official hosted MCP server (zero dev effort)
3. **Security Model**: OAuth 2.1 + project scoping + manual approval for writes
4. **Integration Impact**: Configuration only, no application code changes required
5. **Future Path**: Custom MCP server documented for Phase 2 (out of current scope)

**Technology Decisions**:
- **Chosen**: Hosted Supabase MCP server at https://mcp.supabase.com
- **Authentication**: OAuth 2.1 via Supabase organization
- **Scope**: Development database only (never production)
- **AI Tools Supported**: Claude Code, Cursor, Windsurf
- **Security Controls**: Manual approval enabled, read-only mode optional

**Alternatives Considered**:
1. Custom MCP server (deferred to Phase 2 - too much effort for initial value)
2. Direct Supabase CLI only (rejected - no AI assistance benefit)
3. Third-party database AI tools (rejected - not MCP standard, vendor lock-in)

---

## Phase 1: Design & Contracts (COMPLETED)

**Status**: ✅ COMPLETE

**Deliverables**:
1. ✅ [`data-model.md`](./data-model.md) - Confirms no database schema changes
2. ✅ [`contracts/mcp-tools.json`](./contracts/mcp-tools.json) - MCP tool definitions and schemas
3. ✅ [`quickstart.md`](./quickstart.md) - Step-by-step MCP setup guide

### MCP Tools Defined

The following MCP tools are available via the hosted Supabase MCP server:

**Read Operations** (no approval required):
- `query_database` - Natural language to SQL translation
- `describe_table` - Get table schema and relationships
- `get_project_info` - Retrieve project configuration
- `view_logs` - Access database logs for debugging

**Write Operations** (manual approval required):
- `execute_sql` - Execute raw SQL queries
- `generate_migration` - Create migration files from natural language
- `create_database_branch` - Spin up isolated database branches

**Development Tools**:
- `generate_types` - Generate TypeScript/Zod types from schema

Full tool specifications documented in [`contracts/mcp-tools.json`](./contracts/mcp-tools.json).

### Data Model Analysis

**Conclusion**: No database schema changes required. MCP provides read/write access to existing schema.

**Existing Tables** (accessed via MCP):
- `auth.users` - Supabase Auth users
- `public.profiles` - User profiles with roles
- `public.classes` - Class schedules
- `public.bookings` - Class bookings with gem discounts
- `public.gem_transactions` - Virtual currency audit log
- `public.student_characters` - Career progression data
- `public.marketplace_items` - Cosmetic items
- `public.student_inventory` - Owned items

All Row Level Security (RLS) policies remain unchanged. MCP uses service role key (bypasses RLS) but is restricted to development databases only.

### Quick start Guide

[`quickstart.md`](./quickstart.md) provides:
- 10-15 minute setup walkthrough
- Configuration examples for Claude Code, Cursor, Windsurf
- OAuth authentication flow
- Example queries and use cases
- Troubleshooting guide
- Security best practices

---

## Phase 2: Implementation Tasks

**Status**: ⏳ PENDING (to be generated by `/speckit.tasks` command)

**Scope**: Configuration, documentation, and team onboarding

**Estimated Tasks**:
1. Create MCP configuration files
2. Write comprehensive documentation
3. Set up development Supabase project (if needed)
4. Configure OAuth access for team members
5. Create security policy documents
6. Test MCP integration with all AI tools
7. Train development team on MCP usage
8. Document common workflows and examples

**Not in Scope** (Phase 2 - Future):
- Custom MCP server development
- Application code changes
- Production database access
- Mobile app integration

---

## Risk Mitigation

### Security Risks

**Risk**: Accidental production database connection
- **Severity**: HIGH
- **Mitigation**: Hard-coded policy - only dev project refs allowed, documented in all guides
- **Detection**: Manual verification during setup, team training emphasis

**Risk**: Over-permissioned SQL execution
- **Severity**: MEDIUM
- **Mitigation**: Manual approval enabled for all write operations
- **Detection**: AI tool prompts for approval before executing

**Risk**: OAuth token compromise
- **Severity**: LOW
- **Mitigation**: Regular token rotation, Supabase org access auditing
- **Detection**: Supabase dashboard audit logs

### Operational Risks

**Risk**: Team confusion about when to use MCP vs. traditional tools
- **Severity**: LOW
- **Mitigation**: Clear usage guidelines in documentation, training session
- **Detection**: Code review process for migrations

**Risk**: MCP-generated migrations applied without review
- **Severity**: MEDIUM
- **Mitigation**: Code review required for all schema changes (existing practice)
- **Detection**: Git commit hooks, PR review process

### Technical Risks

**Risk**: Hosted MCP server downtime
- **Severity**: LOW (not critical path)
- **Mitigation**: Traditional Supabase CLI remains functional, fallback workflows documented
- **Detection**: AI tool error messages

**Risk**: Incompatibility with future Supabase API changes
- **Severity**: LOW
- **Mitigation**: Supabase maintains MCP server, updates automatically
- **Detection**: MCP server version monitoring

---

## Success Metrics

### Setup Success (Week 1)
- [ ] All developers can authenticate to Supabase MCP
- [ ] MCP configuration documented and version controlled
- [ ] At least one successful natural language query per developer
- [ ] Security policies acknowledged by all team members

### Adoption Success (Month 1)
- [ ] 5+ migrations generated via MCP and successfully applied
- [ ] TypeScript types regenerated via MCP at least once
- [ ] Zero production database connection incidents
- [ ] Positive developer feedback on productivity

### Long-Term Success (Quarter 1)
- [ ] 50%+ of database exploration done via MCP (vs. manual SQL)
- [ ] 25%+ reduction in time spent writing migrations
- [ ] 100% of migrations code-reviewed (unchanged requirement)
- [ ] Team considers MCP essential development tool

---

## Future Enhancements (Out of Scope)

### Phase 2: Custom MCP Server

**Potential Business Logic Tools**:
- `book_class_with_gems(student_id, class_id, gems_to_use)` - Execute full booking flow
- `award_character_xp(student_id, xp_amount, reason)` - Character progression with validation
- `generate_analytics_report(report_type, date_range)` - Pre-built analytics queries
- `create_class_schedule(teacher_id, schedule_params)` - Validate and create class schedule

**Benefits**:
- AI can execute complex business operations
- Business rule validation built into MCP tools
- Exposes domain model to AI for better context

**Complexity**: 2-4 weeks development + ongoing maintenance

**Decision**: Deferred until hosted MCP server value demonstrated

---

## Appendix: Related Documentation

**Internal Docs** (to be created during implementation):
- `docs/supabase-mcp-setup.md` - Detailed setup guide
- `docs/supabase-mcp-security.md` - Security policies
- `docs/supabase-mcp-examples.md` - Common workflows and patterns

**External Resources**:
- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase MCP Server GitHub](https://github.com/supabase-community/supabase-mcp)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

**Project Context**:
- [Feature Specification](./spec.md) - Main English Learning Platform spec
- [Project Constitution](../../.specify/memory/constitution.md) - Quality principles
- [Architecture Overview](./ARCHITECTURE.md) - System design

---

**Plan Completed**: 2026-01-31
**Ready for Implementation**: ✅ YES (pending `/speckit.tasks` generation)
