# Security Audit Report

**Date:** 2026-01-21
**Auditor:** Claude Code (automated)
**Scope:** US-007 - Audit for exposed secrets and hardcoded credentials

---

## Executive Summary

This audit identified **5 security issues** that required remediation:
- 2 CRITICAL (hardcoded API keys/credentials in committed code)
- 2 HIGH (sensitive data in planning documents)
- 1 MEDIUM (hardcoded development password)

All issues have been remediated.

---

## Findings

### CRITICAL-001: Hardcoded KIE API Key in Production Code

**Location:** `app/api/generate-avatar/route.ts:5`
**Severity:** CRITICAL
**Status:** REMEDIATED

**Issue:**
```typescript
const KIE_API_KEY = process.env.KIE_API_KEY || '6efc289cb78bed900085851c51be6b9a';
```

The API key was hardcoded as a fallback, exposing it in the committed codebase.

**Remediation:**
- Removed hardcoded API key fallback
- Now throws error if environment variable is not set
- Updated .env.example with KIE_API_KEY placeholder

---

### CRITICAL-002: Hardcoded KIE API Key in Documentation

**Location:** `docs/AVATAR-GENERATOR-BLUEPRINT.md:37`
**Severity:** CRITICAL
**Status:** REMEDIATED

**Issue:**
The actual API key was documented in the blueprint file:
```
KIE_API_KEY=6efc289cb78bed900085851c51be6b9a
```

**Remediation:**
- Replaced with placeholder value `your_kie_api_key`
- Added note to get key from KIE.AI dashboard

---

### HIGH-001: AWS Access Key ID in Planning Document

**Location:** `.planning/STATE.md:91`
**Severity:** HIGH
**Status:** REMEDIATED

**Issue:**
Real AWS Access Key ID was stored in planning state:
```
AWS_ACCESS_KEY_ID=AKIA36MTOXRJLGJFX2EH
```

**Remediation:**
- Replaced with `<redacted>` placeholder
- AWS credentials should NEVER be committed, even in planning docs

**Recommended Action:**
The exposed AWS access key should be rotated via AWS IAM console.

---

### HIGH-002: AWS IAM Role ARN in Planning Document

**Location:** `.planning/STATE.md:95`
**Severity:** HIGH
**Status:** REMEDIATED

**Issue:**
Real AWS account ID and role name exposed:
```
SAGEMAKER_EXECUTION_ROLE_ARN=arn:aws:iam::821184871506:role/soulprint-sagemaker-execution-role
```

**Remediation:**
- Replaced with placeholder format
- Account ID and role names should not be in version control

---

### MEDIUM-001: Hardcoded Development Password

**Location:** `app/actions/dev-login.ts:20`
**Severity:** MEDIUM
**Status:** REMEDIATED

**Issue:**
```typescript
const DEV_PASSWORD = "Dp071603!"; // User provided password
```

A development convenience password was hardcoded. While gated by `NODE_ENV !== "development"` check, this is still a security risk as:
1. The password is visible in version control
2. The pattern (appears to be a date-based password) could reveal personal information

**Remediation:**
- Changed to use `DEV_LOGIN_PASSWORD` environment variable
- Falls back to a random UUID if not set
- Added to .env.example as optional development variable

---

## Items Verified as Secure

### Environment Variable Usage
All production secrets are properly loaded from environment variables:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- AssemblyAI: `ASSEMBLYAI_API_KEY`
- Tavily: `TAVILY_API_KEY`
- Gmail: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- Streak: `STREAK_API_KEY`
- OpenAI (deprecated): `OPENAI_API_KEY`
- Gemini (deprecated): `GEMINI_API_KEY`

### .env Files
- Only `.env.example` is committed to git
- `.gitignore` properly excludes all other `.env*` files

### No Exposed Secrets Found
- No JWT tokens in code
- No GitHub tokens
- No OAuth secrets
- No hardcoded Supabase URLs (only placeholder in .env.example)

---

## Recommendations

1. **Rotate AWS Credentials:** The AWS Access Key ID that was exposed should be rotated immediately via the AWS IAM console.

2. **Add Secret Scanning:** Configure GitHub secret scanning or use tools like `gitleaks` to prevent future credential commits.

3. **Pre-commit Hooks:** Add a pre-commit hook to scan for secrets before allowing commits.

4. **Environment Validation:** The `lib/env.ts` file validates required environment variables - ensure this is called early in the application lifecycle.

5. **Review Git History:** Consider using `git filter-branch` or BFG Repo-Cleaner to remove the exposed credentials from git history if this is a public or shared repository.

---

## Audit Checklist

- [x] Search codebase for hardcoded API keys (OpenAI, AWS, Supabase, etc.)
- [x] Search for hardcoded passwords or tokens
- [x] Search for hardcoded URLs that should be environment variables
- [x] Verify all secrets are loaded from environment variables
- [x] Check that no .env files (except .example) are committed
- [x] Document findings (this document)
- [x] Remediate all issues found

---

# Authentication & Authorization Audit

**Date:** 2026-01-21
**Auditor:** Claude Code (automated)
**Scope:** US-008 - Review authentication and authorization flow

---

## Authentication Architecture Overview

### Flow Summary

```
User Request
    │
    ▼
┌─────────────────────────────────────────┐
│         Next.js Middleware              │
│         (middleware.ts)                 │
│                                         │
│  • Calls updateSession()                │
│  • Refreshes Supabase session           │
│  • Protects /dashboard/* & /questionnaire/* │
│  • Auto-creates profile if missing      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│      Supabase SSR Authentication        │
│      (@supabase/ssr)                    │
│                                         │
│  • Cookie-based session management      │
│  • PKCE flow for OAuth                  │
│  • 30-day session persistence           │
└─────────────────────────────────────────┘
```

### Authentication Methods

1. **Email/Password** (`app/actions/auth.ts`)
   - `signUp()` - Creates user with email confirmation
   - `signIn()` - Password-based login with `signInWithPassword`

2. **Google OAuth** (`app/actions/auth.ts`)
   - `signInWithGoogle()` - OAuth 2.0 with PKCE
   - Callback handled at `/auth/callback`

3. **API Key Authentication** (`app/api/llm/chat/route.ts`, `app/api/v1/chat/completions/route.ts`)
   - Bearer token: `sk-soulprint-*`
   - Keys are SHA-256 hashed and stored in `api_keys` table
   - Used for programmatic API access

### Session Management

- **Cookie Configuration** (`lib/supabase/client.ts`, `lib/supabase/server.ts`):
  - `maxAge`: 30 days (Safari persistence fix)
  - `sameSite`: 'lax' (CSRF protection)
  - `secure`: true in production
  - `path`: '/' (application-wide)

- **Session Refresh**: Middleware automatically refreshes sessions via `supabase.auth.getUser()`

---

## Security Findings

### LOW-001: Development Auth Bypass in Middleware

**Location:** `lib/supabase/middleware.ts:17-21`
**Severity:** LOW (development only)
**Status:** ACCEPTABLE (with caveats)

**Issue:**
```typescript
const isLocalhost = request.headers.get('host')?.includes('localhost')
if (isLocalhost && process.env.NODE_ENV === 'development') {
    return supabaseResponse
}
```

Authentication is completely bypassed on localhost in development mode.

**Risk Assessment:**
- Protected by `NODE_ENV === 'development'` check
- Only affects local development
- Cannot be exploited in production

**Recommendation:**
- Consider removing this bypass to ensure consistent auth behavior
- If needed for development, use the `devLogin()` action instead

---

### LOW-002: API Routes Without Authentication

**Severity:** LOW to MEDIUM
**Status:** REVIEW NEEDED

Several API routes do not require authentication:

| Route | Auth Required | Risk | Notes |
|-------|--------------|------|-------|
| `/api/voice/analyze` | No | LOW | Uses server API key for AssemblyAI |
| `/api/search` | No | MEDIUM | Could allow abuse of Tavily API quota |
| `/api/audio/analyze` | No | MEDIUM | Accepts arbitrary userId |
| `/api/waitlist` | No | LOW | Public signup endpoint |

**Recommendations:**
1. **`/api/search`**: Add rate limiting or authentication to prevent API quota abuse
2. **`/api/audio/analyze`**: Verify `userId` matches authenticated user
3. **`/api/voice/analyze`**: Consider adding auth to prevent anonymous usage

---

### LOW-003: Unverified userId in Audio Analysis

**Location:** `app/api/audio/analyze/route.ts:184-186`
**Severity:** LOW
**Status:** REVIEW NEEDED

**Issue:**
```typescript
const userId = formData.get('userId') as string | null;
```

The endpoint accepts `userId` from the request body without verifying it matches an authenticated user. This could allow:
- Associating audio analysis with another user's account
- Impersonation in logged analysis data

**Recommendation:**
Add authentication and verify the userId:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## Items Verified as Secure

### Protected Routes
- [x] `/dashboard/*` routes require authentication (middleware)
- [x] `/questionnaire/*` routes require authentication (middleware)
- [x] Unauthenticated users are redirected to `/`

### Session Security
- [x] Cookies use `sameSite: 'lax'` (CSRF protection)
- [x] Cookies use `secure: true` in production
- [x] Sessions expire after 30 days (configurable)
- [x] PKCE flow used for OAuth (prevents authorization code interception)

### API Authentication
- [x] `supabase.auth.getUser()` used for user verification (not `getSession()`)
- [x] API keys are hashed with SHA-256 before storage
- [x] Rate limiting implemented for API endpoints
- [x] Usage limits enforced in `/api/v1/chat/completions`

### Authorization
- [x] `app/api/soulprint/submit/route.ts` verifies user ID matches authenticated user
- [x] `app/api/generate-avatar/route.ts` filters queries by `user_id`
- [x] RLS (Row Level Security) assumed enabled in Supabase for data isolation

---

## Auth Flow Recommendations

### Immediate Actions

1. **Add Auth to `/api/search`**
   - Prevents anonymous abuse of Tavily API quota
   - Or implement rate limiting by IP

2. **Fix `/api/audio/analyze` Auth**
   - Add `supabase.auth.getUser()` check
   - Verify `userId` matches authenticated user

### Future Improvements

1. **Remove Development Bypass**
   - Use `devLogin()` for development instead of middleware bypass
   - Ensures consistent auth behavior across environments

2. **Implement API Rate Limiting by IP**
   - Protect unauthenticated endpoints from abuse
   - Use edge-compatible rate limiting (e.g., Upstash)

3. **Add Auth Event Logging**
   - Log login attempts (success/failure)
   - Monitor for brute force attacks
   - Track OAuth provider usage

4. **Session Invalidation on Password Change**
   - Ensure all sessions are invalidated when password is changed
   - Supabase handles this automatically, but verify behavior

---

## Auth Checklist (US-008)

- [x] Review `app/actions/gate.ts` for secure access control
- [x] Review Supabase authentication implementation in `lib/supabase/`
- [x] Verify protected routes require authentication
- [x] Check for proper session handling and token management
- [x] Check for auth bypass vulnerabilities
- [x] Document the auth flow and recommendations
