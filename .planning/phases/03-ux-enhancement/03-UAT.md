---
status: testing
phase: 03-ux-enhancement
source: [02-01-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-02-10T01:00:00Z
updated: 2026-02-10T01:00:00Z
---

## Current Test

number: 2
name: Error Messages Are Specific and Actionable
expected: |
  If an import fails (or you trigger an error), the error display should show a specific title
  (e.g., "Wrong file format", "Connection issue") instead of "Something went wrong", along with
  an explanation and a specific next-step action. Retryable errors show "Try Again", non-retryable show "Start Over".
awaiting: user response

## Tests

### 1. Import Progress Shows Real Stages
expected: Start a new import. During processing, you see a circular ring progress with real percentage, stage headings that change (Downloading → Reading → Building), three stage dots, and a "safe to close" message after 55%.
result: pass

### 2. Error Messages Are Specific and Actionable
expected: If an import fails (or you trigger an error), the error display should show a specific title (e.g., "Wrong file format", "Connection issue") instead of "Something went wrong", along with an explanation and a specific next-step action. Retryable errors show "Try Again", non-retryable show "Start Over".
result: [pending]

### 3. Mobile Large File Warning Is Dismissible
expected: On a mobile device (or with mobile emulation in DevTools), try to upload a file >200MB. You should see a yellow-bordered warning modal saying "Large file on mobile" with an "Upload anyway" button. Clicking it should proceed with the import (not block you).
result: [pending]

### 4. Import Produces Clean Soulprint (No Dead Branches)
expected: After a successful import, your soulprint/AI personality should reflect only your actual conversations — not duplicated messages from edited responses or tool outputs (browsing traces, code interpreter, DALL-E results). The AI name and archetype should make sense based on your real conversations.
result: [pending]

### 5. Background Tab Recovers Progress
expected: Start an import, switch to another browser tab for 30+ seconds, then switch back. The progress should update immediately to the current state (not show stale data from when you left).
result: [pending]

### 6. Returning User Sees Real Progress
expected: Start an import, close the browser entirely, then reopen /import. If the import is still processing, you should see the actual progress percentage from the database (not stuck at 60%).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
