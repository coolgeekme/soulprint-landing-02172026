# Email + Updates Blueprint

## Goal
Build trust and move waitlist leads toward activation.

## Current Inputs
- Gmail OAuth2 sender
- Confirmation email

## Recommended Email Sequence
1) Day 0: Confirmation (already)
2) Day 2: Roadmap + what to expect
3) Day 7: Early access request CTA
4) Day 14: Feedback or interview invite

## Personalization Tokens
- First name
- Region (if collected)
- Role / company
- Signup date

## Deliverability Basics
- Use a dedicated sender (waitlist@archeforge)
- Include unsubscribe link
- Keep copy short, plain-text friendly

## Metrics to Track
- Open rate
- CTR on “request access”
- Reply rate

## Implementation Checklist
- [ ] Add email scheduling (cron or workflow)
- [ ] Add unsubscribe storage
- [ ] Add tracking params to CTA links
