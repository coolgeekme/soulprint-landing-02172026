# Phase 2: LLM Integration - Context

**Gathered:** 2026-01-13
**Status:** Ready for planning

<vision>
## How This Should Work

Get a self-hosted LLM running on AWS that the SoulPrint app can call. The focus is speed to working — get it responding so we can test personality capture without getting stuck on infrastructure.

AWS is the target from the start (no local dev server). The model lives on SageMaker, the Next.js app calls it via API. Changes to app code stay local and fast to iterate, model swaps happen on AWS side.

</vision>

<essential>
## What Must Be Nailed

- **Working LLM endpoint** — Can call it from the app and get responses
- **Fast setup** — Don't over-engineer, just get it working
- **Changeable** — Ability to swap models, adjust parameters without rebuilding everything

</essential>

<boundaries>
## What's Out of Scope

- Streaming responses — get full responses working first, add streaming later
- Production auto-scaling — manual on/off is fine for now
- Cost optimization — start with something that works, optimize later
- Fine-tuning — use base models for now

</boundaries>

<specifics>
## Specific Ideas

- User has new AWS account — will need guided setup
- Start with smaller 13B model for development cost savings
- Use SageMaker with vLLM (from research findings)
- Keep it simple: deploy model, create API route, test it works

</specifics>

<notes>
## Additional Context

User prioritizes getting it working quickly so they can move to personality capture testing. Infrastructure polish can come later once the core SoulPrint functionality is proven.

User confirmed they want full control to make changes and adjustments — AWS SageMaker allows this via endpoint updates and parameter changes.

</notes>

---

*Phase: 02-llm-integration*
*Context gathered: 2026-01-13*
