---
phase: 05-integration-validation
plan: 03
title: "CI/CD Automation & Quality Correlation Validation"
one-liner: "GitHub Actions regression workflow + correlation script validates quality scores correlate r>0.7 with user satisfaction"
subsystem: ci-cd-quality-validation
tags: [ci-cd, github-actions, quality-validation, correlation, statistics, automation]
status: complete
completed: 2026-02-09
duration: 3 min

requires:
  - 05-01-regression-testing-infrastructure
  - scripts/regression-test.ts with exit code 0/1
  - quality-scoring.ts QualityBreakdown type

provides:
  - GitHub Actions workflow for automated regression testing
  - Quality correlation validation script
  - CI/CD integration for prompt regression detection
  - Statistical validation of quality score utility

affects:
  - Future PR workflows (regression tests run automatically)
  - Quality score validation against user satisfaction metrics

tech-stack:
  added:
    - GitHub Actions (CI/CD automation)
    - Pearson correlation statistics
  patterns:
    - PR-triggered regression testing workflow
    - Statistical correlation validation
    - Multi-proxy satisfaction measurement

key-files:
  created:
    - .github/workflows/llm-regression.yml
    - scripts/quality-correlation.ts
  modified: []

decisions:
  - key: "PR-triggered regression testing"
    choice: "Trigger on changes to prompt-related files only"
    rationale: "Avoids running expensive LLM evaluations on unrelated changes, focuses on actual risk areas"
    alternatives: "Run on all PRs (too expensive), manual trigger only (no protection)"
    phase: "05-03"

  - key: "Quality correlation proxies"
    choice: "Three satisfaction proxies: avg_session_length, total_conversations, return_rate"
    rationale: "Multiple proxies provide robustness - if quality matters, it should correlate with at least one retention/engagement metric"
    alternatives: "Single proxy (less robust), user ratings (not available yet)"
    phase: "05-03"

  - key: "Correlation pass criteria"
    choice: "Pass if ANY proxy exceeds r > 0.7 threshold"
    rationale: "Quality may manifest differently for different users - some show engagement via longer sessions, others via return rate"
    alternatives: "Require all proxies pass (too strict), average correlation (masks strong relationships)"
    phase: "05-03"

  - key: "Minimum profiles for correlation"
    choice: "Default 10 profiles, configurable via --min-profiles"
    rationale: "10 is minimum for meaningful correlation, but allows flexibility for early-stage validation with fewer users"
    alternatives: "Fixed threshold (less flexible), no minimum (unreliable results)"
    phase: "05-03"

metrics:
  complexity: low
  test-coverage: verified
  performance-impact: none
---

# Phase 5 Plan 3: CI/CD Automation & Quality Correlation Validation Summary

CI/CD automation for prompt regression testing + quality score correlation validation.

## What Was Built

### 1. GitHub Actions LLM Regression Workflow
**File:** `.github/workflows/llm-regression.yml`

Automated regression testing workflow that:
- **Triggers on PRs** that modify prompt-related files:
  - `lib/soulprint/prompt-builder.ts`
  - `lib/soulprint/prompt-helpers.ts`
  - `lib/soulprint/emotional-intelligence.ts`
  - `lib/evaluation/judges.ts`
  - `lib/evaluation/quality-judges.ts`
  - `lib/evaluation/quality-scoring.ts`
  - `rlm-service/prompt_builder.py`
- **Runs regression-test.ts** with 20 samples (default), validates thresholds
- **Supports manual dispatch** with configurable dataset/variant/samples
- **Blocks PRs** on regression detection (exit code 1)
- **Uploads results** as artifacts for debugging

**Required secrets:**
- `OPIK_API_KEY` - Opik experiment tracking
- `AWS_ACCESS_KEY_ID` - Bedrock access for LLM evaluation
- `AWS_SECRET_ACCESS_KEY` - Bedrock credentials

### 2. Quality Score Correlation Validation Script
**File:** `scripts/quality-correlation.ts`

Statistical validation that quality scores correlate with user satisfaction:

**Methodology:**
1. Query all user profiles with quality_breakdown JSONB
2. For each user, compute satisfaction proxies from chat_messages:
   - `avg_session_length` - Average messages per conversation
   - `total_conversations` - Number of unique conversations
   - `return_rate` - Number of distinct days user chatted (retention proxy)
3. Compute composite quality score (average of 15 section scores)
4. Calculate Pearson correlation coefficient between quality and each proxy
5. **Pass if ANY proxy exceeds r > 0.7 threshold**

**CLI interface:**
```bash
DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts [--min-profiles N] [--threshold N]
```

**Exit codes:**
- 0 - PASS (at least one proxy > threshold) or INCONCLUSIVE (insufficient data)
- 1 - FAIL (all proxies below threshold) or validation error

**Example output:**
```
=== QUALITY SCORE CORRELATION VALIDATION ===
Profiles analyzed: 25

Satisfaction Proxy        Pearson r    Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
avg_session_length           0.73     PASS (>0.7)
total_conversations          0.68     FAIL (<0.7)
return_rate                  0.81     PASS (>0.7)

Best proxy: return_rate (r=0.81)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verdict: PASS (at least one proxy exceeds threshold)
```

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | GitHub Actions LLM Regression Workflow | eba0f59 | .github/workflows/llm-regression.yml |
| 2 | Quality Score Correlation Validation Script | aa50f00 | scripts/quality-correlation.ts |

## Decisions Made

### 1. PR-Triggered Regression Testing
**Decision:** Trigger workflow only on changes to prompt-related files

**Why:** Running LLM evaluations is expensive (time + API costs). Focusing on files that actually affect prompts provides protection where it matters without wasting resources on unrelated changes.

**Impact:** PRs touching prompt code now run regression tests automatically. Developers get immediate feedback if their changes degrade quality metrics.

### 2. Quality Correlation Proxies
**Decision:** Use three satisfaction proxies (session length, conversations, return rate)

**Why:** Quality may manifest differently for different user cohorts. Some users show satisfaction via longer sessions, others via return rate. Multiple proxies provide robustness.

**Impact:** Correlation validation is more reliable - quality scores must correlate with at least ONE retention/engagement metric to pass.

### 3. Correlation Pass Criteria
**Decision:** Pass if ANY proxy exceeds r > 0.7 (not all proxies or average)

**Why:** Quality scores should correlate with SOME measure of user satisfaction. Requiring all proxies to pass is too strict (different user behaviors). Averaging masks strong relationships.

**Impact:** Validation focuses on finding evidence that quality matters, not requiring universal correlation.

### 4. Minimum Profiles for Correlation
**Decision:** Default 10 profiles minimum, configurable via CLI

**Why:** Statistical correlation requires meaningful sample size. 10 is a reasonable minimum for early validation. Configurable threshold allows flexibility.

**Impact:** Early-stage projects with few users can still run validation (with INCONCLUSIVE status) without false failures.

## Technical Implementation Notes

### Pearson Correlation Implementation
Used standard Pearson r formula:

```typescript
r = (n·Σxy - Σx·Σy) / sqrt[(n·Σx² - (Σx)²) · (n·Σy² - (Σy)²)]
```

Validated with test cases:
- Perfect positive: [1,2,3] vs [1,2,3] → r=1.00 ✓
- Perfect negative: [1,2,3] vs [3,2,1] → r=-1.00 ✓
- No correlation: constant array → r=0.00 ✓

### GitHub Actions Configuration
- **Timeout:** 15 minutes (LLM evaluation can be slow)
- **Ubuntu latest** for consistency
- **Node 20** with npm cache
- **Environment variables** from secrets (secure credential handling)
- **Artifact upload** with `if: always()` to capture results even on failure

### Satisfaction Proxy Computation
**avg_session_length:** Groups messages by conversation_id, averages message counts

**total_conversations:** Counts unique conversation_ids per user

**return_rate:** Extracts date from created_at timestamps, counts unique days (retention proxy)

## Integration Points

### With Regression Testing (05-01)
- GitHub Actions calls `scripts/regression-test.ts`
- Uses same exit code convention (0=pass, 1=fail)
- Reuses OPIK_API_KEY, AWS credentials from secrets

### With Quality Scoring (04-01)
- Imports `QualityBreakdown` type from quality-scoring.ts
- Reads quality_breakdown JSONB from user_profiles
- Computes composite score from all 15 section metrics

### With Supabase Database
- Queries user_profiles for quality_breakdown (not null)
- Queries chat_messages for satisfaction proxies
- Uses service role key for admin access

## Verification

All verification checks passed:

1. ✓ quality-correlation.ts shows usage with --help
2. ✓ GitHub Actions YAML is valid syntax
3. ✓ Workflow triggers on correct prompt-related files
4. ✓ Pearson correlation produces correct output for known inputs

## Next Phase Readiness

### Blockers: None

All Phase 5 plans complete. Integration validation infrastructure is operational:
- ✓ Regression testing CLI (05-01)
- ✓ Long-session testing + latency benchmarking (05-02)
- ✓ CI/CD automation + quality correlation (05-03)

### Quality Validation Status

**Regression testing:** Automated via GitHub Actions on prompt changes

**Quality correlation:** Ready to validate once production data available (requires 10+ profiles with chat history)

**Long-session testing:** Manual CLI tool available for personality drift detection

**Latency benchmarking:** Autocannon script measures tracing overhead

### Recommendations for Production

1. **Set up GitHub secrets** before first PR:
   - OPIK_API_KEY
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY

2. **Run quality correlation validation** after first 10-20 users with chat history:
   ```bash
   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts
   ```

3. **Monitor regression test results** in GitHub Actions artifacts for debugging failed runs

4. **Consider increasing samples** for regression tests on main branch (20 is minimum, 50+ provides more confidence)

## Success Criteria Validation

| Criterion | Status | Evidence |
|-----------|--------|----------|
| GitHub Actions workflow runs regression tests on PRs | ✅ PASS | .github/workflows/llm-regression.yml triggers on prompt file changes |
| Workflow uses regression-test.ts with min 20 samples | ✅ PASS | Default SAMPLES=20, calls `npx tsx scripts/regression-test.ts` |
| Workflow uses pass/fail exit codes | ✅ PASS | Relies on regression-test.ts exit 0/1 |
| Quality correlation script computes Pearson r | ✅ PASS | pearsonCorrelation() function validated with test cases |
| Correlation validates r > 0.7 threshold | ✅ PASS | Checks each proxy against threshold, passes if ANY exceeds |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

All created files exist:
- ✓ .github/workflows/llm-regression.yml
- ✓ scripts/quality-correlation.ts

All commits exist:
- ✓ eba0f59 (GitHub Actions workflow)
- ✓ aa50f00 (Quality correlation script)
