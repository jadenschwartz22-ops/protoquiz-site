// scripts/test-census-pages.mjs — the page generator's invariants.
// Run: node scripts/test-census-pages.mjs (also npm run test:census-pages).
//
// The load-bearing one is determinism: the nightly build commits generated
// pages, so a rebuild from unchanged data must produce byte-identical bytes or
// every night is a diff and the repo grows without the data changing.
import assert from 'node:assert';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { generate, buildPages, MIN_AGENCY_DRUGS, MIN_INDICATION_ROWS } from './census-pages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', 'test', 'fixtures', 'census', 'data');

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

const walk = (dir, base = dir) => readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p)];
});

const tmp = () => mkdtempSync(join(tmpdir(), 'census-test-'));
const run = (dataDir = FIXTURES) => {
  const out = tmp();
  const r = generate({ dataDir, outDir: out });
  return { out, ...r };
};

const data = () => ({
  documents: JSON.parse(readFileSync(join(FIXTURES, 'documents.json'), 'utf8')).rows,
  agencies: JSON.parse(readFileSync(join(FIXTURES, 'agencies.json'), 'utf8')).rows,
  doses: JSON.parse(readFileSync(join(FIXTURES, 'dose_latest.json'), 'utf8')).rows,
  ledger: JSON.parse(readFileSync(join(FIXTURES, 'ledger.json'), 'utf8')).rows,
  manifest: JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8')),
});

const a = run();
const paths = new Set(a.files.map(f => f.path));
const html = Object.fromEntries(a.files.filter(f => f.path.endsWith('/')).map(f => [f.path, f.html]));
const allHtml = Object.values(html).join('\n');

console.log('determinism');
test('two runs over the same fixture are byte-identical', () => {
  const b = run();
  const fa = walk(a.out).sort(), fb = walk(b.out).sort();
  assert.deepStrictEqual(fa, fb, 'file lists differ');
  for (const f of fa) {
    assert.strictEqual(readFileSync(join(a.out, f), 'utf8'), readFileSync(join(b.out, f), 'utf8'), `${f} differs between runs`);
  }
  rmSync(b.out, { recursive: true, force: true });
});
test('output does not depend on input row order', () => {
  const d = data();
  const shuffled = {
    ...d,
    documents: [...d.documents].reverse(),
    agencies: [...d.agencies].reverse(),
    doses: [...d.doses].reverse(),
    ledger: [...d.ledger].reverse(),
  };
  const x = buildPages(d), y = buildPages(shuffled);
  assert.deepStrictEqual(x.files.map(f => f.path), y.files.map(f => f.path), 'path list differs');
  for (let i = 0; i < x.files.length; i++) {
    assert.strictEqual(x.files[i].html, y.files[i].html, `${x.files[i].path} differs after reordering input`);
  }
});
test('nothing in the output reads the clock', () => {
  const today = new Date().toISOString().slice(0, 10);
  // asOf comes from the manifest (2026-08-28 in the fixture); if today's date
  // leaked in, a rebuild on a new day would rewrite every page.
  const src = readFileSync(join(here, 'census-pages.mjs'), 'utf8');
  assert.ok(!/new Date\(\)/.test(src.replace(/gtag\('js', new Date\(\)\);/, '')), 'generator constructs a Date outside the GA snippet');
  if (today !== '2026-08-28') assert.ok(!allHtml.includes(today), 'today\'s date appears in output');
});

console.log('\nthin-page rules');
test(`an agency under ${MIN_AGENCY_DRUGS} drugs gets no page`, () => {
  assert.ok(!paths.has('/census/agencies/thin-agency/'), 'thin-agency should have no page');
});
test('an agency with no state gets no page', () => {
  assert.ok(!paths.has('/census/agencies/stateless-ems/'), 'stateless-ems should have no page');
});
test(`an indication under ${MIN_INDICATION_ROWS} rows gets no page`, () => {
  assert.ok(!paths.has('/census/drugs/epinephrine/hypotension-push-dose/'), 'thin indication should have no page');
});
test('a skipped page is absent, not noindexed', () => {
  assert.ok(!allHtml.includes('noindex'), 'no page may carry noindex');
});
test('agencies that clear the bar do get pages', () => {
  assert.ok(paths.has('/census/agencies/denver-health/'));
  assert.ok(paths.has('/census/agencies/boulder-county-ems/'));
});

console.log('\nlinks and leaks');
test('every internal /census/ link resolves to a generated page', () => {
  const linked = new Set([...allHtml.matchAll(/href="(\/census\/[^"]*)"/g)].map(m => m[1]));
  for (const l of linked) {
    if (l.endsWith('.css')) { assert.ok(paths.has(l), `${l} not generated`); continue; }
    assert.ok(paths.has(l), `dead link: ${l}`);
  }
});
test('an agency without a page is never named or linked', () => {
  assert.ok(!allHtml.includes('Thin Agency EMS'), 'thin-agency named in output');
  assert.ok(!allHtml.includes('Stateless EMS'), 'stateless-ems named in output');
});
test('state pages link only to agency pages that exist', () => {
  const co = html['/census/states/co/'];
  for (const m of co.matchAll(/href="(\/census\/agencies\/[^"]*)"/g)) assert.ok(paths.has(m[1]), `dead link ${m[1]}`);
});
test('a delisted or aggregate document never puts a name on a page', () => {
  // eee1 is listed_aggregate and fff1 delisted: both contribute counts only.
  assert.ok(!allHtml.includes('eee1'), 'aggregate hash leaked');
  assert.ok(!allHtml.includes('fff1'), 'delisted hash leaked');
});

console.log('\nhonest rendering');
test('null renders as "not captured", never blank or 0', () => {
  const ag = html['/census/agencies/denver-health/'];
  assert.ok(ag.includes('not captured'), 'expected "not captured" somewhere');
  assert.ok(!/<td>\s*<\/td>/.test(ag), 'an empty cell means a null rendered as blank');
  assert.ok(!/<td>0<\/td>/.test(ag), 'a null must not render as 0');
});
test('a null standing flag is not rendered as "not standing"', () => {
  assert.ok(!/not standing/i.test(allHtml), 'null standing must not become a negative claim');
});
test('a raw dose is shown as written, not dropped', () => {
  assert.ok(html['/census/agencies/denver-health/'].includes('per medical control'));
  assert.ok(html['/census/drugs/epinephrine/cardiac-arrest/'].includes('per medical control'));
});
test('weight-based and flat doses are summarized separately', () => {
  const p = html['/census/drugs/epinephrine/cardiac-arrest/'];
  assert.ok(p.includes('Pediatric, weight-based') || p.includes('weight-based'), 'expected a weight-based row');
  // The bug this guards: a 0.01 mg/kg peds dose folded into an adult mg median.
  assert.ok(!/median is 0\.505/.test(p), 'per-kg and flat doses were averaged together');
});
test('every page carries the disclaimer', () => {
  for (const [p, h] of Object.entries(html)) {
    assert.ok(h.includes('Not a clinical order'), `${p} missing the disclaimer`);
  }
});
test('a named row carries its source attribution', () => {
  assert.ok(html['/census/agencies/denver-health/'].includes('example.gov/denver-protocols.pdf'), 'source link missing');
});
test('page numbers print where captured and say so where not', () => {
  const p = html['/census/drugs/epinephrine/cardiac-arrest/'];
  assert.ok(p.includes('pages 42, 43'), 'captured pages missing');
  assert.ok(p.includes('page not captured'), 'uncaptured pages must say so');
});
test('the landing page does not promise pages it did not generate', () => {
  const l = html['/census/'];
  assert.ok(l.includes('with a page'), 'landing must report the page count, not only the corpus count');
  assert.ok(/too little published detail/.test(l), 'landing must explain the withheld agencies');
});
test('an outdated agency is flagged', () => {
  assert.ok(html['/census/agencies/boulder-county-ems/'].includes('may be outdated'));
});
test('a pending review is disclosed with its date', () => {
  assert.ok(html['/census/agencies/denver-health/'].includes('2026-06-01'));
  assert.ok(html['/census/agencies/denver-health/'].includes('under review'));
});

console.log('\nSEO_GEO rules');
test('no aggregateRating anywhere', () => assert.ok(!allHtml.includes('aggregateRating')));
test('no meta keywords anywhere', () => assert.ok(!/name="keywords"/.test(allHtml)));
test('no FAQPage or HowTo schema', () => {
  assert.ok(!allHtml.includes('"FAQPage"'));
  assert.ok(!allHtml.includes('"HowTo"'));
});
test('every page has canonical, BreadcrumbList and the Smart App Banner', () => {
  for (const [p, h] of Object.entries(html)) {
    assert.ok(h.includes('rel="canonical"'), `${p} missing canonical`);
    assert.ok(h.includes('"BreadcrumbList"'), `${p} missing BreadcrumbList`);
    assert.ok(h.includes('apple-itunes-app'), `${p} missing Smart App Banner`);
  }
});
test('Dataset JSON-LD is on the landing page only', () => {
  const withDataset = Object.entries(html).filter(([, h]) => h.includes('"Dataset"')).map(([p]) => p);
  assert.deepStrictEqual(withDataset, ['/census/']);
});
test('every JSON-LD block parses', () => {
  for (const [p, h] of Object.entries(html)) {
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      JSON.parse(m[1]);
    }
  }
});
test('GA4 fires on every page', () => {
  for (const [p, h] of Object.entries(html)) assert.ok(h.includes('G-LNSS9BMEP8'), `${p} missing GA4`);
});

console.log('\nescaping');
test('agency names are HTML-escaped', () => {
  const d = data();
  d.agencies = d.agencies.map(x => x.agencyKey === 'denver-health' ? { ...x, name: 'A & B <script>alert(1)</script>' } : x);
  const out = buildPages(d);
  const p = out.files.find(f => f.path === '/census/agencies/denver-health/').html;
  assert.ok(!p.includes('<script>alert(1)</script>'), 'unescaped markup reached the page');
  assert.ok(p.includes('&amp;'), 'ampersand not escaped');
});

console.log('\nsitemaps');
test('sitemap-census lists exactly the generated pages', () => {
  const xml = readFileSync(join(a.out, 'sitemap-census.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>https:\/\/protoquiz\.com([^<]*)<\/loc>/g)].map(m => m[1]).sort();
  const pages = a.files.filter(f => f.path.endsWith('/')).map(f => f.path).sort();
  assert.deepStrictEqual(locs, pages);
});
test('sitemap-index references sitemap.xml and the census sitemap', () => {
  const xml = readFileSync(join(a.out, 'sitemap-index.xml'), 'utf8');
  assert.ok(xml.includes('/sitemap.xml'));
  assert.ok(xml.includes('/sitemap-census.xml'));
});
test('the hand-maintained sitemap.xml is never rewritten', () => {
  assert.ok(!walk(a.out).includes('sitemap.xml'), 'generator must not emit sitemap.xml');
});

console.log('\ncontract');
test('an unknown schemaVersion aborts rather than rendering', () => {
  const dir = tmp();
  for (const f of readdirSync(FIXTURES)) cpSync(join(FIXTURES, f), join(dir, f));
  const d = JSON.parse(readFileSync(join(dir, 'dose_latest.json'), 'utf8'));
  writeFileSync(join(dir, 'dose_latest.json'), JSON.stringify({ ...d, schemaVersion: 99 }));
  assert.throws(() => generate({ dataDir: dir, outDir: tmp() }), /schemaVersion 99/);
  rmSync(dir, { recursive: true, force: true });
});
test('an unreviewed indication map skips drug pages and still builds the rest', () => {
  const d = data();
  d.manifest = { ...d.manifest, indicationMapReviewed: false };
  const out = buildPages(d);
  const ps = out.files.map(f => f.path);
  assert.ok(!ps.some(p => p.startsWith('/census/drugs/')), 'drug pages must be skipped');
  assert.ok(ps.includes('/census/'), 'landing must still build');
  assert.ok(ps.includes('/census/agencies/denver-health/'), 'agency pages must still build');
  assert.ok(ps.includes('/census/states/co/'), 'state pages must still build');
  const landing = out.files.find(f => f.path === '/census/').html;
  assert.ok(!/href="\/census\/drugs\//.test(landing), 'landing must not link to skipped drug pages');
});

console.log('\npage manifest');
test('the manifest hashes every emitted file', () => {
  assert.strictEqual(Object.keys(a.manifest.pages).length, a.files.length);
});
test('an unchanged rebuild produces an identical manifest', () => {
  const b = run();
  assert.deepStrictEqual(a.manifest.pages, b.manifest.pages);
  rmSync(b.out, { recursive: true, force: true });
});
test('a changed page changes only its own hash', () => {
  const d = data();
  d.agencies = d.agencies.map(x => x.agencyKey === 'boulder-county-ems' ? { ...x, name: 'Boulder County EMS Authority' } : x);
  const out = buildPages(d);
  const changed = out.files.filter(f => {
    const prev = a.files.find(x => x.path === f.path);
    return prev && prev.html !== f.html;
  }).map(f => f.path).sort();
  // The agency page, the state page that lists it, and the indication pages
  // that name it — nothing else.
  assert.deepStrictEqual(changed, [
    '/census/agencies/boulder-county-ems/',
    '/census/drugs/epinephrine/cardiac-arrest/',
    '/census/drugs/naloxone/opioid-overdose/',
    '/census/states/co/',
  ], `unexpected change set: ${changed.join(', ')}`);
});

rmSync(a.out, { recursive: true, force: true });
if (process.exitCode) console.error('\nFAILED');
else console.log(`\n${passed} passed`);
