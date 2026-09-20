# Relaunching the census

The census is UNPUBLISHED as of 2026-09-20 (Jaden: hold it until the new research
site launches). Nothing was deleted. All 778 pages still build and still resolve —
they are hidden from search, not removed.

## To go live: restore full crawling

Run this from the repo root, then commit and push.

```bash
CENSUS_ROBOTS=index,follow node scripts/census-pages.mjs --data data/census --out .
node scripts/census-report.mjs            # if republishing a report edition
bash census/relaunch.sh                   # robots.txt + sitemap-index, see below
```

`relaunch.sh` does the two things the generators do not own:

1. **robots.txt** — removes `Disallow: /census/` from BOTH user-agent groups. There
   are two: `*` and the named AI/LLM crawler group. A named group OVERRIDES `*`
   entirely, so removing it from only the first leaves GPTBot, ClaudeBot and the rest
   still blocked. That is the trap this file exists to prevent.
2. **sitemap-index.xml** — puts `sitemap-census.xml` back. Search engines will not
   re-crawl 769 URLs promptly without it.

## Verify before you call it live

```bash
grep -c 'content="index,follow"' census/**/index.html   # expect 778
grep -c 'census' robots.txt                             # expect 0
grep -c 'sitemap-census' sitemap-index.xml              # expect 1
```

Then, after deploy, request re-indexing in Google Search Console. The URLs are still
known to Google (that is why this was done with noindex rather than by deleting the
pages), so recovery is faster than a cold launch, but it is not instant.

## Why it was done this way

`noindex` + robots block, pages kept:
- URLs keep resolving for anyone holding a link — no 404s, no broken references
- Google de-indexes over days-to-weeks and RE-indexes faster on relaunch, because
  the URLs were never removed
- Deleting `census/` instead would have 404'd 769 indexed URLs and forced a cold
  re-index at launch

`ROBOTS` in `census-pages.mjs` / `census-report.mjs` DEFAULTS to `noindex,nofollow`.
The safe state is the default on purpose: a forgotten env var leaves the census
hidden rather than silently publishing it.

## The nightly

`CENSUS_PUBLISH` stays unset on the Pi, so the nightly still classifies, extracts and
builds — the corpus keeps growing for launch — but publishes nothing to the live site.
Set `CENSUS_PUBLISH=1` only when relaunching.
