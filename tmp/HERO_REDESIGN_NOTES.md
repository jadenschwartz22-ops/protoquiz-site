# Agency hero redesign — pinned WIP

**Branch:** `wip/agency-hero-redesign-2` (off commit 8dbdfed)
**Preview:** `tmp/movie-preview.html` — open via `python3 -m http.server 8767` from repo root, then `http://localhost:8767/tmp/movie-preview.html`

## Status: not ready to ship

The unified preview is structurally close, but several things need another pass before it can replace `agency/index.html`. Pinning here so it doesn't lose context.

## What's done in this branch

- Hero replaced with founder-voice kinetic reveal (3 lines, word-by-word, dramatic pacing). No name in byline (founder didn't want first/last on the page).
- Header logo bumped to 56px on white tile (was tiny 26px on dark).
- "Built by a working paramedic" credit moved out of hero into the walkthrough section as a small monospace pill.
- Pricing moved above the math section. Price benefit list rewritten from features → outcomes.
- Math section: full interactive cost-stack ported over from `agency/preview.html` (size toggle, sourced rows, animated DIY-vs-PQ comparison). `localStorage` persistence works.
- Cursor entry randomization: was cycling 8 fixed corners; now random pick from eligible far edges, excluding last-used. Removes the visible pattern.
- Narration auto-scroll on mobile (<900px) — keeps the active step in view when sticky layout collapses.
- VALUE_PROP §10 avoid list updated: "run your protocols" is now banned (use "use your protocols"). §11 shorthand updated to match.

## Open kinks (do these before merging to `agency/preview.html`)

1. **Hero pacing.** Currently: lede 140ms/word + 1.4s hold → question 170ms/word + 1.7s hold → answer 320ms/word + 950ms fade. Founder said "decent but not ready" — needs founder-with-stopwatch tuning, not AI-guessed timing. Knobs are in the heroReveal IIFE in `tmp/movie-preview.html`.
2. **Math row copy.** Rows are still feature-flavored ("Faster onboarding", "Fewer mistakes to fix"). Re-check against VALUE_PROP §6/§7 — should the lead-in for each row be more outcome-shaped?
3. **Walkthrough narration column.** Section title was rewritten ("Train on your protocols.") but the 6 narration steps inside the right column still use the old "medic on shift" / "training officer" two-actor framing. Founder pushed back on that framing once already — likely needs another pass.
4. **Mobile (380/720).** CSS handles the breakpoints, but no real visual walk-through done. Needs eyes on actual narrow viewports.
5. **Founder pullquote duplication.** The pullquote text now lives in the hero. The standalone `.alt` pullquote section was deleted from this preview, so no duplication remains here — but when merging into `agency/preview.html`, confirm the existing pullquote there gets removed or repurposed.
6. **Hidden compare section in `agency/preview.html`** (line ~1848, `display:none`). Recommend killing the markup outright when merging — the cost-stack does this job better.
7. **Reduced-motion.** Hero kinetic gracefully falls through (all words instant). Verify the math cost-stack also degrades cleanly.

## DO NOT TOUCH

- `agency/index.html` — has 535/131 unrelated uncommitted lines from a parallel session. Excluded from this branch's commit on purpose.

## How to resume

```bash
cd "/Users/jadenschwartz/Desktop/Entrepreneurship/Sites/PQ site"
git checkout wip/agency-hero-redesign-2
python3 -m http.server 8767
open http://localhost:8767/tmp/movie-preview.html
```

## How to ship (eventually)

After founder signs off on the kinks above, port the unified preview into `agency/preview.html`, then `agency/preview.html` → `agency/index.html`. Don't push directly to `main` without founder approval — site auto-deploys on push.
