# Gradual Cutover Runbook

**Purpose:** Safe rollout of v2 full_pass pipeline from 10% → 50% → 100% → deprecate v1

**Timeline:** 3-4 weeks minimum (24h at 10%, 48h at 50%, 7+ days at 100%, 7+ days deprecation)

**Key principle:** Each stage has explicit validation gates. If gates fail, ROLLBACK immediately.

---

## Prerequisites

Before starting Stage 1, verify ALL of these are true:

1. **Database migration deployed:**
   ```sql
   -- Run in Supabase SQL Editor:
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'user_profiles'
     AND column_name IN ('full_pass_status', 'full_pass_started_at', 'full_pass_completed_at', 'full_pass_error');
   ```
   Expected: 4 rows returned (all columns exist)

2. **RLM production service deployed:**
   ```bash
   curl https://soulprint-landing.onrender.com/health
   ```
   Expected: `{"status": "healthy", "processors_available": true}`

3. **V2_ROLLOUT_PERCENT configured in Vercel:**
   - Go to Vercel dashboard → soulprint-landing → Settings → Environment Variables
   - Add `V2_ROLLOUT_PERCENT=0` (Production)
   - Do NOT deploy yet (Stage 1 will deploy)

4. **Validation queries ready:**
   - Open `.planning/phases/05-gradual-cutover/validation-queries.sql`
   - Have Supabase SQL Editor open and ready to paste queries

5. **Deprecation headers verified locally:**
   ```bash
   cd /home/drewpullen/clawd/soulprint-rlm
   curl -X POST http://localhost:8000/process-full \
     -H "Content-Type: application/json" \
     -d '{"user_id": "test", "storage_path": "test.json"}'
   ```
   Expected: Response headers include `Deprecation: true`, `Sunset: Sat, 01 Mar 2026 00:00:00 GMT`

If ANY prerequisite fails, STOP and fix before proceeding.

---

## Stage 1: Deploy + Canary (10% for 24 hours)

**Goal:** Verify v2 pipeline works in production with minimal user impact

### 1.1 Deploy RLM service to production

```bash
cd /home/drewpullen/clawd/soulprint-rlm
git status  # Verify clean working tree
git log --oneline -5  # Verify deprecation headers commit present
git push origin main  # Deploy to Render
```

**Monitor Render deployment:**
- Go to Render dashboard → soulprint-landing service
- Wait for "Deploy succeeded" notification
- Check logs: `curl https://soulprint-landing.onrender.com/health`
- Expected: `{"status": "healthy", "processors_available": true}`

**If deployment fails:** Fix issues, do NOT proceed to Stage 1.2

### 1.2 Enable 10% v2 traffic

```bash
# In Vercel dashboard:
# Settings → Environment Variables → V2_ROLLOUT_PERCENT
# Change from 0 to 10
# Click "Save"
```

**Deploy Next.js frontend:**
```bash
cd /home/drewpullen/clawd/soulprint-landing
vercel --prod
# OR: git push origin main (if auto-deploy enabled)
```

**Verify routing is working:**
```bash
# Check Vercel logs for routing decisions:
vercel logs --follow | grep "Routing import request"
```
Expected: ~10% of log lines show "routed to v2", ~90% show "routed to v1"

### 1.3 Monitor validation queries

**Run these queries at 1 hour, 6 hours, and 24 hours after Stage 1.2:**

1. **Query 1 (Overall success rate)** — Paste into Supabase SQL Editor
   - Expected: `success_rate_pct >= 95%`, `stuck_imports = 0`
   - If fails: Proceed to Emergency Rollback section

2. **Query 6 (Recent imports timeline)** — Verify traffic is flowing
   - Expected: Steady hourly import counts, no sudden drops

3. **Query 3 (Performance histogram)** — Check duration distribution
   - Expected: Most imports < 10 minutes, <10% in >30min bucket

**At 24 hour mark:** Run all 6 queries. Save results for comparison with Stage 2.

### 1.4 Gate criteria for Stage 2

Proceed to Stage 2 ONLY if ALL of these are true for 24 consecutive hours:

- [ ] Query 1 success_rate_pct >= 95%
- [ ] Query 2 stuck_imports = 0 (or all stuck imports resolved within 2 hours)
- [ ] Query 4 shows no systemic errors (Anthropic API issues, RLM config errors)
- [ ] Zero user complaints about import failures
- [ ] Render logs show no memory leaks or crashes

If ANY criterion fails: Run Emergency Rollback, investigate, fix, restart Stage 1.

---

## Stage 2: Broader Validation (50% for 48 hours)

**Goal:** Confirm v2 pipeline scales to half of production traffic

### 2.1 Increase traffic to 50%

```bash
# In Vercel dashboard:
# Settings → Environment Variables → V2_ROLLOUT_PERCENT
# Change from 10 to 50
vercel --prod
```

### 2.2 Monitor validation queries

**Run these queries every 12 hours (48h total = 4 checkpoints):**

1. Query 1 (Overall success rate)
2. Query 2 (Stuck imports) — Run immediately if Query 1 shows stuck_imports > 0
3. Query 3 (Performance histogram) — Check if duration degraded vs Stage 1
4. Query 4 (Error patterns) — Run if success_rate_pct < 95%

**Compare with Stage 1 baseline:**
- Success rate should be >= Stage 1 success rate
- Duration histogram should be similar (no significant slowdown)
- Error patterns should not introduce new error types

### 2.3 Gate criteria for Stage 3

Proceed to Stage 3 ONLY if ALL of these are true for 48 consecutive hours:

- [ ] Query 1 success_rate_pct >= 95% (all 4 checkpoints)
- [ ] No degradation in performance vs Stage 1 (Query 3)
- [ ] No new error patterns vs Stage 1 (Query 4)
- [ ] Zero user complaints about import failures
- [ ] Render logs show stable resource usage (no upward trend in memory/CPU)

If ANY criterion fails: Rollback to 10% or 0%, investigate, fix, restart Stage 2.

---

## Stage 3: Full Cutover (100% for 7+ days)

**Goal:** Complete migration to v2, monitor for stability before deprecating v1

### 3.1 Route all traffic to v2

```bash
# In Vercel dashboard:
# Settings → Environment Variables → V2_ROLLOUT_PERCENT
# Change from 50 to 100
vercel --prod
```

### 3.2 Monitor validation queries

**Run these queries daily for 7+ days:**

1. Query 1 (Overall success rate) — DAILY
2. Query 2 (Stuck imports) — If Query 1 shows issues
3. Query 3 (Performance histogram) — Every 3 days
4. Query 4 (Error patterns) — If success_rate_pct drops below 95%

### 3.3 Verify zero v1 traffic

**After 24 hours at 100%, verify v1 endpoint receives zero calls:**

```bash
# Check Render logs for v1 deprecation warnings:
# (Render dashboard → Logs, search for "[DEPRECATED]")
```

Expected: Zero `[DEPRECATED] /process-full called` log lines in last 24 hours

If v1 traffic detected:
- Check V2_ROLLOUT_PERCENT is actually 100 in Vercel
- Check Vercel deployment succeeded (routing logic deployed)
- Investigate client code for hardcoded v1 endpoint calls

### 3.4 Gate criteria for Stage 4 (Deprecation)

Proceed to Stage 4 ONLY if ALL of these are true for 7 consecutive days:

- [ ] Query 1 success_rate_pct >= 95% (every day)
- [ ] Zero v1 traffic for 24+ hours
- [ ] Zero rollbacks during Stage 3
- [ ] No user complaints about import failures
- [ ] Render logs show stable resource usage for 7 days

If ANY criterion fails: Investigate immediately, extend Stage 3 monitoring.

**Do NOT deprecate v1 until 7 consecutive days at 100% with zero issues.**

---

## Stage 4: Deprecation (after 7+ days at 100%)

**Goal:** Remove v1 endpoint, finalize v2 as canonical pipeline

### 4.1 Confirm zero v1 traffic (final check)

```bash
# Check Render logs for last 7 days:
# Search for "[DEPRECATED]" — should be zero results
```

If v1 traffic detected: STOP, investigate, extend Stage 3.

### 4.2 Mark endpoint as deprecated in codebase

**Status:** Already done in Plan 05-02 (commit 667ddfc)

The following are already in place:
- `Deprecation: true` header on /process-full
- `Sunset: Sat, 01 Mar 2026 00:00:00 GMT` header
- Response body includes deprecation notice
- Logging: `[DEPRECATED] /process-full called by user {user_id}`

### 4.3 Wait 7 more days before removal

**Purpose:** Give any external integrations time to migrate

During this period:
- Monitor Render logs for unexpected v1 calls
- If v1 calls appear: Contact users, help them migrate to v2

### 4.4 Remove v1 endpoint (after 14+ days at 100%)

**When to execute:** After 7 days at Stage 3 + 7 days at Stage 4.1-4.3

```bash
cd /home/drewpullen/clawd/soulprint-rlm
```

**Edit `main.py`:**
1. Remove `@app.post("/process-full")` route handler
2. Rename `/process-full-v2` to `/process-full` (optional, keeps URLs clean)

**Commit and deploy:**
```bash
git add main.py
git commit -m "feat: remove deprecated /process-full endpoint"
git push origin main
```

**Verify removal:**
```bash
curl -X POST https://soulprint-landing.onrender.com/process-full
```
Expected: `404 Not Found`

### 4.5 Cleanup (optional)

After v1 removal is stable for 7+ days:

1. Remove `V2_ROLLOUT_PERCENT` from Vercel env vars (no longer needed)
2. Remove routing logic from `app/api/import/process/route.ts`
3. Update internal docs to reflect v2 is canonical

---

## Emergency Rollback

**When to rollback:**
- Success rate < 95% for v2 traffic
- More than 10 stuck imports in 1 hour
- User complaints about slow/failed imports
- Any data corruption detected
- Render service crashing or OOMing

### Rollback procedure

**1. Set V2_ROLLOUT_PERCENT to 0 (immediate):**

```bash
# In Vercel dashboard:
# Settings → Environment Variables → V2_ROLLOUT_PERCENT
# Change to 0
# Click "Save"
```

**2. Deploy routing change:**

```bash
cd /home/drewpullen/clawd/soulprint-landing
vercel --prod
```

**3. Verify rollback worked:**

```bash
# Check Vercel logs:
vercel logs --follow | grep "Routing import request"
```
Expected: 100% of log lines show "routed to v1", zero "routed to v2"

**4. Monitor in-flight v2 jobs:**

```bash
# Run Query 2 (Stuck imports) every 30 minutes:
# Paste into Supabase SQL Editor
```

Wait for all in-flight v2 jobs to complete or fail (typically < 30 minutes).

**5. Investigate root cause:**

- Check Render logs for errors: `Render dashboard → Logs`
- Run Query 4 (Error patterns) to identify systemic issues
- Check RLM service health: `curl https://soulprint-landing.onrender.com/health`

**6. Fix and restart:**

After fixing root cause:
- Restart from Stage 1 (10% for 24h)
- Do NOT skip stages
- Document what was fixed in Phase 5 SUMMARY.md

### Rollback decision criteria

| Symptom | Severity | Action | Timeframe |
|---------|----------|--------|-----------|
| Success rate < 95% | Critical | Immediate rollback | Now |
| >10 stuck imports/hour | Critical | Immediate rollback | Now |
| User complaints (import failures) | High | Rollback within 1 hour | Investigate first, then rollback |
| Performance degradation (>30min imports) | Medium | Extend monitoring | If persists >6h, rollback |
| Render OOM/crash | Critical | Immediate rollback | Now |
| Data corruption (wrong soulprint) | Critical | Immediate rollback + incident | Now |

**Rollback is NOT a failure.** It's a safety mechanism. The goal is production stability.

---

## Monitoring Tools Reference

### Validation queries

Location: `.planning/phases/05-gradual-cutover/validation-queries.sql`

Run in: Supabase SQL Editor

**Quick reference:**
- Query 1: Overall success rate (run after every stage change)
- Query 2: Stuck imports (run if Query 1 shows stuck_imports > 0)
- Query 3: Performance histogram (run daily)
- Query 4: Error patterns (run if success_rate_pct < 95%)
- Query 6: Recent timeline (run after stage change to verify traffic)

### Render logs

Access: Render dashboard → soulprint-landing service → Logs

**Key patterns to grep:**
- `[DEPRECATED]` — v1 endpoint usage (should be zero at 100%)
- `ERROR` — Any errors in pipeline execution
- `OOMKilled` — Memory exhaustion (immediate rollback)
- `processors_available: false` — Processor import failure

### Vercel logs

Access: `vercel logs --follow`

**Key patterns to grep:**
- `Routing import request` — Verify V2_ROLLOUT_PERCENT is working
- `routed to v2` — Count to verify percentage matches config
- `ERROR` — Frontend errors during import upload

---

## Contact Information

**If issues arise during cutover:**

1. Check this runbook's Emergency Rollback section
2. Run validation queries to diagnose
3. Check Render logs for RLM service errors
4. Rollback if criteria met (don't wait)

**Post-cutover:**
- Update `.planning/phases/05-gradual-cutover/05-03-SUMMARY.md` with actual timeline and any deviations
- Document lessons learned for future migrations
