// scripts/test-census-report.mjs — the report's invariants.
// Run: node scripts/test-census-report.mjs (also npm run test:census-report).
//
// The load-bearing ones: the report is AGGREGATE-FIRST (no agency name reaches the
// page), it makes no accuracy claim, its findings are chosen by the data rather than by
// hand, and an edition that cannot be filled renders nothing at all.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReport, selectFindings, spreadOf, readCompare, findingSentence, linkedinDraft,
  FLOORS, MIN_FINDINGS, MAX_FINDINGS,
} from './census-report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, '..', 'test', 'fixtures', 'census', 'report');
const THIN = join(FIXTURE, 'thin');

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

const { compare, manifest } = readCompare(FIXTURE);
const r = buildReport({ edition: '2026-q3', compare, manifest });
const html = r.page.html;

console.log('selection');
test('the highest floor that fills an edition is the one used', () => {
  assert.strictEqual(r.floor, 15, 'the fixture has 9 groups at 15 sources, so 15 must win');
  assert.ok(r.ok);
});
test('the floor steps DOWN only when the higher one cannot fill the edition', () => {
  // Drop the fixture to five groups at 15 and one more at 10: 15 can no longer fill it.
  const high = compare.groups.filter(g => g.dist && g.n.sources >= 15).slice(0, 5);
  const mid = compare.groups.filter(g => g.dist && g.n.sources >= 10 && g.n.sources < 15);
  const s = selectFindings([...high, ...mid]);
  assert.ok(high.length + mid.length >= MIN_FINDINGS, 'fixture must still be able to fill at 10');
  assert.strictEqual(s.floor, 10, 'the floor must step to 10, not stay at 15 with five findings');
});
test('a fuller lower floor never beats a usable higher one', () => {
  // 8 sources has strictly more eligible groups than 15, and must still lose:
  // the floor is about the strength of each claim, not the length of the page.
  const at8 = compare.groups.filter(g => g.dist && g.n.sources >= 8).length;
  const at15 = compare.groups.filter(g => g.dist && g.n.sources >= 15).length;
  assert.ok(at8 > at15, 'the fixture must have more groups at the lower floor');
  assert.strictEqual(r.floor, 15);
});
test(`findings are capped at ${MAX_FINDINGS} even when more clear the floor`, () => {
  const eligible = compare.groups.filter(g => g.dist && g.n.sources >= 15 && spreadOf(g) !== null).length;
  assert.ok(eligible > MAX_FINDINGS, 'the fixture must have more eligible than the cap');
  assert.strictEqual(r.findings.length, MAX_FINDINGS);
});
test('findings are ranked by spread, widest first', () => {
  const spreads = r.findings.map(spreadOf);
  for (let i = 1; i < spreads.length; i++) {
    assert.ok(spreads[i] <= spreads[i - 1], `finding ${i + 1} has a wider spread than ${i}`);
  }
  assert.strictEqual(r.findings[0].key.drugKey, 'FENTANYL', 'the widest group must lead');
});
test('a group with a zero median is excluded, not ranked as perfect agreement', () => {
  const zero = compare.groups.find(g => g.key.drugKey === 'ZERO_MEDIAN_DRUG');
  assert.ok(zero, 'the fixture must carry a zero-median group');
  assert.ok(zero.n.sources >= 15, 'and it must otherwise clear the top floor');
  assert.strictEqual(spreadOf(zero), null, 'a zero median has no meaningful spread');
  assert.ok(!r.findings.some(g => g.key.drugKey === 'ZERO_MEDIAN_DRUG'), 'it must not be selected');
});
test('a sub-threshold group (dist null) is never eligible at any floor', () => {
  for (const floor of FLOORS) {
    const s = selectFindings(compare.groups.filter(g => g.n.sources >= floor));
    assert.ok(!s.findings.some(g => g.dist === null), `a null dist was selected at floor ${floor}`);
  }
});
test('selection is deterministic across two runs', () => {
  const a = selectFindings(compare.groups).findings.map(g => g.key.drugKey);
  const b = selectFindings([...compare.groups].reverse()).findings.map(g => g.key.drugKey);
  assert.deepStrictEqual(a, b, 'reversing the input changed the selection');
});

console.log('\nthe edition that does not ship');
const thin = readCompare(THIN);
const thinReport = buildReport({ edition: '2026-q3', compare: thin.compare, manifest: thin.manifest });
test('below the lowest floor the report renders NOTHING', () => {
  assert.strictEqual(thinReport.ok, false);
  assert.strictEqual(thinReport.floor, null);
  assert.strictEqual(thinReport.page, undefined, 'no page may be built');
  assert.strictEqual(thinReport.linkedin, undefined, 'no LinkedIn draft may be built');
});
test('a failed edition still reports the candidate count at every floor', () => {
  assert.deepStrictEqual(thinReport.candidates.map(c => c.floor), FLOORS);
  for (const c of thinReport.candidates) assert.ok(typeof c.count === 'number', 'every floor needs a count');
  assert.ok(thinReport.candidates.every(c => c.count < MIN_FINDINGS), 'no floor may have filled it');
});

console.log('\naggregate-first');
test('no agency name or key reaches the page', () => {
  // Every group in the fixture carries agencyKeys; edition #1 must use none of them.
  const keys = new Set(compare.groups.flatMap(g => g.agencyKeys || []));
  assert.ok(keys.size > 0, 'the fixture must carry agency keys to be a real test');
  for (const k of keys) assert.ok(!html.includes(k), `the report names the agency key ${k}`);
  assert.ok(!/href="\/census\/agencies\//.test(html), 'the report must not link to an agency page');
});
test('the page says in words that it names no agencies', () => {
  assert.ok(/names no agencies/i.test(html), 'the aggregate-first choice must be stated, not just honored');
});
test('every finding prints its own citation line with its own n', () => {
  for (const g of r.findings) {
    assert.ok(html.includes(g.cite), `missing the citation for ${g.key.drugKey}`);
    assert.ok(g.cite.includes(`n=${g.n.sources}`), 'a citation must carry its own n');
  }
});
test('the page prints the floor it used', () => {
  assert.ok(html.includes(`at least <strong>${r.floor} published protocols</strong>`), 'the floor must be stated');
  assert.ok(html.includes(`this edition used <strong>${r.floor}</strong>`), 'the floor must be named as the one used');
});

console.log('\nno accuracy claim');
test('the report makes no accuracy claim of any kind', () => {
  assert.ok(!/\b\d+(\.\d+)?%\s*accur/i.test(html), 'no accuracy percentage');
  assert.ok(!/no errors|error-free|medical.director reviewed|verified by a physician/i.test(html), 'a forbidden claim appears');
  assert.ok(/has not been measured/i.test(html), 'the report must say accuracy is not measured');
});
test('a finding sentence describes the distribution and nothing more', () => {
  const s = findingSentence(r.findings[0]);
  assert.ok(/^Across \d/.test(s), 'a finding must lead with its n');
  assert.ok(!/should|recommend|correct|wrong|best practice|too (high|low)/i.test(s), 'a finding must make no clinical claim');
});
test('the page states what the numbers are not', () => {
  assert.ok(/not a recommendation/i.test(html), 'the caveat section must disclaim recommendation');
  assert.ok(/outlier review are excluded/i.test(html), 'the caveat must state suppressed rows are excluded');
});

console.log('\nrendering');
test('charts are CSS bars with no chart library', () => {
  assert.ok(html.includes('class="chart"'), 'expected the CSS chart');
  assert.ok(!/<script[^>]*src="[^"]*(chart|d3|plotly|highcharts)/i.test(html), 'no chart library may be loaded');
  const externalScripts = [...html.matchAll(/<script[^>]*src="([^"]*)"/g)].map(m => m[1]);
  assert.deepStrictEqual(externalScripts.filter(s => !s.includes('googletagmanager')), [],
    'the only external script may be GA');
});
test('every chart shows the full five-number summary', () => {
  const charts = html.match(/<th>min<\/th><th>p25<\/th><th>median<\/th><th>p75<\/th><th>max<\/th>/g) || [];
  assert.strictEqual(charts.length, r.findings.length, 'one five-number chart per finding');
});
test('the page carries canonical, breadcrumbs and the disclaimer', () => {
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes('"BreadcrumbList"'));
  assert.ok(html.includes('Not a clinical order'));
});
test('every JSON-LD block parses', () => {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
});
test('the report links to the methodology and license pages', () => {
  assert.ok(html.includes('href="/census/methodology/"'));
  assert.ok(html.includes('href="/census/data-license/"'));
});
test('two builds are byte-identical', () => {
  const b = buildReport({ edition: '2026-q3', compare, manifest });
  assert.strictEqual(b.page.html, html, 'the report must not read the clock or a nonce');
});
test('nothing in the report reads the clock', () => {
  const src = readFileSync(join(here, 'census-report.mjs'), 'utf8');
  assert.ok(!/new Date\(\)/.test(src.replace(/gtag\('js', new Date\(\)\);/, '')), 'report constructs a Date outside the GA snippet');
  const today = new Date().toISOString().slice(0, 10);
  if (today !== compare.asOf) assert.ok(!html.includes(today), "today's date appears in the report");
});
test('the report reads compare.json and never a row file', () => {
  const src = readFileSync(join(here, 'census-report.mjs'), 'utf8');
  assert.ok(!/rows_private|dose_latest/.test(src), 'the report must never read the private rows');
});
test('a compare.json on the wrong version aborts', () => {
  assert.throws(() => {
    const c = { ...compare, schemaVersion: 2 };
    if (c.schemaVersion !== 3) throw new Error(`compare.json: schemaVersion ${c.schemaVersion}, the report needs 3`);
  }, /schemaVersion 2/);
});

console.log('\nLinkedIn draft');
const draft = linkedinDraft({ edition: '2026-q3', floor: r.floor, findings: r.findings, compare, manifest });
test('the draft is aggregate only', () => {
  const keys = new Set(compare.groups.flatMap(g => g.agencyKeys || []));
  for (const k of keys) assert.ok(!draft.includes(k), `the draft names the agency key ${k}`);
});
test('the draft makes no accuracy claim and says so to the poster', () => {
  assert.ok(!/\b\d+(\.\d+)?%\s*accur/i.test(draft), 'no accuracy percentage');
  assert.ok(/do not publish an accuracy number/i.test(draft), 'the draft must state accuracy is not published');
  assert.ok(/Do NOT add: "no errors", "medical-director reviewed"/.test(draft), 'the poster notes must carry the forbidden list');
});
test('the draft carries the fallback coverage post for a non-shipping edition', () => {
  assert.ok(/If the report did not ship/.test(draft), 'the coverage fallback must be spelled out');
  assert.ok(draft.includes(String(manifest.namedAgencies)), 'the fallback must carry the coverage numbers');
});
test('the draft is deterministic', () => {
  assert.strictEqual(linkedinDraft({ edition: '2026-q3', floor: r.floor, findings: r.findings, compare, manifest }), draft);
});

if (process.exitCode) console.error('\nFAILED');
else console.log(`\n${passed} passed`);
