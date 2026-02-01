# MCP vs Supabase CLI: When to Use Each

**Last Updated**: 2026-01-31

## Quick Decision Matrix

| Task | Use MCP | Use Supabase CLI | Notes |
|------|---------|------------------|-------|
| Explore database schema | ✅ Excellent | ⚠️ Manual | MCP natural language is faster |
| Quick data queries | ✅ Excellent | ⚠️ Requires SQL | MCP translates natural language |
| Generate TypeScript types | ✅ One command | ✅ `supabase gen types` | Both work well |
| Create migrations | ✅ Natural language | ✅ More control | MCP for speed, CLI for precision |
| Apply migrations | ⚠️ Via manual approval | ✅ Designed for it | CLI better for production |
| Production operations | ❌ Not recommended | ✅ Excellent | **Always use CLI** |
| CI/CD pipelines | ❌ Not suitable | ✅ Excellent | CLI is scriptable |
| Team collaboration | ⚠️ Individual | ✅ Version controlled | CLI migrations are shared |
| Database branches | ✅ Easy | ✅ Full featured | Both good |
| Debugging queries | ✅ Excellent | ⚠️ Manual EXPLAIN | MCP can explain plans |
| Performance tuning | ✅ Good suggestions | ✅ Manual optimization | Combine both |

---

## When to Use Supabase MCP

### ✅ Best Use Cases

**1. Database Exploration**
```
Scenario: You need to understand the database schema quickly
MCP: "Show me all tables and their relationships"
Why: Natural language is faster than manually exploring schema
```

**2. Ad-Hoc Queries**
```
Scenario: Quick data investigation during development
MCP: "How many students registered this week?"
Why: No need to write SQL manually
```

**3. Learning the Schema**
```
Scenario: New developer joining the project
MCP: "Describe the bookings table and show related tables"
Why: Interactive exploration helps understanding
```

**4. Rapid Prototyping**
```
Scenario: Testing schema changes quickly
MCP: "Create a database branch and add an email_verified column to profiles"
Why: Fast iteration during feature development
```

**5. Type Generation After Schema Changes**
```
Scenario: You just applied a migration
MCP: "Generate updated TypeScript types for all tables"
Why: One command, instant results
```

**6. Debugging Data Issues**
```
Scenario: Investigating why bookings aren't showing up
MCP: "Find bookings where final_price doesn't match expected calculation"
Why: AI can help construct complex debugging queries
```

---

## When to Use Supabase CLI

### ✅ Best Use Cases

**1. Production Migrations**
```
Scenario: Applying schema changes to production
CLI: supabase db push --linked
Why: Controlled, auditable, scriptable
```

**2. CI/CD Integration**
```
Scenario: Automated testing and deployment
CLI: In GitHub Actions or other CI tools
Why: Programmatic, repeatable, version controlled
```

**3. Team Collaboration**
```
Scenario: Multiple developers working on same feature
CLI: Migrations in git repository
Why: Shared, reviewed, merged like code
```

**4. Complex Migrations**
```
Scenario: Multi-step schema changes with data transformations
CLI: Write migration SQL manually with full control
Why: Precision, testing, rollback planning
```

**5. Local Development Setup**
```
Scenario: New developer setting up local environment
CLI: supabase start, supabase db reset
Why: Consistent environment across team
```

**6. Backup and Restore**
```
Scenario: Database backup or disaster recovery
CLI: supabase db dump, supabase db restore
Why: Reliable, complete, documented process
```

---

## Recommended Workflows

### Development Workflow (Using Both)

**1. Exploration Phase (MCP)**
```
1. Ask MCP: "Show me all tables"
2. Ask MCP: "Describe the profiles table"
3. Ask MCP: "How are profiles related to bookings?"
```

**2. Planning Phase (MCP)**
```
1. Ask MCP: "What indexes exist on the bookings table?"
2. Ask MCP: "Suggest indexes for common query patterns"
3. Ask MCP: "Explain query plan for [slow query]"
```

**3. Implementation Phase (MCP + CLI)**
```
1. MCP: "Create a database branch called 'test-indexes'"
2. MCP: "Generate migration to add index on bookings(student_id, created_at)"
3. Review generated SQL carefully
4. CLI: Apply migration to branch for testing
5. CLI: Test query performance on branch
6. CLI: Merge to main if successful
```

**4. Production Phase (CLI Only)**
```
1. CLI: Create migration file (or use MCP-generated, reviewed)
2. CLI: Test locally with supabase db reset
3. CLI: Code review with team
4. CLI: Apply to staging with supabase db push
5. CLI: Verify, then apply to production
```

---

### Type Generation Workflow

**Option 1: MCP (Quick)**
```
1. MCP: "Generate TypeScript types for all tables"
2. Copy output to src/types/database.ts
3. Commit to git
```

**Option 2: CLI (Automated)**
```
1. CLI: supabase gen types typescript --project-id [ref] > src/types/database.ts
2. Add to npm scripts: "gen:types": "supabase gen types typescript --linked > src/types/database.ts"
3. Run after migrations: npm run gen:types
```

**Recommendation**: Use MCP for one-off type generation, CLI for CI/CD automation

---

### Migration Workflow

**Option 1: MCP-Assisted (Development)**
```
1. MCP: "Create migration to add bio text column to profiles"
2. Review generated SQL
3. Save to supabase/migrations/NNNN_add_bio_to_profiles.sql
4. Code review with team
5. CLI: Apply with supabase db push
```

**Option 2: CLI Manual (Production)**
```
1. CLI: supabase migration new add_bio_to_profiles
2. Edit migration file manually
3. Write precise SQL with full control
4. Test locally
5. Code review
6. Apply with supabase db push
```

**Recommendation**: MCP for rapid development, CLI for critical production changes

---

## Advantages and Disadvantages

### Supabase MCP

**Advantages**:
✅ Natural language - no SQL knowledge required
✅ Fast exploration and learning
✅ AI-assisted query construction
✅ Quick type generation
✅ Interactive debugging
✅ Suggests optimizations

**Disadvantages**:
❌ Individual tool, not team-shared
❌ Not suitable for production
❌ Requires manual approval overhead
❌ Generated SQL may need review
❌ Can't be scripted in CI/CD
❌ Requires OAuth authentication

### Supabase CLI

**Advantages**:
✅ Production-ready and stable
✅ Scriptable and automatable
✅ Version-controlled migrations
✅ Team collaboration built-in
✅ Precise control over SQL
✅ CI/CD integration
✅ Comprehensive tooling

**Disadvantages**:
❌ Requires SQL knowledge
❌ More verbose for simple tasks
❌ Manual schema exploration
❌ Steeper learning curve
❌ No AI assistance

---

## Migration Decision Flowchart

```
Need to change database schema?
│
├─> Rapid prototyping/exploration?
│   └─> Use MCP (review SQL before applying)
│
├─> Simple column addition in dev?
│   └─> Use MCP, then move to CLI for production
│
├─> Complex multi-step migration?
│   └─> Use CLI (manual SQL for precision)
│
├─> Applying to production?
│   └─> Use CLI (always)
│
└─> Part of CI/CD pipeline?
    └─> Use CLI (required)
```

---

## Query Decision Flowchart

```
Need to query database?
│
├─> Ad-hoc investigation during development?
│   └─> Use MCP (natural language)
│
├─> Debugging specific data issue?
│   └─> Use MCP (AI-assisted query construction)
│
├─> Need query for application code?
│   └─> Use MCP to prototype, then optimize manually
│
├─> Performance-critical query?
│   └─> Use CLI (manual optimization and EXPLAIN)
│
└─> Automated reporting/scripts?
    └─> Use CLI (programmatic)
```

---

## Best Practices

### Use MCP When:
- 🏃 Speed matters more than precision
- 🧑‍💻 Developer is learning the schema
- 🔍 Exploring data during debugging
- 💡 Prototyping features quickly
- 🤖 Want AI assistance with SQL

### Use CLI When:
- 🏭 Working with production databases
- 👥 Collaborating with team on migrations
- 🤖 Automating in CI/CD pipelines
- 🎯 Precision and control are critical
- 📜 Need version-controlled, reviewable changes

### Combine Both:
- 🚀 MCP for exploration + CLI for implementation
- 🧪 MCP for prototyping + CLI for production
- 📊 MCP for analysis + CLI for automation
- 🎓 MCP for learning + CLI for expertise

---

## Common Scenarios

### Scenario 1: Adding a New Feature

**Development Phase**:
1. MCP: Explore related tables and relationships
2. MCP: Generate initial migration draft
3. MCP: Create database branch for testing
4. MCP: Test with natural language queries

**Production Phase**:
1. CLI: Review and refine MCP-generated migration
2. CLI: Test locally with supabase db reset
3. CLI: Code review with team
4. CLI: Apply to staging, then production

### Scenario 2: Debugging Performance

**Investigation**:
1. MCP: "Explain query plan for [slow query]"
2. MCP: "Suggest indexes to improve performance"
3. MCP: Create branch to test index

**Implementation**:
1. CLI: Create migration for index (based on MCP suggestion)
2. CLI: Test performance on branch
3. CLI: If improved, apply to production

### Scenario 3: New Developer Onboarding

**Learning Phase**:
1. MCP: "Show all tables in the database"
2. MCP: "Describe each table and its relationships"
3. MCP: "Show example data from each table"
4. MCP: "Explain the booking flow from profiles → bookings → classes"

**Setup Phase**:
1. CLI: Clone repository
2. CLI: supabase start (local Supabase)
3. CLI: supabase db reset (apply migrations)
4. MCP: Verify setup by querying local database

---

## Security Considerations

**MCP**:
- ⚠️ Never use with production databases
- ✅ Always enable manual approval
- ✅ Review all generated SQL
- ✅ Individual developer responsibility

**CLI**:
- ✅ Suitable for all environments
- ✅ Migrations are code-reviewed
- ✅ Version controlled and auditable
- ✅ Team collaboration built-in

---

## Conclusion

**Neither tool replaces the other** - they complement each other:

- **MCP**: Best for rapid exploration, learning, and prototyping during development
- **CLI**: Essential for production operations, team collaboration, and CI/CD

**Recommended Approach**:
1. Use MCP to explore and prototype quickly
2. Use CLI to implement and deploy reliably
3. Combine both for optimal development workflow

**Golden Rule**:
> Use MCP to learn and iterate fast, CLI to ship safely and reliably.

---

**Questions?**

See also:
- `docs/supabase-mcp-setup.md` - MCP setup guide
- `docs/supabase-mcp-examples.md` - MCP usage examples
- Supabase CLI docs: https://supabase.com/docs/guides/cli

**Last Updated**: 2026-01-31
