# Advocacy section

One long-form advocacy article a month on the blog (owner ruling 2026-10-12). The bar is trade-press
feature journalism: researched, data-led, with images. It is a different genre from product posts, so the
"short, wins first, app art only" rules for product posts do not apply here. Blog mechanics (template,
index card, feed, sitemap, deploy) are unchanged.

## Standard (every article)

- 1,300 to 1,800 words. Open on a concrete sourced fact, never an invented scene or person. Second or third
  paragraph says what the piece shows and why now. Subheads state a point.
- Every number, law and named example has a numbered footnote to a primary or authoritative source that was
  opened while writing (GAO, MedPAC, CMS, BLS, NHTSA, NCSL, statutes, peer-reviewed papers, the original
  survey). The year of every statistic is stated. If it cannot be verified it is left out, and the piece says
  what could not be found. Where sources disagree, say so.
- No invented quotes, people, anecdotes or statistics. Quotes only from published, linked sources.
- The opposing case gets its own section, stated fairly, before the asks. Close with 3 to 5 specific asks.
- Does not sell ProtoQuiz. At most one closing line pointing to the Census.
- No em dashes, no emojis, no listicle voice.
- Census data: summaries only, never an agency's own dose; cite `n=<protocols> from <agencies> agencies /
  <states> states` with the build date; no accuracy claim, no recommendation; say what the numbers are not.
- Images: 2 to 3 charts built as inline SVG from the sourced numbers (title states the finding, direct labels,
  source line; ink #101418, accent #c8102e, greys), plus photographs. More photos are welcome. Photos are public
  domain or Creative Commons only, credited with author, licence and source URL in the caption. Never
  AI-generated. Prefer recent photos of public agencies; avoid private-company liveries.

## Process (same every month, so article 4 matches article 1)

1. Pick the topic from the calendar. One pillar per month; do not run two pieces that lean on the same source
   in consecutive months.
2. One Opus writer researches and writes a self-contained draft HTML to the session scratchpad using the brief
   in "Writer brief" below. Web search is capped per session: run the writer in a fresh session or give it
   known source URLs to fetch directly.
3. The master session reads the whole draft, re-opens the sources behind the headline facts and every direct
   quote, and removes anything that does not check out.
4. Owner sees the draft opened locally and gives one verdict round. Nothing is built before that.
5. Build into `blog/posts/YYYY-MM-DD-<slug>.html` with category `advocacy`, card at the top of `blog/index.html`,
   feed and sitemap, then push main and look at the live page.

## Writer brief (fill the two bracketed parts)

Topic and angle: [pillar, the claim, the sources to start from, the counterargument to state].
Then the Standard section above verbatim, plus: propose a headline under 70 characters with two alternates and
a one-sentence dek; byline "By ProtoQuiz Research"; one self-contained HTML file, single column about 680px,
18 to 19px body, full-width hero, figure captions, numbered source list with live links; report headline, word
count, source count, the three strongest facts, and everything that could not be verified.
Data for a census piece: [published files to read with `git show origin/main:data/census/...`].

## Calendar

| Month | Pillar | Article | State |
|---|---|---|---|
| 2026-10 | Essential service | Most States Still Do Not Call EMS an Essential Service | publishing |
| 2026-11 | Transparency | Same Patient, Different Dose: What 168 EMS Protocols Print | drafted; re-check the six paper quotes and refresh census numbers to the build date |
| 2026-12 | Workforce | The median EMT earns less than the median American worker | drafted |
| 2027-01 | System performance | Hospital offload delays: the hours ambulances spend waiting at the door | to write |
| 2027-02 | Essential service | Ambulance deserts and what keeps a rural service open | to write |
| 2027-03 | System performance | Treatment in place and alternative destinations after the federal pilot ended | to write |
| 2027-04 | Public understanding | What a response time does and does not tell you | to write |
| 2027-05 | Workforce | The volunteer ambulance and who replaces it (EMS Week) | to write |
| 2027-06 | Transparency | Which states publish EMS staffing, response and offload data | to write |
| 2027-07 | Public understanding | Bystander CPR and AEDs: where survival is higher and why | to write |
| 2027-08 | Voice | Who speaks for EMS in state and federal government | to write |
| 2027-09 | System performance | Community paramedicine: what the evidence shows | to write |

Banked drafts (local, gitignored): `scratch/advocacy/` in the main site checkout.
