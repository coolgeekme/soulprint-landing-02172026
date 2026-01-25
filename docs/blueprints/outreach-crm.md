# Outreach + CRM Blueprint

## Goal
Turn waitlist signups into qualified conversations and pipeline visibility.

## Current Inputs
- Waitlist form: name, email, NDA opt-in
- Streak box creation with notes
- Streak contact creation (name + email)

## Core Data to Capture
- Source (utm_source, utm_campaign, utm_medium)
- Region (user-provided or inferred)
- Role / Company (optional field)
- Priority score (rules-based)

## Recommended Changes
1) Add hidden UTM fields on waitlist form
2) Add optional fields: role, company, region
3) Write UTM + fields to Streak box notes
4) Apply a simple lead score in notes

## Streak Setup
- Create pipeline stages: New → Qualified → Invited → Active → Closed
- Add custom fields (optional): Region, Role, Company, Score

## Automation Ideas
- Create a task when a new box appears
- Move stage to “Qualified” when role/company present
- Tag “NDA=Yes” for faster outreach

## Success Metrics
- Waitlist → Conversation rate
- Time to first response
- Qualified rate by region

## Implementation Checklist
- [ ] Add UTM capture to waitlist
- [ ] Add optional fields to form
- [ ] Update Streak notes with fields
- [ ] Define score rules
