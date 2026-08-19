# Off-page GEO playbook

Written 2026-08-18. On-site is saturated (see `SEO_GEO.md`); third-party mentions are the
remaining lever — 0.66–0.74 correlation with AI citations vs ~0 for backlinks (Ahrefs 75K-brand
study). Everything here is outside the repo: **Claude drafts, Jaden sends.**

**Constraint (Jaden, 2026-08-18):** we post to **r/EMSProtoQuiz only**. Not r/ems, not
r/NewToEMS. So the paths below are directories, listicles, and reviewers — not subreddit posts.

**The target is not "all glowing."** AI search summarizes across everything including 1-star
reviews, and discounts sources that read as uniformly positive. Aim for *specific, sourced,
overwhelmingly positive, credible*. A fair caveat gets cited more than a wall of praise.

---

## 1. Software directories (highest ratio of effort to payoff)

These are structured, high-authority, and get scraped constantly by AI search. Free listings.

| Directory | Notes |
|---|---|
| Capterra / GetApp / Software Advice (all Gartner) | One submission propagates to all three. EMS/training category. |
| G2 | Highest AI-citation weight of the review sites. Needs 1+ review to publish. |
| AlternativeTo | "Alternative to Pocket Prep / Limmer" is a real query pattern. |
| Product Hunt | One-time spike, but the listing persists and gets cited. |
| EMS1 / JEMS product directories | Industry-specific, high trust with agency buyers. |

**What to submit:** the `/agency/faq/` and `/agency/compare/` URLs, the 4.6 App Store rating,
flat per-provider pricing, and the honest limits (no CE credit, iOS + browser, no roster model).

## 2. Listicles and roundups

Target: "best EMS apps", "best NREMT prep apps", "EMS training software". Editors of these
posts accept pitches; most are affiliate-driven and want a differentiated entry.

**The pitch angle that works** — we are not another NREMT bank:

> Most apps on this list quiz the national registry. ProtoQuiz quizzes *your own agency's
> protocols* — you give it your protocol document and every answer cites the page it came from.
> Free on iOS, 4.6 stars. There's also an agency version where the org sends the protocol and
> we build the question bank for the whole department.

## 3. EMS YouTube / podcast reviewers

Small EMS-education channels review apps and their transcripts get indexed. Offer a free
Premium code and a no-strings "review it honestly, including what you don't like" framing —
that framing gets accepted far more often, and a mixed review is *better* for GEO than a
puff piece.

## 4. What NOT to do

- No fake or incentivized reviews. Ratings imported from other sites also cannot go in
  JSON-LD (`aggregateRating` — Google violation, see SEO_GEO.md).
- No posting to EMS subs we don't moderate. Domain-filter risk for protoquiz.com, and
  r/ems self-promo rules are strict.
- Don't pitch the agency product with claims we can't keep. Standing forbidden list lives in
  memory `b2b-public-accuracy-claims-2026-08-18`: no medical-director sign-off, no CE credit,
  no per-shift tracking, no "zero errors".

## 5. Order to do them in

1. Capterra/GetApp/Software Advice (one form, three listings)
2. AlternativeTo + Product Hunt
3. EMS1/JEMS directories
4. Listicle pitches (5–10 emails)
5. YouTube/podcast outreach (ongoing)
