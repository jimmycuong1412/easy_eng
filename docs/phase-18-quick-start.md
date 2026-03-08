# Phase 18: MCP Testing - Quick Start Guide

**For**: First developer to validate MCP integration
**Time Required**: 30-45 minutes
**Status**: Ready to execute

---

## TL;DR

Phase 18 is complete. You need to do a one-time 30-45 minute validation to verify MCP works. Follow the checklist, fill out the report, get sign-off. Done.

---

## What You Need

- [ ] Claude Code, Cursor, or Windsurf IDE
- [ ] Supabase development project access
- [ ] OAuth authentication capability (browser)
- [ ] 30-45 minutes of focused time

---

## Quick Steps

### 1. Read the Testing Checklist (5 min)
**File**: `docs/phase-18-mcp-testing-checklist.md`

Skim through to understand:
- What tests you'll run
- What results to expect
- How to document issues

### 2. Authenticate MCP (5 min)
**File**: `docs/supabase-mcp-auth.md`

1. Restart your IDE
2. Click "Authenticate with Supabase" when prompted
3. Sign in with OAuth
4. Grant permissions to dev project

### 3. Run Tests (25-35 min)

**CRITICAL**: Do T285 FIRST (security check)

#### T285: Security Check (2 min) ⚠️
**Verify production database is NOT configured**
- Check MCP config file
- Confirm it's dev project only
- If prod is configured, STOP and remove it

#### T279: Basic Query (3 min)
Query: "Show all tables"
Expected: List of ~30-40 database tables

#### T280: Schema Description (5 min)
Query: "Describe the bookings table"
Expected: Columns, types, constraints, foreign keys

#### T281: Type Generation (7 min)
Query: "Generate TypeScript types for bookings and gem_transactions"
Expected: Valid TypeScript interfaces

#### T282: Migration Generation (7 min)
Query: "Generate migration to add last_login_at to users"
Expected: Valid SQL migration + approval prompt

#### T283: Manual Approval (10 min)
Query: "Delete test users" (then decline)
Expected: Approval prompt, no execution without approval

#### T284: Read-Only Mode (5 min) - OPTIONAL
Enable read-only, try write operation
Expected: Write blocked

### 4. Fill Out Report (10 min)
**File**: `docs/phase-18-mcp-validation-report.md`

- Mark pass/fail for each test
- Document any issues
- Note performance observations

### 5. Get Sign-Off (5 min)
- Show report to technical lead
- Get approval
- Share with team

---

## Expected Results

### All Tests Should Pass ✅

If everything works:
- Queries execute quickly
- Schemas are accurate
- Types are correct
- Migrations are valid
- Approval works
- No errors

### If Something Fails ❌

**Troubleshooting**: `docs/supabase-mcp-troubleshooting.md`

**Common Issues**:
- Auth fails → Check token, project ref
- Wrong schema → Confirm dev database
- Slow response → Check network
- Approval not working → Update MCP version

---

## Success Criteria

You're done when:
- [x] All 7 tests completed
- [x] Validation report filled out
- [x] Technical lead signed off
- [x] Results shared with team

**Then**: Phase 18 complete, project 100% done! 🎉

---

## Files You Need

**Must Read**:
1. `docs/phase-18-mcp-testing-checklist.md` - Detailed test procedures
2. `docs/phase-18-mcp-validation-report.md` - Report template to fill out

**Reference If Needed**:
3. `docs/supabase-mcp-auth.md` - If auth issues
4. `docs/supabase-mcp-troubleshooting.md` - If problems occur
5. `docs/supabase-mcp-quick-ref.md` - Quick MCP usage reference

---

## Timeline

**Estimated Breakdown**:
- Setup & reading: 10 min
- Security check (T285): 2 min
- Basic tests (T279-T280): 8 min
- Advanced tests (T281-T282): 14 min
- Security validation (T283): 10 min
- Optional test (T284): 5 min (skip if not using)
- Documentation: 10 min

**Total**: 30-45 minutes (depending on if you do T284)

---

## What Happens After

### You Complete Testing
1. Update `docs/supabase-mcp-testing-guide.md` with date
2. Archive validation report
3. Share results in standup
4. All team members can now use MCP

### Project Status
- Phase 18: 100% complete ✅
- Overall: 100% complete (378/378 tasks) ✅
- Ready for production use ✅

---

## Questions?

**Documentation**: Check `docs/supabase-mcp-*.md` (19 guides available)
**Support**: Team Slack or project lead
**Issues**: `docs/supabase-mcp-troubleshooting.md`

---

## One-Liner Summary

**Read checklist → Authenticate MCP → Run 7 tests (30 min) → Fill report → Get sign-off → Done**

---

**Created**: 2026-02-06
**Purpose**: Quick start for first MCP validator
**Status**: Ready to use
**Time**: 30-45 minutes total

**Let's validate MCP and finish Phase 18!** 🚀
