// scripts/test-shared-chrome.mjs — the shared chrome is identical everywhere.
// Run: node scripts/test-shared-chrome.mjs (also npm run test:shared-chrome).
//
// Load-bearing: nav and footer are defined once in shared-chrome.mjs but pasted
// literally into hand-written pages. If a page drifts, the site goes back to looking
// like four different companies, which is the whole problem this fixes.
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAV_HTML, FOOTER_HTML, CHROME_HEAD, navFor } from './shared-chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

// Every hand-written page that must carry the shared chrome. Generated census pages
// get it from the generator and are covered by test-census-pages.mjs instead.
const PAGES = [
  'index.html', 'app/index.html', 'about/index.html', 'trust/index.html',
  'agency/index.html', 'agency/compare/index.html', 'agency/faq/index.html',
  'agency/tour/index.html', 'blog/index.html', 'privacy/index.html',
  'terms/index.html', 'delete-account/index.html',
];

const NAV_LABELS = ['App', 'For agencies', 'EMS Census', 'About'];

test('nav lists the four sections in order', () => {
  const idx = NAV_LABELS.map(l => NAV_HTML.indexOf(`>${l}<`));
  assert.ok(idx.every(i => i > -1), `missing label: ${NAV_LABELS.filter((l, i) => idx[i] < 0)}`);
  assert.deepStrictEqual(idx, [...idx].sort((a, b) => a - b), 'nav labels out of order');
});

test('nav has no back-to-consumer exit', () => {
  assert.ok(!/back-to-consumer|Consumer app/i.test(NAV_HTML + FOOTER_HTML));
});

test('footer reaches both app stores', () => {
  assert.match(FOOTER_HTML, /iOS app/);
  assert.match(FOOTER_HTML, /Android app/);
});

test('navFor marks exactly one link current', () => {
  for (const p of ['/app/', '/agency/', '/census/', '/about/']) {
    const html = navFor(p);
    assert.strictEqual((html.match(/aria-current="page"/g) || []).length, 1, `${p} did not mark one link`);
  }
  assert.strictEqual((navFor('/').match(/aria-current="page"/g) || []).length, 0, 'home marks none');
});

test('navFor marks the section a deep page belongs to', () => {
  assert.match(navFor('/agency/faq/'), /href="\/agency\/" class="nav-link on"/);
  assert.match(navFor('/census/drugs/adenosine/'), /href="\/census\/" class="nav-link on"/);
});

test('no page keeps a private nav', () => {
  for (const rel of PAGES) {
    const f = join(root, rel);
    if (!existsSync(f)) { assert.fail(`missing page: ${rel}`); }
    const html = readFileSync(f, 'utf8');
    assert.ok(html.includes('<!-- shared-chrome:nav -->'), `${rel} has no shared nav marker`);
    assert.ok(html.includes('<!-- shared-chrome:footer -->'), `${rel} has no shared footer marker`);
    assert.ok(html.includes('/assets/chrome.css'), `${rel} does not link chrome.css`);
    assert.ok(!/back-to-consumer/.test(html), `${rel} still has a back-to-consumer link`);
  }
});

test('every page renders the canonical footer verbatim', () => {
  for (const rel of PAGES) {
    const f = join(root, rel);
    if (!existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    assert.ok(html.includes(FOOTER_HTML), `${rel} footer has drifted from shared-chrome.mjs`);
  }
});

test('chrome head declares the three fonts', () => {
  for (const f of ['Sora', 'Source+Serif+4', 'IBM+Plex+Mono']) {
    assert.ok(CHROME_HEAD.includes(f), `CHROME_HEAD missing ${f}`);
  }
});

test('no hardcoded pure black or white in chrome.css', () => {
  const css = readFileSync(join(root, 'assets/chrome.css'), 'utf8');
  assert.ok(!/#fff\b|#ffffff\b|#000\b|#000000\b/i.test(css), 'chrome.css uses pure black or white');
});

console.log(`\n${passed} passed`);
