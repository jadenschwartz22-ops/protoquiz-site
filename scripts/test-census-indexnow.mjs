// scripts/test-census-indexnow.mjs — the census IndexNow diff.
// Run: node scripts/test-census-indexnow.mjs
// The point of this script is that a nightly rebuild which changed nothing
// submits nothing; everything else follows from that.
import assert from 'node:assert';
import { changedUrls } from './census-indexnow.mjs';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

const base = { '/census/': 'h1', '/census/states/co/': 'h2', '/census/agencies/a/': 'h3' };

test('an unchanged rebuild submits nothing', () => {
  assert.deepStrictEqual(changedUrls(base, { ...base }).submitted, []);
});
test('a changed page is submitted', () => {
  const r = changedUrls(base, { ...base, '/census/states/co/': 'CHANGED' });
  assert.deepStrictEqual(r.submitted, ['/census/states/co/']);
});
test('a new page is submitted', () => {
  const r = changedUrls(base, { ...base, '/census/agencies/b/': 'h9' });
  assert.deepStrictEqual(r.submitted, ['/census/agencies/b/']);
});
test('a removed page is not submitted', () => {
  const { '/census/agencies/a/': _gone, ...rest } = base;
  assert.deepStrictEqual(changedUrls(base, rest).submitted, []);
});
test('a first build with no previous manifest submits everything', () => {
  assert.deepStrictEqual(changedUrls({}, base).submitted.length, 3);
});
test('non-page assets are never submitted', () => {
  const r = changedUrls(base, { ...base, '/census/census.css': 'x', '/sitemap-census.xml': 'y' });
  assert.deepStrictEqual(r.submitted, []);
});
test('the cap holds and reports the remainder', () => {
  const many = Object.fromEntries(Array.from({ length: 620 }, (_, i) => [`/census/agencies/a${String(i).padStart(4, '0')}/`, `h${i}`]));
  const r = changedUrls({}, many, 500);
  assert.strictEqual(r.submitted.length, 500);
  assert.strictEqual(r.truncated, 120);
  assert.strictEqual(r.changed.length, 620);
});
test('output is sorted, so two runs submit the same list in the same order', () => {
  const r = changedUrls({}, base);
  assert.deepStrictEqual(r.submitted, [...r.submitted].sort());
});

if (process.exitCode) console.error('\nFAILED');
else console.log(`\n${passed} passed`);
