# Mobile UX & UI Redesign Spec

**Status:** 📋 Planning  
**Created:** 2026-02-05  
**Priority:** HIGH

---

## Problem Statement

1. **Mobile UX is bad** — unclear what specific issues, need audit
2. **UI is not pretty** — doesn't meet design standards
3. **Not using shadcn properly** — inconsistent component usage

---

## Audit Needed

### Questions for Drew:

1. **Which screens are worst?**
   - [ ] Login/Signup
   - [ ] Import flow
   - [ ] Chat
   - [ ] Settings
   - [ ] Other?

2. **What specific UX issues?**
   - Touch targets too small?
   - Confusing navigation?
   - Slow/janky interactions?
   - Text too small?
   - Forms hard to use?

3. **UI issues:**
   - Colors off?
   - Spacing wrong?
   - Typography inconsistent?
   - Components look broken?

4. **Design reference:**
   - Do we have Figma designs to match?
   - Brand guidelines?
   - Reference apps we should emulate?

---

## Current Tech Stack

- **Framework:** Next.js 16
- **UI Library:** shadcn/ui (partially used)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion

---

## Proposed Approach

### Phase 1: Audit
- [ ] Screenshot all mobile screens
- [ ] List specific issues per screen
- [ ] Compare to shadcn component library
- [ ] Check Figma designs (if available)

### Phase 2: Design System
- [ ] Define color palette (brand orange #EA580C)
- [ ] Typography scale
- [ ] Spacing system
- [ ] Component inventory

### Phase 3: Implement
- [ ] Fix highest-impact screens first
- [ ] Ensure all components use shadcn
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Optimize touch interactions

---

## References

- **Figma (Glenn's designs):** `RWLkGOGxDjDB8DRQqfe6IF`
- **shadcn/ui:** https://ui.shadcn.com/
- **Brand color:** #EA580C (orange)

---

## Next Steps

1. Drew identifies worst screens
2. Pull Figma designs for reference
3. Create detailed fix list
4. Implement
