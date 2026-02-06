---
phase: 04-security-hardening
plan: 03
subsystem: database-security
status: complete
completed: 2026-02-06

requires:
  - "Supabase database with public schema tables"

provides:
  - artifact: "RLS audit script (scripts/rls-audit.sql)"
    purpose: "Reusable SQL query to check RLS status of all tables"
  - artifact: "RLS remediation script (scripts/rls-remediate.sql)"
    purpose: "Idempotent SQL to enable RLS and create policies"
  - capability: "Database-level user data protection"

affects:
  - "04-04: Rate limiting API routes (complements RLS with request-level protection)"

tech-stack:
  added: []
  patterns:
    - "Row Level Security (RLS) for multi-tenant data isolation"
    - "auth.uid() for cryptographically verified user identification"
    - "Idempotent SQL via IF NOT EXISTS checks"

key-files:
  created:
    - scripts/rls-audit.sql
    - scripts/rls-remediate.sql
  modified: []

decisions:
  - id: "rls-001"
    what: "Use auth.uid() instead of auth.jwt()->>'user_metadata' for RLS policies"
    why: "auth.uid() is cryptographically verified by Supabase Auth; user_metadata can be spoofed by clients"
    impact: "Secure user identification in all RLS policies"

  - id: "rls-002"
    what: "Make remediation script idempotent via IF NOT EXISTS checks"
    why: "Allows safe re-runs without duplicate policy errors during deployment or updates"
    impact: "Can run script multiple times without errors"

  - id: "rls-003"
    what: "Document that service role key bypasses RLS"
    why: "Prevents confusion when API routes continue working after RLS enablement"
    impact: "Clear understanding of server-side vs client-side security boundaries"

metrics:
  duration: "1m 4s"
  tasks_completed: 2
  files_created: 2
  commits: 2

tags:
  - security
  - database
  - rls
  - supabase
  - sql
  - postgresql
---

# Phase 04 Plan 03: RLS Audit & Remediation Scripts Summary

**One-liner:** Created reusable SQL scripts to audit RLS status and enable database-level user data protection across all tables.

## What Was Done

Created two SQL scripts for securing Supabase tables with Row Level Security (RLS):

1. **RLS Audit Script** (`scripts/rls-audit.sql`)
   - Queries PostgreSQL system catalogs (pg_tables, pg_policies) to check RLS status
   - Identifies tables with RLS disabled (security risk)
   - Lists all existing policies with their expressions
   - Detects tables with RLS enabled but no policies (lockout risk)
   - Safe read-only queries, can be run anytime

2. **RLS Remediation Script** (`scripts/rls-remediate.sql`)
   - Enables RLS on all user-data tables: user_profiles, conversation_chunks, chat_messages
   - Creates policies for SELECT, INSERT, UPDATE, DELETE per table
   - Uses `auth.uid() = user_id` for secure user identification
   - Idempotent via IF NOT EXISTS checks (safe to run multiple times)
   - Includes documentation about service role key bypass

## Why This Matters

**Critical security context:** In January 2025, over 170 Lovable-built applications were breached because they had Supabase tables without RLS enabled. Tables created via SQL (not the Supabase dashboard) have RLS disabled by default, exposing all user data to unauthorized access.

**Protection provided:**
- Database-level enforcement prevents users from accessing others' data
- Defense in depth: even if application code has bugs, database blocks unauthorized queries
- Cryptographic verification via auth.uid() prevents spoofing attacks
- Service role operations unaffected (server-side API routes continue working)

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create RLS audit SQL script | e2241d9 | scripts/rls-audit.sql |
| 2 | Create RLS remediation SQL script | 704ffad | scripts/rls-remediate.sql |

## Decisions Made

**1. Use auth.uid() for RLS policies**
- **Decision:** Use `auth.uid() = user_id` instead of `auth.jwt()->>'user_metadata'`
- **Rationale:** auth.uid() is cryptographically verified by Supabase Auth; user_metadata can be spoofed by malicious clients
- **Impact:** All RLS policies use secure, tamper-proof user identification

**2. Idempotent remediation script**
- **Decision:** Wrap all CREATE POLICY statements in IF NOT EXISTS checks
- **Rationale:** Allows script to be run multiple times during deployments or updates without errors
- **Impact:** Safe to execute script repeatedly, simplifies deployment automation

**3. Document service role bypass**
- **Decision:** Include explicit notes about service role key bypassing RLS
- **Rationale:** Prevents confusion when existing API routes (using SUPABASE_SERVICE_ROLE_KEY) continue working after RLS enablement
- **Impact:** Clear understanding that RLS protects client requests but server-side operations remain unrestricted

## Technical Details

### RLS Policy Pattern

All policies follow this secure pattern:

```sql
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);
```

**Key elements:**
- `auth.uid()` - Cryptographically verified user ID from JWT
- `user_id` column - Foreign key to auth.users table
- `USING` clause - Filters rows user can see
- `WITH CHECK` clause (on INSERT/UPDATE) - Validates new/modified rows

### Tables Protected

1. **user_profiles** - User settings, soulprint data, import status
   - Policies: SELECT, INSERT, UPDATE (no DELETE - preserve data)

2. **conversation_chunks** - Searchable memory chunks
   - Policies: SELECT, INSERT, DELETE (users can clear their memory)

3. **chat_messages** - Chat history
   - Policies: SELECT, INSERT (no UPDATE/DELETE - preserve audit trail)

### Service Role Behavior

The `SUPABASE_SERVICE_ROLE_KEY` used in API routes bypasses ALL RLS policies. This is intentional:
- Server-side code is trusted (runs on Vercel, not in browser)
- Allows administrative operations (cleanup, migrations)
- RLS protects client-side queries (Supabase anon key, user JWTs)

## Next Phase Readiness

**Ready for next plan:** Yes

**What's needed:**
1. Run `scripts/rls-audit.sql` in Supabase SQL Editor to verify current RLS status
2. Run `scripts/rls-remediate.sql` in Supabase SQL Editor to enable RLS and create policies
3. Re-run audit script to confirm all tables show "OK - RLS Enabled"

**Blockers:** None

**Concerns:**
- If tables have different column names for user identification, policies may need adjustment
- Existing client-side Supabase queries (if any) will now be filtered by RLS
- Performance impact negligible (user_id columns should already be indexed)

**Recommendations for next plan:**
- After enabling RLS, test the import flow and chat flow on production
- Verify that client-side operations (if any) still work correctly
- Consider adding RLS audit to CI/CD pipeline to catch future tables without RLS

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Created:**
- `scripts/rls-audit.sql` - PostgreSQL queries to audit RLS status and policies
- `scripts/rls-remediate.sql` - Idempotent SQL to enable RLS and create policies

**Modified:**
- None

---

**Execution time:** 1m 4s
**Completed:** 2026-02-06

## Self-Check: PASSED

All files and commits verified.
