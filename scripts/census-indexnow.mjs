#!/usr/bin/env node
// Submits ONLY the census URLs whose content changed, to IndexNow.
//
//   node scripts/census-indexnow.mjs --manifest data/census/pages-manifest.json \
//     --previous <committed manifest> [--limit 500] [--dry-run]
//
// The existing scripts/indexnow-ping.mjs resubmits the whole hand-maintained
// sitemap on any HTML push; that is the wrong shape for a nightly census build
// that rewrites a thousand files and changes three. This diffs the new page
// manifest against the previously committed one and submits the difference,
// capped, so a rebuild that changed nothing submits nothing.
import { readFileSync } from 'node:fs';

const KEY = '8b35c18e9a5be2a5d49fd2996c45ff6b';
const HOST = 'protoquiz.com';
const DEFAULT_LIMIT = 500;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};

const load = (path) => {
  if (!path) return { pages: {} };
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'));
    return { pages: j.pages || {} };
  } catch (e) {
    if (e.code === 'ENOENT') return { pages: {} }; // first build: everything is new
    throw e;
  }
};

// Added or content-changed pages only. A removed page is not submitted: IndexNow
// has no delete verb, and the crawler finds the 404 on its own.
export function changedUrls(previous, current, limit = DEFAULT_LIMIT) {
  const changed = Object.keys(current)
    .filter(p => p.endsWith('/') && current[p] !== previous[p])
    .sort();
  return { changed, submitted: changed.slice(0, limit), truncated: Math.max(0, changed.length - limit) };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const current = load(arg('manifest', 'data/census/pages-manifest.json')).pages;
  const previous = load(arg('previous', null)).pages;
  const limit = Math.max(1, parseInt(arg('limit', String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT);
  const { changed, submitted, truncated } = changedUrls(previous, current, limit);

  if (!submitted.length) {
    console.log('IndexNow: no census pages changed, nothing submitted');
    process.exit(0);
  }
  const urlList = submitted.map(p => `https://${HOST}${p}`);
  if (process.argv.includes('--dry-run')) {
    console.log(`IndexNow (dry run): ${urlList.length} of ${changed.length} changed URLs${truncated ? `, ${truncated} deferred to the next run` : ''}`);
    for (const u of urlList) console.log(`  ${u}`);
    process.exit(0);
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  });
  console.log(`IndexNow: ${res.status} ${res.statusText} — ${urlList.length} of ${changed.length} changed census URLs${truncated ? `, ${truncated} deferred` : ''}`);
  if (!res.ok) process.exit(1);
}
