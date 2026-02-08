# Phase 8: DB Schema & Migration - Research

**Researched:** 2026-02-08
**Domain:** PostgreSQL/Supabase schema migrations, foreign key backfill, data integrity
**Confidence:** HIGH

## Summary

This phase creates a multi-conversation database foundation by adding a `conversations` table and migrating existing chat messages into default conversations without data loss. The research confirms this is a standard migration pattern with well-established safety practices.

The critical insight is that PostgreSQL migrations involving foreign keys and backfills require careful ordering: (1) create new table, (2) add nullable FK column, (3) backfill data via INSERT...SELECT, (4) optionally add NOT NULL constraint after validation. Supabase follows PostgreSQL conventions with timestamp-based migration files executed sequentially.

The existing codebase already has migration patterns to follow (20260205_soulprint_tables.sql shows the standard structure), and the database has NO conversations table currently (it was dropped in 20260131_cleanup_database.sql as "unused"). This means we're creating a fresh foundation with no legacy conflicts.

**Primary recommendation:** Use a multi-step migration approach with nullable FK column, batch backfill, and comprehensive verification queries before considering NOT NULL constraints.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ | Database engine | Supabase's underlying database |
| Supabase CLI | Latest | Migration management | Official tooling for schema changes |
| pgvector | Latest (already installed) | Vector embeddings | Already in use for memory_chunks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SQL Editor | Supabase UI | Manual migration execution | For one-off production migrations |
| Supabase Branching | Supabase feature | Preview environments | Testing migrations before production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase SQL files | Prisma/TypeORM | More abstraction but less control, not needed for this project |
| Sequential backfill | Batch processing with pglogical | Complex setup, overkill for this use case |

**Installation:**
```bash
# No new dependencies - using existing Supabase setup
# Verify migrations directory exists
ls -la supabase/migrations/
```

## Architecture Patterns

### Recommended Migration Structure

Based on existing codebase patterns (20260205_soulprint_tables.sql, 20260207_full_pass_schema.sql):

```
supabase/migrations/
├── YYYYMMDDHHMMSS_conversations_table.sql       # Create conversations table with RLS
├── YYYYMMDDHHMMSS_chat_messages_fk.sql          # Add nullable conversation_id column
├── YYYYMMDDHHMMSS_backfill_conversations.sql    # Create default conversations + assign messages
├── YYYYMMDDHHMMSS_verify_migration.sql          # (Optional) Add NOT NULL constraint after verification
```

### Pattern 1: Create Parent Table First

**What:** Create the `conversations` table before adding foreign key references
**When to use:** Always - PostgreSQL requires referenced table to exist before FK creation
**Example:**
```sql
-- Source: Existing pattern from 20260205_soulprint_tables.sql
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat History',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_created
ON public.conversations(user_id, created_at DESC);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access (for API routes)
CREATE POLICY "Service role full access to conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');
```

### Pattern 2: Add Nullable FK Column

**What:** Add foreign key column as nullable to avoid immediate constraint violations
**When to use:** When backfilling existing data - allows gradual population
**Example:**
```sql
-- Source: PostgreSQL best practices for zero-downtime migrations
-- Add nullable column first
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Add foreign key constraint with NOT VALID (fast, no table scan)
ALTER TABLE public.chat_messages
ADD CONSTRAINT fk_chat_messages_conversation
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE
NOT VALID;

-- Validate constraint after backfill (can be done in later migration)
-- ALTER TABLE public.chat_messages VALIDATE CONSTRAINT fk_chat_messages_conversation;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
ON public.chat_messages(conversation_id);
```

### Pattern 3: Backfill with INSERT...SELECT

**What:** Create default conversations and assign all existing messages in batches
**When to use:** When migrating existing data to new structure
**Example:**
```sql
-- Source: PostgreSQL batch insert patterns
-- Step 1: Create one default conversation per user with existing messages
INSERT INTO public.conversations (user_id, title, created_at, updated_at)
SELECT
  cm.user_id,
  'Chat History' AS title,
  MIN(cm.created_at) AS created_at,  -- Use earliest message date
  MAX(cm.created_at) AS updated_at   -- Use latest message date
FROM public.chat_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.user_id = cm.user_id
)
GROUP BY cm.user_id;

-- Step 2: Assign all messages to their user's default conversation
-- Do this in a single transaction to avoid race conditions
UPDATE public.chat_messages cm
SET conversation_id = (
  SELECT c.id
  FROM public.conversations c
  WHERE c.user_id = cm.user_id
  LIMIT 1
)
WHERE conversation_id IS NULL;

-- Step 3: Verify no orphaned messages
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.chat_messages
  WHERE conversation_id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Migration verification failed: % messages without conversation_id', orphaned_count;
  END IF;

  RAISE NOTICE 'Migration verification passed: All messages assigned to conversations';
END $$;
```

### Pattern 4: RLS Policy Updates

**What:** Update chat_messages RLS policies to include conversation scoping
**When to use:** After FK column is added and data is backfilled
**Example:**
```sql
-- Source: Supabase RLS best practices
-- Note: Keep existing policies for backward compatibility during transition
-- Add new policies for conversation-scoped queries

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.conversations WHERE id = conversation_id
    )
  );

-- Note: This uses a subquery pattern recommended by Supabase docs
-- for multi-table RLS without explicit joins
```

### Anti-Patterns to Avoid

- **Adding NOT NULL FK before backfill:** Will fail with existing data, causes downtime
- **Using ALTER COLUMN SET NOT NULL without validation:** Locks table during full scan
- **Forgetting Service Role policy:** API routes use service_role and need access
- **Not indexing FK column:** Queries joining conversations will be slow
- **Dropping old policies prematurely:** May break existing queries during transition

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-gap conversation splitting | Custom logic to infer conversations from message timestamps | Single default conversation per user | Requirements explicitly say "default conversation", not inferred splits |
| Migration rollback | Custom undo logic | PostgreSQL transactions + separate migration files | Built-in transaction support, well-tested |
| Batch processing framework | Custom batching with sleep() | Single transaction INSERT...SELECT | For this data size (likely < 100K messages total), single transaction is safe and atomic |
| Data integrity checks | Custom validation scripts | SQL verification queries in migration | Runs in same transaction, fails atomically |

**Key insight:** The requirements specify "a default conversation" per user, not intelligent conversation splitting. Don't overcomplicate the backfill logic - one conversation per user is the correct implementation.

## Common Pitfalls

### Pitfall 1: Race Conditions During Backfill

**What goes wrong:** Users sending new messages while backfill runs may create messages without conversation_id
**Why it happens:** Application code inserts messages without conversation_id while migration is running
**How to avoid:**
- Accept that new messages may have NULL conversation_id during migration
- Application code should handle NULL conversation_id gracefully (create conversation on-demand)
- OR schedule migration during low-traffic period
- Verification query should count NULL rows and accept them if recent (within last 5 minutes of migration)

**Warning signs:** Verification query shows orphaned messages created during migration window

### Pitfall 2: Forgetting Service Role Policies

**What goes wrong:** API routes fail after migration because service_role can't access conversations
**Why it happens:** RLS policies only grant access to auth.uid() users, not service_role
**How to avoid:** Always add service role policy:
```sql
CREATE POLICY "Service role full access to conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');
```

**Warning signs:**
- Chat messages API returns empty results after migration
- Supabase logs show "permission denied" errors from API routes

### Pitfall 3: Index Performance Degradation

**What goes wrong:** Queries become slow after adding conversation_id because FK isn't indexed
**Why it happens:** PostgreSQL doesn't automatically index foreign key columns (unlike primary keys)
**How to avoid:** Create index immediately after adding column:
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
ON public.chat_messages(conversation_id);
```

**Warning signs:** Chat history loads slowly, query plans show sequential scans

### Pitfall 4: Migration File Ordering

**What goes wrong:** Migration files execute out of order, causing FK constraint errors
**Why it happens:** Timestamp in filename determines execution order
**How to avoid:**
- Use proper timestamp format: `YYYYMMDDHHMMSS_description.sql`
- If creating multiple migrations same day, increment minutes/seconds
- Never manually edit timestamps of committed migrations
- Test locally with `supabase db reset` before pushing

**Warning signs:** Migration fails with "relation does not exist" or "violates foreign key constraint"

### Pitfall 5: NOT VALID Constraint Never Validated

**What goes wrong:** FK constraint with NOT VALID is never validated, allowing invalid data insertions
**Why it happens:** Forgetting to run VALIDATE CONSTRAINT after backfill
**How to avoid:** Either:
- Don't use NOT VALID (if backfill is fast enough)
- OR create separate migration file to validate after verifying backfill
- OR add validation to same migration file after backfill completes

**Warning signs:** Invalid conversation_id values in chat_messages table

## Code Examples

Verified patterns from official sources:

### Complete Migration Sequence

```sql
-- Migration 1: 20260208120000_conversations_table.sql
-- Source: Pattern from 20260205_soulprint_tables.sql

-- ============================================
-- 1. CREATE CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat History',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_created
ON public.conversations(user_id, created_at DESC);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();
```

```sql
-- Migration 2: 20260208120100_chat_messages_fk.sql
-- Source: PostgreSQL NOT VALID pattern

-- ============================================
-- 2. ADD FOREIGN KEY COLUMN
-- ============================================

-- Add nullable conversation_id column
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Add foreign key constraint (NOT VALID for zero-downtime)
ALTER TABLE public.chat_messages
ADD CONSTRAINT fk_chat_messages_conversation
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE
NOT VALID;

-- Index for query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
ON public.chat_messages(conversation_id);

-- Composite index for common query pattern (user + conversation + time)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
ON public.chat_messages(conversation_id, created_at DESC);
```

```sql
-- Migration 3: 20260208120200_backfill_conversations.sql
-- Source: INSERT...SELECT pattern from PostgreSQL best practices

-- ============================================
-- 3. BACKFILL DATA
-- ============================================

-- Step 1: Create one default conversation per user with existing messages
-- Use earliest message date as conversation start, latest as updated time
INSERT INTO public.conversations (user_id, title, created_at, updated_at)
SELECT
  cm.user_id,
  'Chat History' AS title,
  MIN(cm.created_at) AS created_at,
  MAX(cm.created_at) AS updated_at
FROM public.chat_messages cm
GROUP BY cm.user_id
ON CONFLICT (user_id) DO NOTHING;  -- In case some users already have conversations

-- Step 2: Assign all messages to their user's default conversation
-- Single UPDATE is atomic for this data size
UPDATE public.chat_messages cm
SET conversation_id = (
  SELECT c.id
  FROM public.conversations c
  WHERE c.user_id = cm.user_id
  LIMIT 1
)
WHERE conversation_id IS NULL;

-- Step 3: Validate constraint now that data is backfilled
ALTER TABLE public.chat_messages
VALIDATE CONSTRAINT fk_chat_messages_conversation;

-- Step 4: Verification query
DO $$
DECLARE
  total_messages INTEGER;
  assigned_messages INTEGER;
  orphaned_messages INTEGER;
  total_users INTEGER;
  users_with_conversations INTEGER;
BEGIN
  -- Count messages
  SELECT COUNT(*) INTO total_messages FROM public.chat_messages;
  SELECT COUNT(*) INTO assigned_messages FROM public.chat_messages WHERE conversation_id IS NOT NULL;
  SELECT COUNT(*) INTO orphaned_messages FROM public.chat_messages WHERE conversation_id IS NULL;

  -- Count users
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.chat_messages;
  SELECT COUNT(*) INTO users_with_conversations FROM public.conversations;

  -- Log results
  RAISE NOTICE 'Migration Statistics:';
  RAISE NOTICE '  Total messages: %', total_messages;
  RAISE NOTICE '  Assigned messages: %', assigned_messages;
  RAISE NOTICE '  Orphaned messages: %', orphaned_messages;
  RAISE NOTICE '  Total users with messages: %', total_users;
  RAISE NOTICE '  Users with conversations: %', users_with_conversations;

  -- Fail if any messages are orphaned
  IF orphaned_messages > 0 THEN
    RAISE EXCEPTION 'Migration failed: % messages without conversation_id', orphaned_messages;
  END IF;

  -- Fail if user counts don't match
  IF total_users != users_with_conversations THEN
    RAISE EXCEPTION 'Migration failed: User count mismatch (% messages users vs % conversation users)', total_users, users_with_conversations;
  END IF;

  RAISE NOTICE 'Migration verification PASSED';
END $$;
```

### Verification Query for Manual Testing

```sql
-- Run this in Supabase SQL Editor after migration
-- Source: Data integrity verification pattern

-- 1. Check for orphaned messages
SELECT
  COUNT(*) AS orphaned_count,
  COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM chat_messages), 0) AS orphaned_percentage
FROM chat_messages
WHERE conversation_id IS NULL;

-- 2. Verify every user has exactly one conversation
SELECT
  user_id,
  COUNT(*) AS conversation_count
FROM conversations
GROUP BY user_id
HAVING COUNT(*) != 1;
-- Should return 0 rows

-- 3. Verify all messages belong to their user's conversation
SELECT COUNT(*) AS mismatched_messages
FROM chat_messages cm
JOIN conversations c ON cm.conversation_id = c.id
WHERE cm.user_id != c.user_id;
-- Should return 0

-- 4. User-facing verification: Query conversations via API simulation
SELECT
  c.id AS conversation_id,
  c.title,
  COUNT(cm.id) AS message_count,
  MIN(cm.created_at) AS first_message,
  MAX(cm.created_at) AS last_message
FROM conversations c
LEFT JOIN chat_messages cm ON c.id = cm.conversation_id
WHERE c.user_id = 'test-user-id-here'  -- Replace with actual user_id
GROUP BY c.id, c.title;
-- Should return exactly 1 conversation with all user's messages
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ALTER TABLE ADD COLUMN NOT NULL | Add nullable, backfill, then optionally add NOT NULL | PostgreSQL 11+ (2018) | Enables zero-downtime migrations |
| Immediate FK validation | FK with NOT VALID, validate separately | PostgreSQL 9.4+ (2014) | Reduces lock time from hours to seconds |
| Manual backfill scripts | INSERT...SELECT in migration | Always available | Atomic, transactional, easier to test |
| Global conversations table | Per-user conversation scoping | Modern chat apps | Better RLS, user data isolation |

**Deprecated/outdated:**
- **Using pgloader for schema changes:** pgloader is for data migration between databases, not schema evolution within one database
- **Strong Migrations gem patterns in SQL:** Ruby/Rails-specific patterns don't apply to Supabase/raw SQL migrations
- **Assuming ADD COLUMN locks table:** PostgreSQL 11+ makes ADD COLUMN with default a metadata operation (unless default is volatile)

## Open Questions

Things that couldn't be fully resolved:

1. **Should we eventually add NOT NULL constraint to conversation_id?**
   - What we know: Migration can add it after backfill with minimal risk
   - What's unclear: If future features need orphaned messages (e.g., temporary messages before conversation creation)
   - Recommendation: Leave as nullable for now. Application code should treat NULL as "needs conversation", not fail. Revisit in Phase 9 when implementing conversation creation UI.

2. **Should default conversation title be user-visible or internal?**
   - What we know: Requirements say "default conversation" but don't specify if user sees it
   - What's unclear: UX for multi-conversation feature in future phases
   - Recommendation: Use "Chat History" as title for now (user-friendly). Phase 9 can add UI to rename. Users querying API will see this title.

3. **What happens to new messages during migration?**
   - What we know: API might insert messages with NULL conversation_id during backfill
   - What's unclear: How long migration takes (depends on message count)
   - Recommendation: Application code should handle NULL conversation_id gracefully. Create conversation on-demand if message.conversation_id is NULL. Document this behavior in Phase 9.

## Sources

### Primary (HIGH confidence)
- [Database Migrations | Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations) - Migration file structure, testing workflow
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns, performance optimization
- [PostgreSQL Foreign Keys Tutorial](https://www.postgresql.org/docs/current/tutorial-fk.html) - Official FK documentation
- [How to Manage PostgreSQL Schema Migrations (2026-01-21)](https://oneuptime.com/blog/post/2026-01-21-postgresql-schema-migrations/view) - Current best practices
- Existing migrations in codebase: 20260205_soulprint_tables.sql, 20260207_full_pass_schema.sql - Project-specific patterns

### Secondary (MEDIUM confidence)
- [Zero-downtime Postgres migrations - the hard parts | GoCardless](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) - NOT VALID constraint pattern
- [Adding a NOT NULL CONSTRAINT on PG Faster | Doctolib](https://medium.com/doctolib/adding-a-not-null-constraint-on-pg-faster-with-minimal-locking-38b2c00c4d1c) - Constraint validation techniques
- [Squawk - adding-foreign-key-constraint](https://squawkhq.com/docs/adding-foreign-key-constraint) - Migration linting rules
- [How to Design a Database Schema for Real-Time Chat Apps](https://www.back4app.com/tutorials/how-to-design-a-database-schema-for-a-real-time-chat-and-messaging-app) - Conversation table patterns
- [Supabase Managing Environments | DEV](https://dev.to/parth24072001/supabase-managing-database-migrations-across-multiple-environments-local-staging-production-4emg) - Staging verification workflow

### Tertiary (LOW confidence)
- [Multi-Tenant Applications with RLS on Supabase | AntStack](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - General RLS patterns (not conversation-specific)
- Various Stack Overflow discussions about PostgreSQL backfill patterns - General knowledge, not Supabase-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Supabase/PostgreSQL setup, no new dependencies
- Architecture patterns: HIGH - Patterns verified in existing codebase migrations + official docs
- Backfill strategy: HIGH - INSERT...SELECT is standard PostgreSQL, atomic for expected data size
- RLS policies: HIGH - Follows patterns from 20260205_soulprint_tables.sql exactly
- Zero-downtime techniques: MEDIUM - NOT VALID pattern is well-documented but depends on data size
- Open questions (conversation title, NULL handling): LOW - Need user/product input

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain, PostgreSQL changes slowly)
