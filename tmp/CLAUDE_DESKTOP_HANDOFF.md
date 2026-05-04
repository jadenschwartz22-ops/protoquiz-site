# Handoff prompt — Claude Desktop, Chrome MCP

**Goal:** Replace the hand-coded "movie" walkthrough on the agency page with a real, screenshot-based scroll-through of ProtoQuiz that doesn't look like a demo. Benefits-led, not features-led. Founder writes the words; you do the wiring.

---

## Copy this whole block into Claude Desktop:

You are continuing work on the ProtoQuiz B2B agency landing page. The previous session (in Claude Code) pinned a WIP at `git branch wip/agency-hero-redesign-2`, commit `d7f8e10`. Resume by checking out that branch.

**Working directory:** `/Users/jadenschwartz/Desktop/Entrepreneurship/Sites/PQ site`
**Preview file you'll edit:** `tmp/movie-preview.html`
**Local server (start it):** `python3 -m http.server 8767` from repo root, then open `http://localhost:8767/tmp/movie-preview.html`

### Read these first, in this order

1. **`VALUE_PROP.md`** — **non-negotiable, read this whole doc end-to-end before writing or editing any copy.** It is the source of truth for B2B voice, positioning, pricing, and use/avoid words. The doc wins over anything live. Reference sections by number when you make decisions:
   - §2 (the wedge — agency-specific protocol fluency)
   - §6 (differentiation — the one thing)
   - §7 (priority order of value props — for benefits framing)
   - §8 (proof points)
   - **§8a (pricing — current model, READ THIS, the price changed)**
   - §9 (voice and tone)
   - §10 (words to use vs. avoid — these are enforced)
   - §11 (sales-pitch shorthand — usable on-page)
   - §13 (anti-pitches — don't lead with these)
2. **`tmp/HERO_REDESIGN_NOTES.md`** — what was done in the prior session, what's still open.
3. **`tmp/movie-preview.html`** — the file you're editing. Read the existing `.scene` blocks (search `data-beat=`) and `.narration-step` blocks to see the current structure.
4. **Live agency page:** https://protoquiz.com/agency/ — for "what's the production page doing"
5. **Audit summary in this prompt below** — covers what to keep/drop.

### CRITICAL — pricing model changed (2026-05-04)

The pricing on the current preview and live page is **WRONG / STALE**. Founder updated the model. Read `VALUE_PROP.md §8a` for the canonical version. Summary:

- **Standard rate:** $100 per provider per **month** (NOT per year — the old "$100/yr" copy is dead)
- **Pilot rate:** 50% off **for life** = **$50 per provider per month**. Locked permanently for early agency partners.
- **No more "free 6-month pilot" framing.** That's old. The pilot offer IS the 50%-for-life rate.
- **Show the math on the page.** Founder wants buyers to see actual dollars (e.g. "300 providers × $50/mo = $15,000/mo"). They'll calculate it anyway — show your work.

The math/ROI section in `tmp/movie-preview.html` (search `id="value-section"`) was built around the old yearly price. **It's broken.** The size toggle uses values like `pq: '$30,000'` for medium-yearly — that's now the medium-monthly. All the comparison math (DIY vs ProtoQuiz, savings calcs) needs to be rebuilt against the new monthly model. Coordinate with the founder before re-deriving the savings numbers — the prior numbers were research-backed, the new ones need re-grounding at monthly cadence.

**This pricing update affects more than the walkthrough rebuild.** Even though your scope is the walkthrough, you should flag the math section and pricing card as needing rework — and propose the founder either (a) wait until walkthrough lands, then a separate session does pricing, or (b) tackle pricing in this session because the page can't ship with stale numbers either way.

### What you have access to

You have **Chrome MCP**. Use it to navigate to and screenshot real ProtoQuiz screens (NOT mockups). All of these return 200:

- **User-facing demo:** `https://demo.protoquiz.com/` (generic) and `https://denvermetro.protoquiz.com/` (Denver Metro tenant — use this one; it has real-looking branding)
- **Admin view:** `https://denvermetro.protoquiz.com/admin`

### The job, in plain language

The founder wants the walkthrough section of the agency page to feel like a video of someone using ProtoQuiz on their phone (medic side) and on a laptop (admin side).

**The non-negotiable: a moving cursor that clicks through the screens.**

What makes the current preview's movie work is that a fake cursor floats in, hovers a target, clicks, and the screen advances. That motion is what sells it as "someone using the product" instead of a slide deck of screenshots. **Preserve that behavior** — the existing JS in `movie-preview.html` (search `performClickSequence`, `pickEntry`) already does this and was tuned in the previous session. Don't rebuild it; reuse it.

**How you build each scene is your call.** Pick whatever produces the best UI/UX per beat — real screenshots, CSS mockups, SVG-built UI, or a mix. The founder's view: don't bother choosing a doctrine, just make it look great and feel real. The constraints are:

- **The cursor moves and clicks.** Every beat.
- **No "DEMO" / "Sandbox" / fake-tenant branding visible** anywhere. If using screenshots, scrub the badges before capture (DevTools CSS injection) or post-process. If using CSS mocks, just don't put them in.
- **Data on screen is believable for a real Denver Metro EMS deployment** — real-sounding agency name, realistic provider counts, realistic protocol references. Not "Lorem Ipsum", not "Test Agency".
- **Visually polished** — match Inter for body, Georgia for serif headings, JetBrains Mono for labels and metadata, project ease `cubic-bezier(.16,1,.3,1)`. Consistent with the rest of the page.

The pattern (movie frame on the left, narration on the right) is approved — you'll change the narration to a single active-beat panel with prev/next chevrons (see Layout section).

The narrative arc the founder wants:

> "You're an EMT or paramedic. You're on shift. You want to study. You open ProtoQuiz, choose what to study, take a protocol quiz. Maybe you also pick a scenario. We don't show the whole thing — just enough that people see how it works."
>
> "Then: you're an admin. You click through the admin page, look at different topics, and maybe assign quizzes to everyone on a certain topic."

### Hard rules

- **No "demo" branding visible** in any screenshot. If the demo subdomain says "DEMO" anywhere, crop it out, hide it via CSS in the screenshot, or pick a screen that doesn't show it. The viewer should believe this is a real agency tenant.
- **Benefits, not features.** Every narration block says what the buyer/user gets, not what the app does. Use VALUE_PROP §11 shorthand and §7 priority order for inspiration. **Do not write final narration copy. Propose 2–3 options per beat and let the founder pick.** The founder said: *"I'd like you to let me decide what text to put into places more."*
- **Voice rules from §10.** Avoid "run your protocols" (use "use your protocols"), "learners/students/end-users" (use "providers/crews/medics"), "platform/SaaS/solution", "gamified", NREMT-prep framing. The repo's CLAUDE.md and VALUE_PROP.md will reject these on review.
- **Don't touch `agency/index.html`.** It has unrelated uncommitted changes from a parallel session.
- **Don't push to `main`.** Site auto-deploys on push. All work stays on `wip/agency-hero-redesign-2` until founder approves.
- **Use Georgia serif for hero/section titles, Inter for body, JetBrains Mono for labels.** No bounce/elastic easing. Project default ease is `cubic-bezier(.16, 1, .3, 1)`.
- **No emojis anywhere.** No "AI-powered." Project rule.

### Layout — IMPORTANT — different from current preview

The current preview has narration as a long vertical list to the right of a sticky movie frame. **Change it.** The founder wants:

- **Left:** the movie frame (the screenshot/video — same idea as before, defaults to auto-playing through the beats like a film).
- **Right:** a single text panel showing the narration for the **currently-playing beat only** — not a vertical scroll-list of every beat. As the movie advances, the right panel cross-fades to the new beat's text.
- **Navigation controls:** small prev/next chevrons (or arrows) that let the user step backward or forward through beats manually. Pause-on-interaction is fine.
- **Default behavior:** auto-play through the whole movie, beat by beat, like the current version. Manual nav is a fallback for people who want to pause/scrub.

This is one synchronized "video player" widget, not a scroll-tied list. Build it as such.

### No fixed beat count or duration

Founder is explicit: don't lock in a number of beats or a per-beat duration. Pick whatever number tells the story cleanly. Pick per-beat durations that match how long someone realistically needs to absorb the screen + narration. Some beats may be 2.5s, others 5s. Use your judgment.

### Concrete steps

1. **Boot up.** Check out the branch, start the server, open the preview, read the files listed above.

2. **Audit the existing 9 movie beats** in `tmp/movie-preview.html` (search `data-beat=`):
   - `home, topics, test-picker, q-unanswered, q-answered, pdf, admin-dash, admin-reports, admin-assign`
   - These are hand-coded HTML mockups. They go away. Their narrative shape is a useful starting reference but you're rebuilding with real screenshots.

3. **Browse and screenshot the live demo subdomains for reference only.**
   - Use Chrome MCP to navigate `demo.protoquiz.com`, `denvermetro.protoquiz.com`, and `denvermetro.protoquiz.com/admin`.
   - **Phone-frame reference:** browse at ~390 × 844px viewport.
   - **Laptop-frame reference:** browse at ~1280 × 800px viewport.
   - Take screenshots, save them locally for your own reference, study the structure, colors, fonts, spacing, layout, real-looking data, navigation patterns, button states, hover behaviors.
   - **You will NOT embed these screenshots in the final preview.** They're inspiration. You rebuild from scratch in CSS.
   - When the demo subdomains show "DEMO" / "Sandbox" badges, sample data labeled "test", or other demo-indicating UI: ignore it. None of that gets re-created in the CSS mockups. You're rebuilding the *product*, not the demo.

5. **Frame variants in CSS.** The current preview uses one 9:16 frame for everything. Add a second variant: a 16:9 laptop frame, used for admin beats. The frame visually morphs (cross-fade or animated dimensions) when the movie transitions from medic to admin. This reinforces the "you're a medic / you're an admin" narrative.

6. **Build the beat list.** Use this as a starting reference, adjust freely:
   - **Medic arc:** open the app, browse what to study, take a quiz question, see the answer cite the protocol PDF (page reference, highlighted on tap), then **also show a scenario with a real-looking EKG visible** — this is a founder must. Scenarios are a key differentiator (interactive clinical cases, not just trivia), and an EKG on screen reads instantly to a working medic as "this is built for me." The rhythm shown should match the scenario clinically (e.g. STEMI scenario → ST elevation visible, V-tach scenario → wide-complex tachycardia). How you render it is up to you.
   - **Admin arc:** open the dashboard, see weakest topics, assign training to crews, confirmation.
   No fixed count. Whatever tells the story cleanly. Cut anything that's filler.

7. **For each beat, propose 2–3 narration options to the founder.** Each ≤2 sentences. Benefits-first. On-voice per §9/§11. Don't write final copy without founder pick. Founder said: *"I'd like you to let me decide what text to put into places more."*

8. **Build the new player widget.**
   - Strip the existing vertical narration list (`<div class="walkthrough-narration">` with multiple `.narration-step` divs).
   - Replace with: left = movie frame with scenes (build them however you want — best UI/UX wins), right = single `.beat-narration` panel that cross-fades content per active beat, prev/next chevrons below or beside.
   - **The cursor must move and click through every beat.** Reuse the existing `performClickSequence` / `pickEntry` JS — don't rewrite it. Each scene declares a `data-click="..."` target where the cursor lands.
   - Auto-play loop drives the active beat. User clicking prev/next pauses auto-play, sets the active beat manually, optionally resumes after N seconds of inactivity (your call — propose to founder).

9. **Verify reduced-motion fallback.** With `prefers-reduced-motion: reduce`, freeze on the most representative beat (probably the admin dashboard) and show its narration statically. The current preview already does this for the dashboard scene; preserve the pattern.

10. **Verify mobile (≤900px).** Stack vertically: movie above, narration below, chevrons accessible. No sticky.

11. **Show the founder.** Open the preview live. Don't merge to `agency/preview.html` yet.

### Asset storage (only if you use image assets)

- If a beat uses real screenshots, save to `tmp/walkthrough-frames/`. Naming: `01-home.png`, `02-cardiac.png`, etc. — match the beat name. Capture at 2x retina.
- Reference-only screenshots (for your own study, not embedded) prefix with `ref-` in the same folder.
- Strip "DEMO" / "Sandbox" branding before capture (DevTools CSS injection) or post-process out.

### Definition of done (for this session)

- Walkthrough covers both arcs (medic + admin), however many beats it takes — no fixed count.
- Visual quality is high — best UI/UX wins. Build scenes however you want (real screenshots, CSS mocks, SVG, mix). No "demo" branding visible.
- Single-beat narration panel on the right, not a scroll-list. Manual prev/next chevrons work. Auto-play is the default.
- Phone frame for medic beats, laptop frame for admin beats. Frame variant transitions on arc switch.
- Founder-approved copy for every beat (you proposed 2–3 options, founder picked).
- Section reads benefits-first, not features-first.
- Reduced-motion fallback freezes on a representative beat with static narration.
- Mobile (≤900px) stacks cleanly with chevrons accessible.
- Founder has approved the section before any merge to `agency/preview.html`.

### What NOT to do

- Don't deploy. Don't touch `main`. Don't touch `agency/index.html`.
- Don't write the founder's final narration copy without their approval.
- Don't use stock illustrations or AI-generated screens. Real product, real screens, real screenshots.
- Don't introduce new fonts, animation libraries, or frameworks. Vanilla HTML/CSS/JS only — this is a GitHub Pages repo.
- Don't expand scope. The hero, pricing, math, FAQ, and footer are out of scope for this pass — only the walkthrough section.

### When you're done

Report to the founder:
1. Which beats made the cut, with a thumbnail of each screenshot.
2. The chosen narration copy for each beat (the option the founder picked).
3. Anything blocked or open.
4. Ask before merging to `agency/preview.html`.

---

## Audit context (from previous session, summary)

**What's on the live page (`protoquiz.com/agency/`) that the preview is missing:**
- "Why it matters" 4-card benefits section (worth porting; founder wants benefits surface)
- Full "Why this exists" founder block (preview only has a small credit pill)
- Side-by-side comparison table
- Lead-capture modal form (preview just has a "Talk to us" link)
- Real footer (privacy/terms)
- Promo banner ("2 spots before Aug 1") — verify still accurate
- Longer FAQ (8–9 Qs vs preview's 4)

**These are out of scope for the walkthrough-rebuild job, but flag them so a future session knows they're still open.**

**What the preview has that's a win:**
- Kinetic 3-line founder hero (KEEP — it's on-voice §9/§11)
- Walkthrough movie pattern (KEEP THE PATTERN, replace the contents — that's your job)
- Pricing card with benefit-framed list (KEEP)

**Open questions the previous session flagged for the founder:**
1. Walkthrough movie: auto-play on scroll-into-view, or click-to-play?
2. Founder block placement: above-the-fold or mid-page?
3. Hero kinetic animation: desktop-only with static fallback on mobile, or both?
4. Promo banner "2 spots before Aug 1, 2026" — still accurate?
5. CE-credit FAQ answer — verify it explicitly says "not a CE provider today" per §5/§12.
