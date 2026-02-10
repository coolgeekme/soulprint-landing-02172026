# Requirements: SoulPrint v2.3 Universal Uploads

**Defined:** 2026-02-09
**Core Value:** The AI must feel like YOUR AI -- genuinely human, deeply personalized, systematically evaluated.

## v2.3 Requirements

Requirements for the Universal Uploads milestone. Replace raw XHR upload with TUS resumable protocol so any file size works on any device/browser. Fix the Supabase Storage transport limit (~50MB on REST endpoint) that blocks large ChatGPT exports.

### Upload Transport

- [ ] **UPL-01**: User can upload any size ChatGPT export (up to 5GB) via TUS resumable protocol
- [ ] **UPL-02**: User sees accurate upload progress percentage for files of any size
- [ ] **UPL-03**: User's interrupted upload resumes automatically from where it left off on network reconnect
- [ ] **UPL-04**: User's upload retries automatically on transient server errors (5xx, timeout)

### Authentication & Security

- [ ] **SEC-01**: User's JWT token refreshes automatically during long uploads (no 401 failures after 1hr)
- [ ] **SEC-02**: User can only upload to their own storage folder (RLS enforced via bearer token)

### Compatibility

- [ ] **CMP-01**: User can upload from any modern browser (Chrome, Firefox, Safari, Brave, Edge)
- [ ] **CMP-02**: User can upload from mobile devices (iOS Safari, Android Chrome)

### Integration

- [ ] **INT-01**: TUS-uploaded files trigger the same RLM processing pipeline as current XHR uploads
- [ ] **INT-02**: Storage path format is identical to current XHR uploads (no backend changes needed)

### Cleanup

- [ ] **CLN-01**: Old XHR upload code path and chunked-upload module are removed after TUS is verified

## Future Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Upload UX Enhancements

- **UXE-01**: User can resume upload after closing and reopening browser (findPreviousUploads on page load)
- **UXE-02**: User sees upload speed estimation ("X minutes remaining")
- **UXE-03**: User can manually pause and resume upload

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side TUS implementation | Supabase handles TUS server natively |
| Custom chunk sizes | Supabase hardcodes 6MB chunks -- cannot change |
| Parallel chunk uploads | Complexity without value for single-file upload |
| Multi-file batch upload | SoulPrint only processes one file at a time |
| Checksum verification | Not in tus-js-client, Supabase handles integrity |
| Upload queue management | Single file at a time is sufficient |
| Feature flag gradual rollout | Unnecessary complexity -- TUS is drop-in replacement |
| Analytics/monitoring dashboard | No analytics infrastructure exists to track these |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPL-01 | Phase 1 | Pending |
| UPL-02 | Phase 1 | Pending |
| UPL-03 | Phase 1 | Pending |
| UPL-04 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| CMP-01 | Phase 1 | Pending |
| CMP-02 | Phase 1 | Pending |
| INT-01 | Phase 1 | Pending |
| INT-02 | Phase 1 | Pending |
| CLN-01 | Phase 2 | Pending |

**Coverage:**
- v2.3 requirements: 11 total
- Mapped to phases: 11/11 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
