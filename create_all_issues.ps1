# PowerShell script to create all GitHub issues from tasks.md

$tasks = @(
    @{
        number = "002"
        title = "Configure Supabase Project"
        priority = "P0"
        estimate = "3h"
        assignee = "Backend Dev"
        phase = "0"
        sprint = "1"
        body = @"
**Priority**: P0 | **Estimate**: 3h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Set up Supabase project with PostgreSQL database and initial configuration.

**Acceptance Criteria**:
- [ ] Supabase project created at supabase.com
- [ ] Local development with ``supabase init`` and ``supabase start``
- [ ] Environment variables documented
- [ ] Database connection verified
- [ ] Supabase CLI installed and linked

**Commands**:
``````bash
npm install -g supabase
supabase init
supabase start
supabase link --project-ref <project-id>
``````

**Files to Create**:
``````
supabase/
├── config.toml
├── .gitignore
└── migrations/
    └── .gitkeep
``````

---
_From: specs/001-english-learning-platform/tasks.md_
"@
    },
    @{
        number = "003"
        title = "Create Database Schema - Users & Auth"
        priority = "P0"
        estimate = "6h"
        assignee = "Backend Dev"
        phase = "0"
        sprint = "1"
        body = @"
**Priority**: P0 | **Estimate**: 6h | **Assignee**: Backend Dev | **Phase**: 0 | **Sprint**: 1

**Description**: Design and implement user authentication schema with RBAC.

**Acceptance Criteria**:
- [ ] ``users`` table with profile fields
- [ ] ``user_roles`` enum (student, teacher, admin)
- [ ] Row Level Security (RLS) policies
- [ ] Timezone field (default: Asia/Ho_Chi_Minh)
- [ ] Profile completion tracking
- [ ] Referral code generation

**Migration File**: ``001_users.sql``

**Tests**:
- [ ] User signup creates profile
- [ ] RLS prevents cross-user access
- [ ] Referral code is unique

---
_From: specs/001-english-learning-platform/tasks.md_
"@
    }
)

foreach ($task in $tasks) {
    Write-Host "Creating issue TASK-$($task.number): $($task.title)..."
    $escapedBody = $task.body -replace '"', '\"' -replace '`', '``'
    gh issue create --repo jimmycuong1412/easy_eng --title "TASK-$($task.number): $($task.title)" --body $task.body
    Start-Sleep -Seconds 1
}

Write-Host "Done creating issues!"
