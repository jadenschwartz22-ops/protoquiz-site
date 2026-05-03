# Agency page audit — 2026-05-03

Compared to `VALUE_PROP.md` and the founder's recent direction (less wishful thinking, real numbers, plain words, sleek minimalism, no "for your agency" presumption).

## What's working

1. **Hero kinetic-text panel** uses §11 sales-shorthand ("Your providers run your protocols every shift… so why is there no tool…"). On voice.
2. **H1**: "A training platform for your organization, based on your actual protocols." — the wedge (§2) is the headline. Right call.
3. **Manifesto section** ("EMS lags behind. Let's fix it.") matches §9 voice.
4. **Admin dashboard mockup**: real product proof.
5. **The math** section: size toggle works, hero number is the right kind of bold, 4 rows are scannable, sources are linked.

## What to fix (priority order)

### 1. Three sections all say roughly the same thing

- §3 Outcomes: "Better clinicians / Faster onboarding / Admin insight / Focus where it counts"
- §6 Comparison: "How this compares to how you train today"
- §8 The math: "Faster onboarding / Fewer mistakes / Legal / TO hours back"

**The math section already names the outcomes AND quantifies them.** The Outcomes-as-cards section is now redundant. Recommend: cut it. The math section becomes the single answer to "what does this do for me?"

### 2. The "see the math" details disclosure is dry

It opens to a flat 2-column list of vendor line items. The user wants this to be a sleek animated visual instead — code-driven CSS/SVG that plays out the comparison as a story.

**Idea**: bar-chart race or stack visual. Six small bars assemble (LMS, CE, custom content, revisions, compliance, setup) → climb to "$76,000 year 1" → then collapse to a single short bar marked "ProtoQuiz $30,000". Animated on open. Uses CSS transforms + transitions, no library, no media file.

### 3. Voice cleanup

A few stragglers that violate §10:
- "How this compares to how you train today" — fine
- "Stop finding out at QA" — fine, on voice
- Leftover "FTO/QI" jargon already cleaned in math section, but check Outcomes + Comparison for stragglers (FTOs spend their time on judgment — that's OK, FTO is normal in EMS-leader vocabulary)
- "Ready to ship across providers" — none found, good

### 4. The "Why this exists / manifesto" section is short and powerful but lonely

It's one section between Founder voice and Admin mockup. Could merge into the Founder voice block as a single "voice + manifesto" block with the founder quote on top and the manifesto headline beneath. Tightens the page.

### 5. CTAs need to be consistent

Hero: "See the Live Demo" + "Start a Conversation"
Bottom CTA: separate section that should mirror the hero CTAs.

Audit which buttons go where and standardize.

### 6. Mobile

Quickly check the math section at mobile width. Size pills wrap to 2 rows on narrow screens, hero number ($72px) might be too big at 375px. Likely fine but verify.

## Proposed changes (in execution order)

1. **Cut the Outcomes section** — redundant with the math section.
2. **Merge Founder voice + Manifesto** into one tight block.
3. **Replace the dry math-details list with an animated CSS/SVG cost-stack visual** that builds up bars on open and reveals the ProtoQuiz overlay.
4. **Verify mobile**, especially math hero font scale + size-pill wrap.
5. **Standardize CTAs** at hero, mid, bottom of page.

After all five: 6 sections instead of 11, every section earns its keep, math section is the centerpiece with a proper visual closer.
