# Research: Supabase MCP Integration

**Feature**: Integrate with Supabase MCP
**Date**: 2026-01-31
**Branch**: `001-english-learning-platform`

## Executive Summary

Integrating with Supabase MCP (Model Context Protocol) enables AI assistants (like Claude Code, Cursor, Windsurf) to directly interact with the Supabase database through natural language commands. This integration provides AI-assisted database management, querying, and schema development capabilities without modifying the application codebase itself.

## Decision: Integration Approach

**Chosen**: **Hybrid Approach** - Use hosted Supabase MCP server for development + Document custom MCP server pattern for future application-specific tools

**Rationale**:
- Hosted server provides immediate value with zero code changes
- Development teams get instant AI-assisted database management
- Custom server pattern documented for future business logic exposure
- Maintains security by keeping production databases isolated

**Alternatives Considered**:

1. **Hosted MCP Server Only**
   - ✅ Zero development effort
   - ✅ Immediate availability
   - ❌ Generic database operations only
   - ❌ No application-specific business logic

2. **Custom MCP Server Only**
   - ✅ Tailored to application needs
   - ✅ Exposes specific business logic
   - ❌ Significant development effort
   - ❌ Maintenance burden
   - ❌ Delays immediate value

3. **Hybrid Approach** (SELECTED)
   - ✅ Immediate value from hosted server
   - ✅ Documented path for future customization
   - ✅ Balanced effort vs. benefit
   - ❌ Requires understanding both approaches

## Technology Stack Research

### MCP (Model Context Protocol)

**What it is**: An open protocol standardizing how AI assistants communicate with external data sources and tools.

**Key Components**:
- **MCP Server**: Exposes tools and resources via standardized protocol
- **MCP Client**: AI assistant that consumes MCP servers (e.g., Claude Code)
- **Transport Layer**: Communication channel (HTTP/SSE for hosted servers)

**Protocol Features**:
- Tool/function definitions with JSON schemas
- Resource exposure (database tables, files, etc.)
- Real-time updates via Server-Sent Events
- OAuth 2.1 authentication for hosted servers

### Supabase MCP Server

**Repository**: https://github.com/supabase-community/supabase-mcp
**Hosted Service**: https://mcp.supabase.com/

**Capabilities**:
1. **Database Operations**
   - Query tables with natural language (converted to SQL)
   - View table schemas and relationships
   - Execute raw SQL commands
   - Generate TypeScript types from schema

2. **Schema Management**
   - Create/modify tables and columns
   - Apply migrations
   - Manage database branches

3. **Storage Operations**
   - Configure and manage storage buckets
   - File upload/download operations

4. **Development Tools**
   - Retrieve project credentials and URLs
   - View logs and debug information
   - Manage Edge Functions

**Authentication**: OAuth 2.1 with dynamic client registration (no manual token creation needed)

**Security Features**:
- Project scoping (limit to specific Supabase projects)
- Read-only mode option
- Manual tool approval in AI clients
- Database branching support for safe testing

## Current Codebase Integration Points

### Existing Supabase Usage

**Backend** (`backend/src/lib/supabase.ts`):
```typescript
// Admin client with service role key
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

**Frontend** (`frontend/src/lib/supabase/client.ts`):
```typescript
// Browser client with SSR support
import { createBrowserClient } from '@supabase/ssr'
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

**Database Schema**: Migrations in `supabase/migrations/`
- 001_users.sql
- 002_profiles.sql
- 003_rls_policies.sql
- 004_classes.sql
- 005_bookings.sql
- 006_gem_transactions.sql
- etc.

**Key Entities**: Users, Profiles, Classes, Bookings, GemTransactions, StudentCharacters, MarketplaceItems

### Integration Points for MCP

**For Hosted MCP Server**:
- Project Reference ID (from Supabase dashboard)
- Organization OAuth credentials
- Optional: specific project scoping

**For Custom MCP Server** (Future):
- Wrap existing backend services (`backend/src/services/`)
- Expose business logic as MCP tools
- Use existing Supabase clients as foundation

## Best Practices Research

### Security Best Practices

**From Supabase MCP Documentation**:
1. ⚠️ NEVER connect to production databases
2. Use development/staging projects only
3. Enable read-only mode when possible
4. Keep manual tool approval enabled
5. Use database branching for schema changes
6. Scope server to specific projects

**Additional Recommendations**:
- Create dedicated "MCP Development" Supabase project
- Clone production schema to dev project
- Use synthetic test data (not real user data)
- Set up database branching workflow
- Document which AI team members have MCP access

### Development Workflow Best Practices

**Recommended Workflow**:
1. Developer works in local environment
2. Uses MCP to query/explore dev database
3. AI assistant helps write migrations
4. Test migrations on database branch
5. Apply migrations to dev project
6. Review and apply to staging/production manually

**Integration with Existing Tools**:
- Continue using Supabase CLI for migrations
- Use MCP for exploration and rapid prototyping
- Keep production deployments manual/CI-based
- Document all MCP-generated schema changes

### Performance Considerations

**MCP Server Performance**:
- Hosted server handles rate limiting
- Natural language queries cached
- Database connections pooled
- SSE keeps connection alive for real-time updates

**Impact on Application**:
- Zero impact (MCP doesn't change application code)
- Database queries go through same Supabase API
- No additional latency for end users

## Implementation Recommendations

### Phase 1: Hosted MCP Server Setup (IMMEDIATE VALUE)

**What to Build**: Configuration documentation and team onboarding

**Steps**:
1. Identify Supabase project reference ID
2. Create MCP configuration guide
3. Document OAuth setup process
4. Establish security guidelines
5. Train development team

**Deliverables**:
- `docs/supabase-mcp-setup.md` - Setup guide
- `docs/supabase-mcp-security.md` - Security policies
- `.claude/mcp-servers.json` - Example MCP configuration
- Team training session

**Time Estimate**: 1-2 days (documentation + training)

### Phase 2: Custom MCP Server Pattern (FUTURE ENHANCEMENT)

**What to Build**: Custom MCP server exposing application-specific business logic

**Potential Tools to Expose**:
- `book_class_with_gems(student_id, class_id, gems_to_use)`
- `award_character_xp(student_id, xp_amount, reason)`
- `create_class_schedule(teacher_id, schedule_params)`
- `generate_analytics_report(report_type, date_range)`

**Architecture**:
```
MCP Server (Node.js/TypeScript)
├── MCP Protocol Handler
├── Tool Definitions
├── Backend Service Wrappers
│   ├── BookingService
│   ├── GemService
│   ├── CharacterService
│   └── AnalyticsService
└── Supabase Client (existing)
```

**Complexity**: Medium-High (2-4 weeks development)

**Benefits**:
- AI can execute complex business operations
- Validates business rules automatically
- Exposes application domain model
- Enables AI-assisted testing and debugging

**Risks**:
- Maintenance overhead
- Security surface expansion
- Requires careful permission design

## Monitoring and Metrics

**For Hosted MCP Server**:
- Track which team members use MCP
- Monitor database query patterns
- Review MCP-generated migrations
- Audit schema changes

**For Custom MCP Server** (Future):
- Request/response logging
- Tool execution metrics
- Error rates and types
- Authentication audit trail

## Documentation Requirements

### User-Facing Documentation

1. **Setup Guide** (`docs/supabase-mcp-setup.md`)
   - How to configure MCP in Claude Code/Cursor/Windsurf
   - Authentication walkthrough
   - Project scoping instructions
   - Troubleshooting common issues

2. **Security Policy** (`docs/supabase-mcp-security.md`)
   - Approved use cases
   - Prohibited operations
   - Access control guidelines
   - Incident response procedures

3. **Usage Examples** (`docs/supabase-mcp-examples.md`)
   - Common queries and commands
   - Schema exploration workflows
   - Migration generation examples
   - Type generation workflows

### Developer Documentation

1. **Architecture Decision Record** (ADR)
   - Why MCP integration chosen
   - Trade-offs evaluated
   - Future customization path

2. **Custom MCP Server Design** (if Phase 2)
   - Tool definitions and schemas
   - Service integration patterns
   - Testing strategies
   - Deployment process

## Dependencies and Prerequisites

### External Dependencies
- Supabase project (existing)
- Supabase organization account with OAuth support
- AI assistant with MCP support (Claude Code, Cursor, Windsurf)

### Internal Prerequisites
- Existing Supabase schema and migrations
- Development/staging Supabase project
- Team members with Supabase organization access

### Optional Enhancements
- Database branching setup in Supabase
- CI/CD integration for migration review
- Custom MCP server infrastructure (Phase 2)

## Risk Assessment

**Security Risks**:
- ⚠️ HIGH: Accidental production database connection
  - Mitigation: Enforce development-only policy, use project scoping
- ⚠️ MEDIUM: Over-permissioned AI queries
  - Mitigation: Enable manual tool approval, use read-only mode
- ⚠️ LOW: OAuth token compromise
  - Mitigation: Regular token rotation, audit logging

**Operational Risks**:
- ⚠️ LOW: Team confusion about when to use MCP vs. traditional tools
  - Mitigation: Clear usage guidelines, training
- ⚠️ LOW: MCP-generated migrations not reviewed
  - Mitigation: Mandatory code review for all schema changes

**Technical Risks**:
- ⚠️ LOW: Hosted MCP server downtime
  - Mitigation: Not critical path, traditional tools still work
- ⚠️ MEDIUM: Custom MCP server maintenance (Phase 2)
  - Mitigation: Thorough planning, cost-benefit analysis

## Success Criteria

**Phase 1 (Hosted MCP Server)**:
- ✅ All developers can authenticate to Supabase MCP
- ✅ Documentation covers setup and security policies
- ✅ Team demonstrates successful schema exploration via MCP
- ✅ At least one migration generated via MCP and successfully applied
- ✅ Zero production database incidents

**Phase 2 (Custom MCP Server)** (Future):
- ✅ Custom server exposes 5+ application-specific tools
- ✅ Authentication and authorization working
- ✅ Comprehensive test coverage
- ✅ Deployed to staging environment
- ✅ Developer adoption and positive feedback

## References

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase MCP Server GitHub](https://github.com/supabase-community/supabase-mcp)
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Supabase MCP Features](https://supabase.com/features/mcp-server)
- [Self-Hosting MCP Access](https://supabase.com/docs/guides/self-hosting/enable-mcp)
