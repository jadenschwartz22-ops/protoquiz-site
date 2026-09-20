#!/usr/bin/env bash
# Restore full crawling of /census/. See census/RELAUNCH.md for the why.
# Run from the repo root: bash census/relaunch.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. robots.txt — BOTH user-agent groups. A named group overrides `*` entirely, so
#    removing the disallow from only the first leaves every AI crawler blocked.
node -e '
const fs = require("fs");
let s = fs.readFileSync("robots.txt", "utf8");
s = s.replace(/^# Census is unpublished[^\n]*\n(^#[^\n]*\n)*/m, "");
s = s.replace(/^Disallow: \/census\/\n/gm, "");
fs.writeFileSync("robots.txt", s);
const left = (s.match(/Disallow: \/census\//g) || []).length;
if (left) { console.error(`robots.txt still blocks /census/ in ${left} place(s)`); process.exit(1); }
console.log("robots.txt: /census/ unblocked in all groups");
'

# 2. sitemap-index.xml — put the census sitemap back so 769 URLs get re-crawled.
node -e '
const fs = require("fs");
let s = fs.readFileSync("sitemap-index.xml", "utf8");
if (s.includes("sitemap-census.xml")) { console.log("sitemap-index: already present"); process.exit(0); }
const today = new Date().toISOString().slice(0, 10);
s = s.replace("</sitemapindex>",
  `  <sitemap>\n    <loc>https://protoquiz.com/sitemap-census.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n</sitemapindex>`);
fs.writeFileSync("sitemap-index.xml", s);
console.log("sitemap-index: census sitemap restored");
'

echo
echo "Now rebuild the pages with indexing ON:"
echo "  CENSUS_ROBOTS=index,follow node scripts/census-pages.mjs --data data/census --out ."
echo "Then verify:"
echo "  grep -rc \"content=.index,follow.\" census/index.html"
echo "  grep -c census robots.txt        # expect 0"
