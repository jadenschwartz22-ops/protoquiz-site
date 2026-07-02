# SEO + GEO reference — protoquiz.com

Last updated: 2026-07-01 (branch `site-seo-copy-2026-07-01`). What's in place, why, and what to maintain. Grounded in a mid-2026 research pass (Google's May 2026 AI-optimization guide, Ahrefs citation studies, vendor crawler docs).

## The 2026 reality check (what actually moves AI visibility)

1. **Don't be blocked.** Cloudflare — not robots.txt — is where AI visibility dies. New zones block AI crawlers by default (since Jul 2025), and from **Sept 15, 2026** new domains also get Training/Agent crawlers blocked by default on ad-bearing pages. If AI citations stop: check Cloudflare AI Crawl Control first (all crawlers Allow, managed robots.txt OFF, no Pay Per Crawl). This bit us once already (fixed 2026-06-27).
2. **Be in Bing's index.** ChatGPT Search and Copilot ride Bing. → Bing Webmaster Tools verification (user action, pending) + IndexNow auto-ping on deploy (GitHub Action; manual fallback `node scripts/indexnow-ping.mjs` (key file `8b35c18e9a5be2a5d49fd2996c45ff6b.txt` at root).
3. **Third-party mentions beat on-page for AI citations** (Ahrefs 75K-brand study: mentions correlate 0.66–0.74; backlinks ≈ 0). Reddit (r/ems, r/NewToEMS), EMS YouTube reviews, "best NREMT prep app" listicles are the highest-ceiling lever. Nothing in this repo can do that — it's outreach.
4. **Fresh, answer-first, evidence-dense pages win the long tail.** Only 38% of AI Overview citations come from top-10 results; 31% come from beyond top-100. Niche EMS sub-queries have thin retrieval pools — a dated, statistic-bearing post can be the whole candidate set. The 53-protocols comparison post is our citation magnet.

## Keyword targets (homepage)

Primary: `ems scenarios`, `emt scenarios`, `paramedic scenarios`, `ems protocol quiz`.
Carried in: `<title>`, meta description, OG/Twitter titles, SoftwareApplication JSON-LD, the 04/APP section subtitle. Keep natural.

## Hard rules (violations or dead weight — do not reintroduce)

- **No `aggregateRating` in JSON-LD from App Store data.** Google's review-snippet guidelines prohibit importing ratings from other websites — verbatim violation, removed 2026-07-01. The visible "4.6/5 App Store" text on the page is fine; the markup is not.
- **No `<meta name="keywords">`.** Ignored by Google since 2009; excessive use is a weak Bing spam signal. Removed site-wide 2026-07-01.
- **No FAQPage/HowTo/speakable schema chasing rich results.** FAQ rich results were fully removed for everyone (May 2026). The homepage keeps FAQPage markup only as low-cost entity data — the **visible HTML FAQ is what matters** (LLMs read rendered text, not JSON-LD).
- **Rating is 4.6/5** in visible copy. The App Store *truncates* 4.66667 → 4.6; `scripts/pull-firestore-stats.mjs` uses `Math.floor` to match — never change back to rounding.
- No fake `dateModified` bumps — known negative pattern.

## Structured data map (all still Google-supported)

| Page | JSON-LD |
|---|---|
| `/` | SoftwareApplication+MobileApplication (offers, featureList, installUrl — no rating), Organization, WebSite (no potentialAction), FAQPage |
| `/agency/` | Product (BusinessAudience) |
| `/blog/` | Blog |
| `/blog/posts/*` | BlogPosting + BreadcrumbList |

## GEO plumbing

- **robots.txt**: allow-all + explicit named stanzas for the AI fleet (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User/SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot(-Extended), meta-externalagent, Amazonbot, CCBot, DuckAssistBot, MistralAI-User). Note: Google-Extended only affects Gemini training, NOT AI Overviews. Bytespider ignores robots anyway.
- **llms.txt**: kept as the AI-facing summary (dated facts, article index) but know its limits — ~97% of llms.txt files got zero crawler requests in 2026 studies; no AI search system consumes it. It serves user-triggered agent fetches. A vercel.json rule sets `X-Robots-Tag: noindex` for it, **but note prod is GitHub Pages behind Cloudflare (push to main = deploy) — vercel.json is inert in prod**. Harmless either way. Update the "as of <month year>" facts when stats move; add flagship posts to "Notable articles".
- **No `nosnippet` / `max-snippet` / stray `noindex`** anywhere (legal/ noindex is intentional — contract templates).
- **Smart App Banner** (`apple-itunes-app`) on every indexable page.

## Maintenance checklist — every new blog post

1. Head: canonical, OG image = `og-image.png` or a post-specific 1200x630 card (never the square logo), BlogPosting + BreadcrumbList JSON-LD, `apple-itunes-app` meta (all in `_template.html`).
2. Add to `blog/index.html`, `blog/feed.xml`, `sitemap.xml` (with lastmod).
3. Write answer-first: first paragraph under each H2 answers that H2's question (44% of ChatGPT citations come from the first 30% of a document). Dated stats > adjectives.
4. IndexNow ping is AUTOMATED (.github/workflows/indexnow-ping.yml fires on content pushes to main). Manual fallback: `node scripts/indexnow-ping.mjs`.
5. Flagship/data pieces → llms.txt "Notable articles".

## Other conventions

- Favicons cache-busted with `?v=N` (currently 2). Logo change → bump N in all HTML + `site.webmanifest`.
- Superseded near-duplicate posts get a canonical to the replacement (51-protocols → 53-protocols); keep them out of sitemap/index/feed.
- `404.html` = static not-found page (noindex). GitHub Pages serves it natively.
- **Deploy = push to main** (GitHub Pages + Cloudflare proxy). The Pi commits daily stats to main at 13:07 UTC.
- Homepage/agency `lastmod` in sitemap: bump on meaningful content change.

## Open items (need Jaden)

- **Bing Webmaster Tools**: verify protoquiz.com (free, ~10 min) — the control panel for the index ChatGPT Search draws from.
- **About page upgrade**: /about/ shipped 2026-07-01 (truthful minimal: paramedic, Colorado, founder story, Person+ProfilePage schema, blog bylines link to it). Jaden can strengthen it with cert level and years of experience.
- **Off-page mentions** (see #3 above) — the biggest measured lever, entirely outside this repo.
- **Cloudflare re-audit after Sept 15, 2026** (new default AI-crawler blocks on ad-bearing pages).
