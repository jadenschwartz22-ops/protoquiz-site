# Handoff prompt — Pricing & math rework session

**Goal:** Rework the pricing card and the ROI math section in `tmp/movie-preview.html` to match the new pricing model ($100/provider/month standard, $50/provider/month pilot rate locked for life). Re-ground the savings math against monthly cadence. Show the buyer their actual dollars.

**Run this AFTER the walkthrough rebuild lands**, not in parallel. The walkthrough is the primary deliverable; pricing is a separate focused pass.

---

## Copy this whole block into the next Claude session:

You are reworking the pricing card and the ROI math section on the ProtoQuiz B2B agency landing page. The walkthrough rebuild from a prior session has already landed (or will have by the time you start). Your job is just pricing + math.

**Working dir:** `/Users/jadenschwartz/Desktop/Entrepreneurship/Sites/PQ site`
**Branch:** `wip/agency-hero-redesign-2` (continue on this branch — don't make a new one)
**Preview file:** `tmp/movie-preview.html`
**Local server:** `python3 -m http.server 8767` from repo root, then `http://localhost:8767/tmp/movie-preview.html`
**Don't touch `agency/index.html`. Don't push to `main`.**

### Read these first

1. **`VALUE_PROP.md`** — especially **§8a (pricing — canonical, this is the source of truth)** and §7 (priority order of value props), §9 (voice), §10 (use/avoid words), §11 (sales-pitch shorthand).
2. **`tmp/movie-preview.html`** — find the pricing card (search "Pricing" or `class="price-card"`) and the math section (search `id="value-section"` or "The math"). Read both end-to-end to understand current structure.

### What's stale (and why)

The pricing model changed 2026-05-04 from yearly to monthly. The current preview is wrong everywhere pricing or savings appear:

**Pricing card stale items (search `class="price-card"`):**
- Headline "$100 per provider per year." → wrong.
- Sub: "Flat. No tiers, no setup fees, no add-ons. Free for 6 months for early pilot partners." → wrong, no more free pilot.
- Pilot ribbon: "Free 6-month pilot · 2 spots open" → wrong framing (the pilot now is the 50%-for-life rate, not free).
- Big number: "$0" → wrong. The number to lead with should be the actual price the buyer pays.
- Price unit: "For the first six months. Then $100 per provider per year — about $8.33/mo." → wrong, kill the "$8.33/mo" footnote (was selling the yearly framing).
- "Pilot deadline August 1, 2026" → still real, keep IF founder confirms.
- Benefit list — keep, it's already benefit-framed.

**Math section stale items (search `id="value-section"`):**
- All numbers in the JS `SIZES` object (search `const SIZES = {`) are yearly. Must rederive at monthly cadence.
- The cost-stack DIY comparison numbers (LMS, CE library, custom content, compliance add-on, subdomain & setup) — those were yearly comparisons; if you keep this section, restate at monthly or be explicit "/year" in every label.
- The math hero copy: "A medium agency saves about $54,000/yr. ProtoQuiz costs $30,000/yr." → both numbers stale, savings claim needs re-derivation.
- Math row titles ("Faster onboarding", "Fewer mistakes to fix", "Legal & license defense", "Training officer hours back") and the per-row dollar values — yearly savings numbers from a research-backed model. The research is fine; the cadence is wrong.

### The new model (from VALUE_PROP §8a — read it directly, don't paraphrase from here)

- **Standard:** $100 per provider per month. Flat. No tiers, setup fees, or add-ons.
- **Pilot rate:** 50% off for life = $50 per provider per month. Permanent for early agency partners. NOT a temporary promo.
- **Show the math.** Buyer sees actual dollars. "300 providers × $50/mo = $15,000/mo" is the kind of thing that should appear on the page.

### Your job, in order

1. **Boot up.** Check out the branch, start the server, open the preview, read VALUE_PROP.md §8a and §7/§9/§10 carefully.

2. **Audit current pricing card and math section.** Note every number, every framing, every word that's now stale. List them so you can fix them all.

3. **Propose 2–3 framings for the pricing card to the founder.** Don't write final copy. Founder picks. Each framing should specify:
   - What number leads (pilot rate? standard rate with pilot strikethrough? per-month cost for THEIR agency size?)
   - How the pilot offer is framed (50%-for-life as the headline? as a footnote? as a ribbon?)
   - Whether the agency-size toggle from the math section also drives the pricing card (e.g. "for a 300-provider agency, that's $15,000/mo")
   - What's in the benefit list (currently 6 items, keep or trim)
   - Whether to keep the "Pilot deadline August 1, 2026" line
   Cite VALUE_PROP §8a + §9 voice for each option.

4. **Propose ROI/math model to the founder.** This is the hardest part. The previous session's per-row savings numbers were research-backed (PubMed onboarding study, Texas DSHS enforcement, license-defense rates, Utah TO manual). All those rows are still defensible — the change is **how the savings line up against the new monthly cost.**

   Two structural options to propose:
   - **(a) Keep the four math rows yearly** (savings ARE annualized — onboarding/yr, remediation/yr, legal/yr, TO hours/yr) but show the ProtoQuiz cost in BOTH yearly and monthly. E.g. "Net savings $24,000/yr against $50/provider/mo × 300 providers = $180,000/yr cost." That makes the savings story HARDER (now it costs more than it saves on conservative numbers, especially at standard rate).
   - **(b) Pivot the math from "ProtoQuiz pays for itself in saved dollars" to "ProtoQuiz costs $X/mo and these are the benefits you get." Show the cost upfront. Stop trying to fight the cost with savings — savings is a secondary point.**

   Option (b) is probably the right call given the new pricing reality. Propose to founder, get approval before rebuilding.

5. **Wait for founder picks.** Don't write final code or copy until founder has approved (a) the pricing card framing and (b) the math model direction.

6. **Build it.**
   - Update the pricing card markup, copy, and any data-bound values in the JS SIZES object.
   - Update the math section markup, copy, and values. If the SIZES object structure changes, update the JS that reads it.
   - If the math model pivots from "savings calc" to "cost + benefits", restructure the math section accordingly — could become much simpler (one cost number, a list of benefits, no DIY comparison).
   - Update the agency-size toggle so it drives whatever the new model needs (pricing card + math section if both use it).
   - Verify localStorage persistence (`protoquiz_agency_size`) still works.
   - Verify reduced-motion fallback still works.

7. **Show the founder.** Walk through the pricing card and math section live. Don't merge to `agency/preview.html` without explicit founder approval.

### Hard rules

- **Read VALUE_PROP §8a directly. Don't paraphrase pricing from this prompt — pricing might have updated again.**
- **Founder writes the words. You propose 2–3 options per decision. Founder picks.**
- **Pricing math must be visible.** Founder explicitly wants buyers to see actual dollars.
- **Voice rules from §9/§10.** Avoid: SaaS, platform, solution, gamified, NREMT-prep framing, "run your protocols". Use: providers, crews, your protocols, pilot, sign-off, stand up.
- **Don't deploy. Don't push to main. Don't touch `agency/index.html`.**
- **No emojis. No "AI-powered."**

### Definition of done

- Pricing card reflects the new $100/mo standard / $50/mo pilot model with founder-approved framing.
- Math section either reworked to match the new monthly cadence (with founder-approved per-row numbers) OR pivoted to a simpler cost+benefits structure (with founder approval).
- Size toggle wired correctly across both sections if both use it.
- localStorage persistence intact.
- All stale "Free 6-month pilot" / "$8.33/mo" / "$0" / yearly references gone from these sections.
- VALUE_PROP §8a unchanged unless founder explicitly updated pricing during the session — in which case update §8a first, then propagate to the page.
- Founder has approved before any merge to `agency/preview.html`.

### When you start

Post a short plan back to confirm:
1. You've read VALUE_PROP §8a and §7/§9/§10.
2. Your understanding of the constraints in your own words.
3. Whether you recommend math model option (a) yearly-savings-vs-monthly-cost, (b) cost+benefits pivot, or something else. Justify.

Then wait for founder approval on direction before building anything.
