# protoquiz.com: consumer funnel → company site

Design doc. Written 2026-09-10. Status: awaiting review.

Mockups: https://claude.ai/code/artifact/24ef492d-1b3f-4091-8cb1-623f4ec18ac7

## Problem

protoquiz.com is a B2C download funnel wearing a company's URL. Four product areas
already exist and none of them agree with each other.

| Page | Look | Nav | Reads as |
|---|---|---|---|
| `/` | dark CAD console, amber, mono | App · For Agencies · Blog · About | a consumer app |
| `/agency` | cream parchment, oversized serif | How it works · Pricing · Trust · Contact, plus "← Consumer app" | a different company |
| `/census` | white, data-journalism | Census · For Agencies · Blog | a third company |
| `/about` | dark, mono, amber | Home · Blog · For Agencies · Download | a personal project |

Concrete consequences:

- Four navs, four link sets. `/census` never links to the app. `/agency` never links
  to the census. Nothing anywhere links to Android.
- The homepage sells one product to one audience. A training officer, a journalist or
  a researcher lands on a download button.
- `/agency`'s back link says "← Consumer app", framing the revenue product as an exit.
- Android has no home. Two apps ship; one "Download" button points at iOS.
- `/census` is the best distribution asset and is buried a click deep with nothing
  pointing at it.

This is a coherence and hierarchy problem, not a rewrite. `/census` and `/agency` are
both good pages. They just don't belong to the same website yet.

## Decisions taken

Settled with Jaden 2026-09-10, in this order:

1. **Homepage becomes a company hub.** Welcome plus three doors. It sells nothing
   itself; each product page does that.
2. **House style is iOS Day Shift**, lifted from `iOS-App/UI/BrandKit.swift`. The
   website and the app finally look like one company.
3. **Homepage direction C3** ("poster mark + three lanes") of three candidates.
4. **Per-area flavor is deliberate**, not a defect. Shared bones, different
   temperature per area. Census keeps its current look — Jaden: "census page is already
   solid vibe."
5. **Welcome copy is exactly**: "Welcome to ProtoQuiz." / "Protocol training for EMS."
   Nothing else. Earlier drafts led with "Every agency runs different protocols" —
   explicitly rejected.
6. **No census data on the homepage.** The map, counts and drug tables stay on
   `/census`. Explicitly rejected: a census map as homepage hero.
7. **`/app` is fully light**, with the dark theme appearing only inside the phone.
8. **EMS Research is parked**, not dropped. Last thing to work on. See
   `pq-ems-services-research-feasibility-2026-09-10` in memory for the verified data
   findings.

## Design system

Tokens are the iOS Day Shift palette, expressed in OKLCH so neutrals carry a brand
tint. Never `#000` or `#fff`.

| Role | Value | iOS origin |
|---|---|---|
| ground | `oklch(97.6% 0.004 265)` | `0xF6F7F9` |
| paper | `oklch(99.4% 0.002 265)` | card `0xFFFFFF` |
| ink | `oklch(21% 0.017 265)` | `0x171922` |
| ink-2 | `oklch(44% 0.014 265)` | `0x393C47` |
| ink-3 | `oklch(60% 0.011 265)` | — |
| line | `oklch(91.5% 0.007 265)` | `0xE2E4EC` |
| accent | `oklch(50% 0.196 265)` | `0x1D4ED8` |
| census accent | `oklch(50% 0.15 27)` | census red, existing |
| night (in-phone only) | `oklch(13% 0.012 280)` | `0x06050A` |
| amber (in-phone only) | `oklch(79% 0.16 78)` | `0xFFB000` |

Type: **Sora** display and UI, **Source Serif 4** for the single welcome line,
**IBM Plex Mono** for eyebrows, labels and numerals. Mirrors the app's "mono for
structure, sans for prose" rule.

Radii 3/6/8/10, squared-off, per `PQRadius`.

Real logo everywhere: `logo-256.png` (transparent). Not `bimi-logo.svg` — that one has
a hard black square background required by BIMI and wrong on a page.

## Information architecture

```
/                 company hub: welcome + three doors
/app              B2C product page (today's homepage content, re-skinned light)
/agency           unchanged body, new shared chrome
/census           unchanged body and look, new shared chrome
/about /trust /blog /legal/*   unchanged bodies, new shared chrome
```

One nav on every page: **App · For agencies · EMS Census · About**, plus Sign in and
Contact sales. One footer. The `← Consumer app` link is deleted.

## Scope

### In

1. **New `/` homepage**, direction C3: logo at 132px on tinted ground, 82px extra-bold
   "Welcome to ProtoQuiz.", serif tagline, then three full-height lanes (For providers
   / For agencies / EMS Census) each with icon, three proof points and its own button.
   Census lane uses the census red accent; the other two use brand blue.
2. **Shared nav and footer on every page.** Three edit sites, not four hundred:
   - `scripts/census-pages.mjs` line 286 — a single `nav` const covering all ~400
     generated census pages.
   - The static pages: `/agency` (+ `/agency/compare`, `/agency/faq`, `/agency/tour`),
     `/about`, `/trust`, `/blog`, `/privacy`, `/terms`, `/delete-account`, `/legal/*`,
     `/b2b/*`.
   - The new `/` and `/app`.
3. **`/app` page** — today's homepage content moved and re-skinned light:
   - Working two-axis toggle: platform (iOS / Android) × theme (Night / Day).
   - Both store buttons, App Store and Google Play.
   - iOS reviews: real 4.8 / 16 ratings.
   - Google Play panel: "Reviews coming soon", dashed border so it reads as
     intentionally empty rather than broken.
   - Keep: how-it-works 3-step, reach numbers, FAQ.
4. **Redirects and SEO.** `/` currently ranks; its content moves to `/app`. Preserve
   what ranks: canonical tags, sitemap entries, `llms.txt`, and the App Store smart
   banner meta move with the content.

### Out (this batch)

- `/agency` body redesign. PRODUCT.md calls its editorial direction settled; it gets
  new chrome only.
- `/census` body redesign. Explicitly good as-is.
- EMS Research / State of EMS Services. Parked.
- Day Shift screenshots. Needed before `/app` ships (see Open questions).

## Open questions

1. **No Day Shift screenshot exists.** Every capture in `app-shots/` is Night Shift.
   The `/app` toggle's Day state is currently drawn from BrandKit tokens, not
   photographed. Real Day Shift captures are needed on both platforms before ship —
   and the store listings want them regardless.
2. **`/agency`'s cream.** It stays for now, so the site has two grounds: Day Shift
   gray and agency cream. Acceptable as "flavor" per decision 4, but worth a look once
   the shared chrome is in place.
3. **`/agency` renders near-blank above the fold** (scroll-driven headline starting
   empty). A buyer who bounces sees nothing. Not in scope here; worth its own fix.
4. **Census numbers drift.** The mockups say 129 agencies / 1,184 groups; the live
   build as of 2026-09-06 says 127 agencies / 1,251 groups / 144 protocols. Any number
   that ships must be read from the build, never copied from a mockup or this doc.

## Verification

- Every page carries the identical nav and footer markup; no page keeps a private nav.
- No page links to a `← Consumer app` exit.
- Android is reachable from `/`, `/app`, and the footer.
- `/census` and `/agency` bodies render byte-identical to before except for chrome.
- Homepage passes at 400px width: lanes stack, no horizontal scroll.
- Contrast: ink-2 on ground and ink-3 on paper both clear WCAG AA at their sizes.
- Old `/` URLs still resolve or redirect; sitemap and `llms.txt` updated.

## Risks

- **SEO on the homepage move** is the main one. `/` is the current ranking page and
  its content is moving to `/app`. Mitigate with redirects, canonicals and a sitemap
  update in the same commit.
- **CI spend**: this repo deploys on push to main (GitHub Pages). Per the $25/month
  cap, batch the work and push main once.
