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
import { generate, buildPages, MIN_AGENCY_DRUGS, MIN_INDICATION_ROWS, MIN_SOURCES, ACCEPTED_SCHEMA_VERSIONS, FILE_SETS, MISSING_ROWS_ERROR, pageManifest } from './census-pages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', 'test', 'fixtures', 'census', 'data');
const V3_DATA = join(here, '..', 'test', 'fixtures', 'census', 'data-v3');
const V3_ROWS = join(here, '..', 'test', 'fixtures', 'census', 'rows-v3');

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
test('an agency KEY is escaped everywhere it becomes a URL', () => {
  // The key reaches canonical, og:url, the crumb trail, the state page's links, and
  // the inline form JS. Names were escaped; keys were not, on the assumption that a
  // slug is already safe — which is the assumption every injection starts from.
  const evil = 'dh</script><script>alert(1)</script>';
  const d = data();
  d.agencies = d.agencies.map(x => x.agencyKey === 'denver-health' ? { ...x, agencyKey: evil } : x);
  d.doses = d.doses.map(r => r.agencyKey === 'denver-health' ? { ...r, agencyKey: evil } : r);
  for (const f of buildPages(d).files) {
    assert.ok(!/<script>alert\(1\)<\/script>/.test(f.html), `unescaped agency key reached ${f.path} as markup`);
  }
});
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
// A SET, not a single version. L3 bumped documents.json to 2 (effectiveDateApproximate
// removed, capturedDate + effectiveDateSource + origin added), and this reader must accept
// both while published artifacts are mixed. P4: this lands BEFORE the first v2 build, because
// the abort below is by design — a v2 build published to a v1-only reader takes the census
// offline rather than degrading it.
test('the accepted schema set is exactly {1, 2, 3}', () => {
  assert.ok(ACCEPTED_SCHEMA_VERSIONS instanceof Set, 'must be a Set, not a scalar');
  assert.deepStrictEqual([...ACCEPTED_SCHEMA_VERSIONS].sort(), [1, 2, 3]);
});
test('the v3 file set replaces dose_latest with compare, and never lists pages-manifest', () => {
  assert.deepStrictEqual(FILE_SETS[3].slice().sort(),
    ['agencies.json', 'compare.json', 'documents.json', 'ledger.json', 'manifest.json']);
  assert.ok(!FILE_SETS[3].includes('dose_latest.json'), 'v3 must not read dose_latest.json from --data');
  for (const v of Object.keys(FILE_SETS)) {
    assert.ok(!FILE_SETS[v].includes('pages-manifest.json'),
      `v${v} must exclude pages-manifest.json by name — it is this generator's own output`);
  }
});

// Write one fixture dir per version so both are exercised end to end, not just at the check.
const V2_DOCS = FIXTURES;
const asVersion = (version, patchDoc) => {
  const dir = tmp();
  for (const f of readdirSync(FIXTURES)) cpSync(join(FIXTURES, f), join(dir, f));
  for (const f of ['documents.json', 'agencies.json', 'dose_latest.json', 'ledger.json', 'manifest.json']) {
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    j.schemaVersion = version;
    if (f === 'documents.json' && patchDoc) j.rows = j.rows.map(patchDoc);
    writeFileSync(join(dir, f), JSON.stringify(j));
  }
  return dir;
};

test('a v1 payload still renders (the reader accepts both versions)', () => {
  // v1 rows carry effectiveDateApproximate and NONE of the three new fields.
  const dir = asVersion(1, ({ capturedDate, effectiveDateSource, origin, ...r }) => ({ ...r, effectiveDateApproximate: false }));
  const out = tmp();
  const r = generate({ dataDir: dir, outDir: out });
  assert.ok(r.files.some(f => f.path === '/census/agencies/denver-health/'), 'v1 data must still build agency pages');
  rmSync(dir, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
});
test('a v2 payload renders', () => {
  const dir = asVersion(2);
  const out = tmp();
  const r = generate({ dataDir: dir, outDir: out });
  assert.ok(r.files.some(f => f.path === '/census/agencies/denver-health/'), 'v2 data must build agency pages');
  rmSync(dir, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
});
test('pageManifest stamps the INPUT manifest version, not a constant', () => {
  const m = data().manifest;
  assert.strictEqual(pageManifest(a.files, { ...m, schemaVersion: 1 }).schemaVersion, 1, 'a v1 input stamps 1');
  assert.strictEqual(pageManifest(a.files, { ...m, schemaVersion: 2 }).schemaVersion, 2, 'a v2 input stamps 2');
});

console.log('\ncaptured vs printed dates');
// effectiveDate is what the AGENCY printed; capturedDate only proves the file existed by then.
// Rendering a capture as an effective date is the exact confusion schemaVersion 2 exists to
// end, so the page must say "on or before" and never print a bare date for a captured doc.
const capturedData = () => {
  const d = data();
  d.documents = d.documents.map(r => r.hash === 'aaa1'
    ? { ...r, effectiveDate: null, capturedDate: '2026-03-04', effectiveDateSource: 'captured' }
    : r);
  d.agencies = d.agencies.map(a2 => a2.agencyKey === 'denver-health'
    ? { ...a2, currentEffectiveDate: null }
    : a2);
  return d;
};
test('a captured document renders "on or before <capturedDate>"', () => {
  const p = buildPages(capturedData()).files.find(f => f.path === '/census/agencies/denver-health/').html;
  assert.ok(p.includes('on or before 2026-03-04'), 'expected the on-or-before wording with the capture date');
});
test('a captured date is never printed as an effective date', () => {
  const p = buildPages(capturedData()).files.find(f => f.path === '/census/agencies/denver-health/').html;
  assert.ok(!/effective\s+2026-03-04/i.test(p), 'the capture date must not be labelled "effective"');
});
test('a printed date still renders as effective, unchanged', () => {
  const p = html['/census/agencies/denver-health/'];
  assert.ok(/effective 2026-01-15/.test(p), 'a printed date must keep the plain effective wording');
  assert.ok(!p.includes('on or before'), 'a printed date must NOT get the on-or-before hedge');
});
test('a document with no date at all still says "not captured", never a hedge', () => {
  const d = data();
  d.documents = d.documents.map(r => r.hash === 'aaa1' ? { ...r, effectiveDate: null, capturedDate: null, effectiveDateSource: 'none' } : r);
  d.agencies = d.agencies.map(a2 => a2.agencyKey === 'denver-health' ? { ...a2, currentEffectiveDate: null } : a2);
  const p = buildPages(d).files.find(f => f.path === '/census/agencies/denver-health/').html;
  assert.ok(!p.includes('on or before'), 'no capture means no on-or-before claim');
  assert.ok(p.includes('not captured'), 'an absent date reads as not captured');
});
test('a v1 row with no effectiveDateSource is treated as printed', () => {
  // Back-compat: absent source + a date means printed; absent source + no date means none.
  const d = data();
  d.documents = d.documents.map(({ effectiveDateSource, capturedDate, ...r }) => r);
  const p = buildPages(d).files.find(f => f.path === '/census/agencies/denver-health/').html;
  assert.ok(!p.includes('on or before'), 'a v1 row must not be hedged as captured');
  assert.ok(/effective 2026-01-15/.test(p), 'a v1 row keeps its effective date');
});

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

// ------------------------------------------------------------------ contract v3
//
// v3 is the "rows private, summaries public" split. The tests below are the site
// half of that contract: what the generator must read, what it must refuse, and
// which pages may never touch the private rows.

console.log('\ncontract v3');

const v3data = () => ({
  documents: JSON.parse(readFileSync(join(V3_DATA, 'documents.json'), 'utf8')).rows,
  agencies: JSON.parse(readFileSync(join(V3_DATA, 'agencies.json'), 'utf8')).rows,
  compare: JSON.parse(readFileSync(join(V3_DATA, 'compare.json'), 'utf8')),
  ledger: JSON.parse(readFileSync(join(V3_DATA, 'ledger.json'), 'utf8')).rows,
  manifest: JSON.parse(readFileSync(join(V3_DATA, 'manifest.json'), 'utf8')),
  doses: JSON.parse(readFileSync(join(V3_ROWS, 'rows_private.json'), 'utf8')).rows,
});

const v3 = (() => {
  const out = tmp();
  return { out, ...generate({ dataDir: V3_DATA, rowsDir: V3_ROWS, outDir: out }) };
})();
const v3paths = new Set(v3.files.map(f => f.path));
const v3html = Object.fromEntries(v3.files.filter(f => f.path.endsWith('/')).map(f => [f.path, f.html]));
const v3all = Object.values(v3html).join('\n');

test('a v3 set renders the full page tree', () => {
  for (const p of ['/census/', '/census/methodology/', '/census/data-license/',
    '/census/agencies/denver-health/', '/census/states/co/',
    '/census/drugs/epinephrine/', '/census/drugs/epinephrine/cardiac-arrest/']) {
    assert.ok(v3paths.has(p), `${p} missing from a v3 build`);
  }
});
test('a v3 build is byte-identical across two runs', () => {
  const out2 = tmp();
  const b = generate({ dataDir: V3_DATA, rowsDir: V3_ROWS, outDir: out2 });
  assert.deepStrictEqual(v3.files.map(f => f.path), b.files.map(f => f.path));
  for (let i = 0; i < v3.files.length; i++) {
    assert.strictEqual(v3.files[i].html, b.files[i].html, `${v3.files[i].path} differs between runs`);
  }
  rmSync(out2, { recursive: true, force: true });
});
test('a v3 build does not depend on input row order', () => {
  const d = v3data();
  const shuffled = {
    ...d,
    documents: [...d.documents].reverse(),
    agencies: [...d.agencies].reverse(),
    doses: [...d.doses].reverse(),
    ledger: [...d.ledger].reverse(),
    compare: { ...d.compare, groups: [...d.compare.groups].reverse(), drugs: [...d.compare.drugs].reverse() },
  };
  const x = buildPages(d), y = buildPages(shuffled);
  assert.deepStrictEqual(x.files.map(f => f.path), y.files.map(f => f.path), 'path list differs');
  for (let i = 0; i < x.files.length; i++) {
    assert.strictEqual(x.files[i].html, y.files[i].html, `${x.files[i].path} differs after reordering input`);
  }
});
test('missing --rows on v3 aborts with the NAMED error, not an ENOENT', () => {
  assert.throws(() => generate({ dataDir: V3_DATA, outDir: tmp() }), e => {
    assert.strictEqual(e.message, MISSING_ROWS_ERROR, 'the abort must be the named error');
    return true;
  });
});
test('a --rows dir with no rows_private.json aborts with the same named error', () => {
  const empty = tmp();
  assert.throws(() => generate({ dataDir: V3_DATA, rowsDir: empty, outDir: tmp() }),
    new RegExp(MISSING_ROWS_ERROR.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  rmSync(empty, { recursive: true, force: true });
});
test('a stale dose_latest.json in --data aborts a v3 build', () => {
  // The build deletes strays; a survivor means the rows are sitting in the site tree,
  // which is the exact thing v3 exists to prevent. Publishing it is worse than failing.
  const dir = tmp();
  for (const f of readdirSync(V3_DATA)) cpSync(join(V3_DATA, f), join(dir, f));
  writeFileSync(join(dir, 'dose_latest.json'), JSON.stringify({ schemaVersion: 3, rows: [] }));
  assert.throws(() => generate({ dataDir: dir, rowsDir: V3_ROWS, outDir: tmp() }), /dose_latest\.json is still in --data/);
  rmSync(dir, { recursive: true, force: true });
});
test('a mixed-version set aborts rather than rendering two contracts as one', () => {
  const dir = tmp();
  for (const f of readdirSync(V3_DATA)) cpSync(join(V3_DATA, f), join(dir, f));
  const docs = JSON.parse(readFileSync(join(dir, 'documents.json'), 'utf8'));
  writeFileSync(join(dir, 'documents.json'), JSON.stringify({ ...docs, schemaVersion: 2 }));
  assert.throws(() => generate({ dataDir: dir, rowsDir: V3_ROWS, outDir: tmp() }), /must share one version, not a mix/);
  rmSync(dir, { recursive: true, force: true });
});
test('a rows_private.json on the wrong version aborts too', () => {
  const dir = tmp();
  const rows = JSON.parse(readFileSync(join(V3_ROWS, 'rows_private.json'), 'utf8'));
  writeFileSync(join(dir, 'rows_private.json'), JSON.stringify({ ...rows, schemaVersion: 2 }));
  assert.throws(() => generate({ dataDir: V3_DATA, rowsDir: dir, outDir: tmp() }), /must share one version, not a mix/);
  rmSync(dir, { recursive: true, force: true });
});
test('an unknown schemaVersion still aborts at v3', () => {
  const dir = tmp();
  for (const f of readdirSync(V3_DATA)) cpSync(join(V3_DATA, f), join(dir, f));
  const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ ...m, schemaVersion: 99 }));
  assert.throws(() => generate({ dataDir: dir, rowsDir: V3_ROWS, outDir: tmp() }), /schemaVersion 99/);
  rmSync(dir, { recursive: true, force: true });
});

console.log('\nv3: rows stay private');
// THE load-bearing rule of v3. Agency pages are the public record for that agency and
// keep their tables; a drug or indication page must never carry a value attributable to
// one agency, because a cross-agency row table IS the private row file as markup.
const v3AgencyPages = Object.entries(v3html).filter(([p]) => p.startsWith('/census/agencies/'));
const v3CompareePages = Object.entries(v3html).filter(([p]) => p.startsWith('/census/drugs/'));

test('drug and indication pages carry no per-agency dose value', () => {
  const rows = v3data().doses.filter(r => r.agencyKey && r.value != null);
  for (const [p, h] of v3CompareePages) {
    // The tell is a row: an agency link in the same table row as a dose value.
    assert.ok(!/<td>[^<]*<a href="\/census\/agencies\/[^"]*"[\s\S]{0,400}?<\/tr>/.test(h),
      `${p} puts an agency link in a row with values — that is the row file as markup`);
    // And no raw dose string from the private rows may appear at all.
    for (const r of rows) {
      if (r.doseRaw && r.doseRaw.length > 6) {
        assert.ok(!h.includes(r.doseRaw), `${p} contains the raw dose string "${r.doseRaw}" from the private rows`);
      }
    }
  }
});
test('drug and indication pages name agencies without a value beside the name', () => {
  const ind = v3html['/census/drugs/epinephrine/cardiac-arrest/'];
  assert.ok(ind.includes('Denver Health Paramedic Division'), 'a named agency must still be named');
  assert.ok(ind.includes('href="/census/agencies/denver-health/"'), 'the name must link to its own page');
  assert.ok(ind.includes('this list carries no values'), 'the page must say the list carries no values');
});
test('an agency named on a compare page always has a page to link to', () => {
  for (const [p, h] of v3CompareePages) {
    for (const m of h.matchAll(/href="(\/census\/agencies\/[^"]*)"/g)) {
      assert.ok(v3paths.has(m[1]), `${p} links to ${m[1]}, which was not generated`);
    }
  }
  // king-county-medic is in compare.json's agencyKeys but is under MIN_AGENCY_DRUGS,
  // so it must be filtered out of every named list rather than linked into a 404.
  assert.ok(!v3all.includes('/census/agencies/king-county-medic/'), 'a pageless agency must not be linked');
  assert.ok(!v3all.includes('King County Medic One'), 'a pageless agency must not be named');
});
test('agency pages DO keep their per-agency dose tables', () => {
  const dh = v3html['/census/agencies/denver-health/'];
  assert.ok(dh.includes('per medical control'), 'a raw dose must still show on the agency page');
  assert.ok(/<th>Dose<\/th>/.test(dh), 'the agency dose table must survive v3');
  assert.ok(dh.includes('pages 42, 43'), 'source pages must still print on the agency page');
});
test('every internal /census/ link resolves in a v3 build', () => {
  const linked = new Set([...v3all.matchAll(/href="(\/census\/[^"]*)"/g)].map(m => m[1]));
  for (const l of linked) assert.ok(v3paths.has(l), `dead link: ${l}`);
});

console.log('\nv3: compare-driven pages');
test('the five-number bar replaces the per-row histogram and per-row median', () => {
  const ind = v3html['/census/drugs/epinephrine/cardiac-arrest/'];
  assert.ok(ind.includes('five-track'), 'expected the five-number bar');
  assert.ok(/<th>min<\/th><th>p25<\/th><th>median<\/th><th>p75<\/th><th>max<\/th>/.test(ind), 'expected min-p25-median-p75-max');
  assert.ok(!ind.includes('class="hist"'), 'the per-row histogram must be gone at v3');
  assert.ok(!ind.includes('<h2>Median and range</h2>'), 'the per-row median/lo/hi table must be gone at v3');
});
test('the cross-agency #agencies ROW TABLE is gone; a name list took its place', () => {
  const ind = v3html['/census/drugs/epinephrine/cardiac-arrest/'];
  assert.ok(!/<th>Agency<\/th><th>Population<\/th><th>Dose<\/th>/.test(ind), 'the cross-agency row table must be removed');
  assert.ok(ind.includes('<h2>Named agencies</h2>'), 'the named-agency list must remain');
});
test('an indication page prints sources, named agencies and states', () => {
  const ind = v3html['/census/drugs/epinephrine/cardiac-arrest/'];
  for (const label of ['sources', 'named agencies', 'states']) {
    assert.ok(ind.includes(`>${label}<`), `missing the "${label}" stat`);
  }
});
test('an indication page prints route shares from the engine', () => {
  assert.ok(v3html['/census/drugs/epinephrine/cardiac-arrest/'].includes('<h3>Routes</h3>'), 'expected route shares');
});
test('"n rows under review" comes from manifest.flaggedRows', () => {
  const m = v3data().manifest;
  assert.ok(m.flaggedRows > 0, 'the fixture must exercise a non-zero review queue');
  for (const p of ['/census/drugs/epinephrine/', '/census/drugs/epinephrine/cardiac-arrest/']) {
    assert.ok(v3html[p].includes(`${m.flaggedRows} rows are under review`)
      || v3html[p].includes(`${m.flaggedRows} row is under review`), `${p} must print the review count`);
  }
});
test(`a group under ${MIN_SOURCES} sources publishes no distribution and no page`, () => {
  // HYPOTENSION_PUSH_DOSE has 2 sources in the fixture.
  assert.ok(!v3paths.has('/census/drugs/epinephrine/hypotension-push-dose/'), 'a thin group must get no indication page');
  const drug = v3html['/census/drugs/epinephrine/'];
  assert.ok(/Hypotension Push Dose <span class="muted">n=2<\/span>/.test(drug), 'a thin group still shows its count on the drug page');
  assert.ok(!/href="[^"]*hypotension-push-dose[^"]*"/.test(drug), 'a thin group must not be linked');
});
test('a drug page reports the rollup, not a sum of its groups', () => {
  const d = v3data();
  const epi = d.compare.drugs.find(x => x.drugKey === 'EPINEPHRINE');
  const groupSourceSum = d.compare.groups.filter(g => g.key.drugKey === 'EPINEPHRINE')
    .reduce((s, g) => s + g.n.sources, 0);
  assert.ok(groupSourceSum > epi.n.sources, 'the fixture must have an agency in more than one group');
  const h = v3html['/census/drugs/epinephrine/'];
  assert.ok(h.includes(`<span class="v">${epi.n.sources}</span><span class="l">protocols</span>`),
    'the drug page must print the rollup source count');
  assert.ok(!h.includes(`<span class="v">${groupSourceSum}</span><span class="l">protocols</span>`),
    'the drug page must not double-count an agency across groups');
});
test('shape-B pediatric rows never move a published number', () => {
  const d = v3data();
  const shapeB = d.doses.filter(r => r.population === 'peds' && r.doseShape === 'indicationDoses');
  assert.ok(shapeB.length > 0, 'the fixture must contain a shape-B peds row');
  const peds = d.compare.groups.find(g => g.key.drugKey === 'EPINEPHRINE' && g.key.population === 'peds');
  assert.ok(peds.dist.max < 0.5, 'a dropped shape-B row must not appear in the distribution');
  assert.ok(!peds.agencyKeys.includes('king-county-medic'), 'a dropped shape-B row must not name its agency');
});

console.log('\nv3: code-review fixes');

// Finding 1: an indication page's sources/agencies/states totals must be the UNION
// across a drug's (population, unit) groups, not a Math.max — a max silently
// understates whenever two groups have disjoint sets.
test('an indication page totals sources/agencies/states as a union, not a max, across disjoint groups', () => {
  const d = v3data();
  const template = d.compare.groups.find(g => g.key.drugKey === 'EPINEPHRINE' && g.key.indicationKey === 'CARDIAC_ARREST' && g.key.population === 'adult');
  // Five adult-only agencies/sources/states and five entirely disjoint peds-only
  // ones: Math.max reads 5, the true union is 10 — the exact case the finding names.
  const adultOnly = { ...template, key: { ...template.key, population: 'adult' },
    n: { ...template.n, sources: 5, agencies: 5, states: 5 },
    agencyKeys: ['a1', 'a2', 'a3', 'a4', 'a5'], sourceKeys: ['a1', 'a2', 'a3', 'a4', 'a5'], states: ['AA', 'BB', 'CC', 'DD', 'EE'],
    dist: null };
  const pedsOnly = { ...template, key: { ...template.key, population: 'peds', perKg: true },
    n: { ...template.n, sources: 5, agencies: 5, states: 5 },
    agencyKeys: ['p1', 'p2', 'p3', 'p4', 'p5'], sourceKeys: ['p1', 'p2', 'p3', 'p4', 'p5'], states: ['FF', 'GG', 'HH', 'II', 'JJ'],
    dist: null };
  d.compare.groups = d.compare.groups
    .filter(g => !(g.key.drugKey === 'EPINEPHRINE' && g.key.indicationKey === 'CARDIAC_ARREST'))
    .concat([adultOnly, pedsOnly]);
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/cardiac-arrest/').html;
  assert.ok(h.includes('<span class="v">10</span><span class="l">sources</span>'), 'sources must be the 10-way union, not a 5-way max');
  assert.ok(h.includes('<span class="v">10</span><span class="l">states</span>'), 'states must be the 10-way union, not a 5-way max');
  assert.ok(h.includes('<span class="v">10</span><span class="l">named agencies</span>'), 'named agencies must be the 10-way union (agencyKeys was already unioned)');
});
test('when sourceKeys/states are absent (an older compare.json), the totals render as an explicit floor, never a max labelled a total', () => {
  const d = v3data();
  d.compare.groups = d.compare.groups.map(g => {
    if (g.key.drugKey !== 'EPINEPHRINE' || g.key.indicationKey !== 'CARDIAC_ARREST') return g;
    const { sourceKeys, states, ...rest } = g;
    return rest;
  });
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/cardiac-arrest/').html;
  assert.ok(/at least \d+<\/span><span class="l">sources<\/span>/.test(h), 'sources must render as "at least N" when sourceKeys is absent');
  assert.ok(/at least \d+<\/span><span class="l">states<\/span>/.test(h), 'states must render as "at least N" when states is absent');
});

// Finding 2: route shares must be sorted by share desc then route name at read time,
// not trusted from file order — matching the sibling sort at indication summaries.
test('route shares render sorted by share desc then route name, regardless of file order', () => {
  const d = v3data();
  const g = d.compare.groups.find(x => x.key.drugKey === 'EPINEPHRINE' && x.key.indicationKey === 'CARDIAC_ARREST' && x.key.population === 'adult');
  g.routes = [
    { route: 'IM', share: 0.2 },
    { route: 'IO', share: 0.5 },
    { route: 'IV', share: 0.5 },
  ];
  const forward = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/cardiac-arrest/').html;
  const reversed = { ...d, compare: { ...d.compare, groups: d.compare.groups.map(x => x === g ? { ...g, routes: [...g.routes].reverse() } : x) } };
  const backward = buildPages(reversed).files.find(f => f.path === '/census/drugs/epinephrine/cardiac-arrest/').html;
  assert.strictEqual(forward, backward, 'reversing the routes array in the input must not change the rendered page');
  const ioIdx = forward.indexOf('>IO '), ivIdx = forward.indexOf('>IV '), imIdx = forward.indexOf('>IM ');
  assert.ok(ioIdx > -1 && ivIdx > -1 && imIdx > -1, 'all three routes must render');
  assert.ok(ioIdx < imIdx && ivIdx < imIdx, 'the two 50% routes (IO, IV) must both sort before the 20% route (IM)');
  assert.ok(ioIdx < ivIdx, 'tied shares break by route name: IO before IV');
});

// Finding 3: "machine-parsed" must use the real numerator (n.parsed) when the build
// supplies it, never reconstruct one from the float parsedShare — a reconstructed
// numerator (Math.round(parsedShare * rows)) can disagree with the true count.
test('drug page machine-parsed uses the real numerator n.parsed when present, even when it disagrees with a reconstruction from parsedShare', () => {
  const d = v3data();
  d.compare.drugs = d.compare.drugs.map(x => x.drugKey === 'EPINEPHRINE'
    // A stale/rounded parsedShare that would reconstruct to a DIFFERENT numerator
    // (round(0.5 * 16) = 8) than the true n.parsed (15) — the true one must win.
    ? { ...x, n: { ...x.n, parsed: 15, rows: 16 }, parsedShare: 0.5 }
    : x);
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/').html;
  assert.ok(h.includes('<span class="v">94% of 16</span><span class="l">machine-parsed</span>'), 'expected the true n.parsed/n.rows ratio (94%), not the stale parsedShare (50%)');
  assert.ok(!h.includes('50% of 16'), 'must not render the fabricated reconstruction from parsedShare');
});
test('drug page machine-parsed falls back to the bare share, with no fabricated numerator, when n.parsed is absent', () => {
  const d = v3data();
  d.compare.drugs = d.compare.drugs.map(x => {
    if (x.drugKey !== 'EPINEPHRINE') return x;
    const { n: { parsed, ...n }, ...rest } = x;
    return { ...rest, n };
  });
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/').html;
  const epi = d.compare.drugs.find(x => x.drugKey === 'EPINEPHRINE');
  const pct = Math.round(epi.parsedShare * 100);
  assert.ok(h.includes(`<span class="v">${pct}%</span><span class="l">machine-parsed</span>`), 'must render the bare percentage with no numerator claimed');
  assert.ok(!new RegExp(`\\d+ of \\d+</span><span class="l">machine-parsed`).test(h), 'must not fabricate a numerator from the float share');
});

// Finding 4: a raw-only indication (in drugs[].indications, absent from groups) must
// be labelled distinctly — its n= counts "sources with rows", not "sources in a
// comparable group" like every sibling on the list.
test('a raw-only indication is labelled distinctly on the drug page', () => {
  const d = v3data();
  const epi = d.compare.drugs.find(x => x.drugKey === 'EPINEPHRINE');
  epi.indications = [...epi.indications, { indicationKey: 'RAW_ONLY_INDICATION', sources: 2 }];
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/').html;
  assert.ok(h.includes('Raw Only Indication'), 'the raw-only indication must still be listed');
  assert.ok(/Raw Only Indication <span class="muted">n=2, raw only<\/span>/.test(h), 'a raw-only indication must be labelled distinctly from a comparable-group n=');
  // Its siblings (present in groups) must NOT carry the raw-only label.
  assert.ok(/Cardiac Arrest <span class="muted">n=7<\/span>/.test(h), 'a sibling backed by a comparable group must keep the plain n= label');
  assert.ok(!/Cardiac Arrest <span class="muted">n=7, raw only<\/span>/.test(h), 'a comparable-group indication must not be mislabelled raw only');
});

// Finding 5: two keys that slug identically must abort the build, not silently let
// the second write win.
test('two keys that slug identically abort the build with an operator-legible sentence', () => {
  const d = v3data();
  d.compare.drugs = d.compare.drugs.map(x => x.drugKey === 'NALOXONE' ? { ...x, drugKey: 'CARDIAC-ARREST' } : x);
  d.compare.groups = d.compare.groups.map(g => g.key.drugKey === 'NALOXONE'
    ? { ...g, key: { ...g.key, drugKey: 'CARDIAC-ARREST' } } : g);
  // Collide it against the existing EPINEPHRINE/CARDIAC_ARREST indication page path:
  // both CARDIAC-ARREST (as a drug) and CARDIAC_ARREST (as an indication under
  // EPINEPHRINE) must never collide directly, so instead collide two DRUG pages —
  // give AMIODARONE the same slug as the renamed NALOXONE-turned-CARDIAC-ARREST.
  d.compare.drugs = d.compare.drugs.map(x => x.drugKey === 'AMIODARONE' ? { ...x, drugKey: 'CARDIAC_ARREST' } : x);
  d.compare.groups = d.compare.groups.map(g => g.key.drugKey === 'AMIODARONE'
    ? { ...g, key: { ...g.key, drugKey: 'CARDIAC_ARREST' } } : g);
  assert.throws(() => buildPages(d), e => {
    assert.match(e.message, /same page path/, 'must name the collision, not throw an unrelated error');
    assert.match(e.message, /\/census\/drugs\/cardiac-arrest\//, 'must name the colliding path');
    return true;
  });
});

// Finding 6: the drug page's "named agencies" stat counts every agency, while the
// list below shows only agencies with a page — when they differ, say so. The
// baseline v3 fixture already exercises this: king-county-medic sits in
// compare.json's agencyKeys for EPINEPHRINE but is under MIN_AGENCY_DRUGS, so it
// is counted in summary.n.agencies (6) but absent from the linked named-agency
// list (5) — the same shape the landing page's "with a page" vs "named agencies"
// split already discloses.
test('a drug page states the withheld-agency count when it differs from the named-agencies list', () => {
  const h = v3html['/census/drugs/epinephrine/'];
  assert.ok(!h.includes('King County Medic One'), 'a pageless agency must never be named');
  assert.ok(/1 named agency has too little published detail for a page of its own and is counted here only\./.test(h),
    'the drug page must state the withheld count using the landing sentence, when it differs from the named list');
});
test('a drug page states nothing extra when every named agency in a group already has a page', () => {
  const d = v3data();
  // Drop the one pageless agency (king-county-medic) out of every EPINEPHRINE
  // group's agencyKeys, so the withheld set is genuinely empty — the sentence must
  // key off group membership, not off n.agencies matching named.count (n.agencies
  // is a drug-wide, raw-included rollup and must never gate this sentence).
  d.compare.groups = d.compare.groups.map(g => g.key.drugKey === 'EPINEPHRINE'
    ? { ...g, agencyKeys: (g.agencyKeys ?? []).filter(k => k !== 'king-county-medic') }
    : g);
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/').html;
  assert.ok(!/too little published detail for a page of its own/.test(h), 'no withheld sentence when no group holds a pageless agency');
});

// Regression: drugs[].n.agencies counts every agency with a row for the drug,
// raw-only rows included, while a group's agencyKeys only ever holds agencies in
// a comparable (parsed) group. An agency that has its own page (it clears
// MIN_AGENCY_DRUGS on other drugs) but whose EPINEPHRINE rows are all raw is
// counted in n.agencies and has no page of its own for THIS drug, yet is absent
// from every EPINEPHRINE group's agencyKeys — so the old
// `n.agencies - named.count` arithmetic folded it into the withheld count and
// the page falsely claimed it "has too little published detail for a page of
// its own" (travis-county-ems has a page; it links right below the sentence).
test('a raw-only agency with its own page does not inflate the withheld-agency count', () => {
  const d = v3data();
  // Drop travis-county-ems from every EPINEPHRINE group (raw-only for this drug),
  // but count it in the drug-wide rollup, the way an all-raw agency really would be.
  d.compare.groups = d.compare.groups.map(g => g.key.drugKey === 'EPINEPHRINE'
    ? { ...g, agencyKeys: (g.agencyKeys ?? []).filter(k => k !== 'travis-county-ems') }
    : g);
  d.compare.drugs = d.compare.drugs.map(x => x.drugKey === 'EPINEPHRINE' ? { ...x, n: { ...x.n, agencies: x.n.agencies + 1 } } : x);
  const h = buildPages(d).files.find(f => f.path === '/census/drugs/epinephrine/').html;
  // travis-county-ems keeps its own page (unaffected drugs still clear MIN_AGENCY_DRUGS)
  // and must not be swept into the withheld sentence.
  assert.ok(!/2 named agencies have too little published detail/.test(h),
    'a pageful agency that is merely raw-only for this drug must not inflate the withheld count');
  // The genuinely pageless one (king-county-medic) must still trigger the sentence.
  assert.ok(/1 named agency has too little published detail for a page of its own and is counted here only\./.test(h),
    'a genuinely pageless agency must still trigger the withheld sentence');
});

console.log('\nv3: coverage map data (spec 8)');
// coverage is optional on an agencies.json row: `{hasProtocol, jurisdiction}`.
// The v3 fixture carries it on CO agencies only (mixed true/false) and omits it
// on TX/WA, so both the split-rendering and the byte-identical-fallback paths
// are exercised from the same build.
const coState = v3html['/census/states/co/'];
const txState = v3html['/census/states/tx/'];
const coLanding = v3html['/census/'];

test('a state page with coverage splits named agencies with/without a current protocol', () => {
  assert.ok(coState.includes('With a current protocol'), 'missing the "with" heading');
  assert.ok(coState.includes('Without a current protocol'), 'missing the "without" heading');
  const withIdx = coState.indexOf('With a current protocol');
  const withoutIdx = coState.indexOf('Without a current protocol');
  const dhIdx = coState.indexOf('Denver Health Paramedic Division');
  const bcIdx = coState.indexOf('Boulder County EMS');
  const afIdx = coState.indexOf('Aurora Fire Rescue');
  const jcIdx = coState.indexOf('Jefferson County EMS');
  // denver-health and boulder-county-ems carry hasProtocol:true in the fixture.
  assert.ok(dhIdx > withIdx && dhIdx < withoutIdx, 'Denver Health must be in the WITH list');
  assert.ok(bcIdx > withIdx && bcIdx < withoutIdx, 'Boulder County EMS must be in the WITH list');
  // aurora-fire-rescue and jeffco-ems carry hasProtocol:false.
  assert.ok(afIdx > withoutIdx, 'Aurora Fire Rescue must be in the WITHOUT list');
  assert.ok(jcIdx > withoutIdx, 'Jefferson County EMS must be in the WITHOUT list');
});
test('a statewide baseline document is listed separately and never counted as agency coverage', () => {
  assert.ok(coState.includes('Statewide baseline'), 'missing the statewide baseline section');
  assert.ok(coState.includes('Colorado Statewide EMS Protocols'), 'the statewide document must be named');
  // It must sit in its own section, not inside either coverage list.
  const baselineIdx = coState.indexOf('Statewide baseline');
  const agenciesIdx = coState.indexOf('<section id="agencies">');
  assert.ok(baselineIdx > agenciesIdx, 'the baseline section must follow the agencies section');
  const agenciesSection = coState.slice(agenciesIdx, baselineIdx);
  assert.ok(!agenciesSection.includes('Colorado Statewide EMS Protocols'), 'the statewide doc must not appear inside the agency split');
});
test('a state page with no coverage on any of its agencies renders the plain unsplit list, unchanged', () => {
  assert.ok(!txState.includes('With a current protocol'), 'TX must not render the coverage split');
  assert.ok(!txState.includes('Without a current protocol'), 'TX must not render the coverage split');
  assert.ok(!txState.includes('Statewide baseline'), 'TX has no statewide document and must not render that section');
  assert.ok(txState.includes('Travis County EMS'), 'the plain list must still name its agency');
  assert.ok(/<ul class="cols"><li><a href="\/census\/agencies\/travis-county-ems\/"/.test(txState), 'TX must render the single plain list, byte-identical in shape to a v2/no-coverage build');
});
test('the landing page prints a per-state coverage table only when at least one agency row carries coverage', () => {
  assert.ok(coLanding.includes('<th>State</th><th>With a protocol</th><th>Without</th><th>Statewide baseline</th>'), 'missing the coverage table header');
  // CO: 2 with, 2 without (denver-health, boulder-county-ems / aurora-fire-rescue, jeffco-ems), statewide yes.
  assert.ok(/<td><a href="\/census\/states\/co\/">Colorado<\/a><\/td><td>2<\/td><td>2<\/td><td>Yes<\/td>/.test(coLanding),
    'CO row must read 2 with / 2 without / statewide Yes');
  // TX and WA carry no coverage on any agency, so they read 0/0 and are still listed
  // (coverage is per-state math from linkableAgencies, not an opt-out per state) —
  // but must never claim a statewide baseline they don't have.
  assert.ok(/<td><a href="\/census\/states\/tx\/">Texas<\/a><\/td><td>0<\/td><td>0<\/td><td>No<\/td>/.test(coLanding),
    'TX row must read 0/0/No, never fabricated counts');
});
test('a v3 build with coverage on NO agency omits the landing table entirely, and a v2 build never renders it', () => {
  const d = v3data();
  d.agencies = d.agencies.map(a => { const { coverage, ...rest } = a; return rest; });
  const out = buildPages(d);
  const landing = out.files.find(f => f.path === '/census/').html;
  assert.ok(!landing.includes('<th>State</th><th>With a protocol</th>'), 'no agency carries coverage, so no table may render');
  assert.ok(!html['/census/'].includes('<th>State</th><th>With a protocol</th>'), 'a v2 build must never render the coverage table');
});
test('an agency in a coverage state with no coverage of its own is never fabricated into with/without', () => {
  // A mixed-rollout state: some agencies migrated to carrying `coverage`, one has
  // not yet. That one must land in "Not yet assessed", never silently counted as
  // "without a current protocol" — a missing fact is not a negative fact.
  const d = v3data();
  d.agencies = d.agencies.map(a => a.agencyKey === 'jeffco-ems' ? (() => { const { coverage, ...rest } = a; return rest; })() : a);
  const out = buildPages(d);
  const co = out.files.find(f => f.path === '/census/states/co/').html;
  assert.ok(co.includes('Not yet assessed'), 'missing the "not yet assessed" bucket');
  const unknownIdx = co.indexOf('Not yet assessed');
  const withoutIdx = co.indexOf('Without a current protocol');
  const jcIdx = co.indexOf('Jefferson County EMS');
  assert.ok(jcIdx > unknownIdx, 'jeffco-ems must appear in the "not yet assessed" bucket');
  const withoutSection = co.slice(withoutIdx, unknownIdx);
  assert.ok(!withoutSection.includes('Jefferson County EMS'), 'jeffco-ems must not be counted as "without" merely for lacking coverage data');
});
test('a coverage-free rebuild of every CO state page matches the no-coverage fixture format exactly', () => {
  // Strip coverage from the v3 fixture entirely and confirm the state page falls back
  // to the exact plain-list markup a v2/no-coverage build already produces — the
  // contract says "render exactly as today", not "render something similar".
  const d = v3data();
  d.agencies = d.agencies.map(a => { const { coverage, ...rest } = a; return rest; });
  const out = buildPages(d);
  const co = out.files.find(f => f.path === '/census/states/co/').html;
  assert.ok(!co.includes('With a current protocol'), 'stripped-coverage CO must not split');
  assert.ok(!co.includes('Statewide baseline'), 'stripped-coverage CO must not show the baseline section');
  assert.ok(/<section id="agencies">\s*<h2>Agencies<\/h2>\s*<ul class="cols">/.test(co), 'must fall back to the exact plain-list shape');
});

console.log('\nmethodology page');
const methodology = v3html['/census/methodology/'];
test('the methodology page is generated and linked from the landing and the footer', () => {
  assert.ok(v3paths.has('/census/methodology/'));
  assert.ok(v3html['/census/'].includes('href="/census/methodology/"'), 'landing must link to it');
  for (const [p, h] of Object.entries(v3html)) {
    assert.ok(h.includes('<a href="/census/methodology/">Methodology</a>'), `${p} footer missing the methodology link`);
  }
});
test('the methodology page publishes NO accuracy number and says so', () => {
  assert.ok(/do not publish a dose-level accuracy number/.test(methodology), 'it must say no accuracy number is published');
  assert.ok(!/95\.4|accuracy of \d|\d+% accurate|accuracy rate/i.test(methodology), 'no accuracy figure may appear');
});
test('every number on the methodology page matches a manifest value', () => {
  const m = v3data().manifest;
  // Every integer the page prints must be a manifest count, a percentage of two of
  // them, a threshold the generator exports, or part of the as-of date. A hand-typed
  // figure — the way a methodology page rots — fails here rather than shipping.
  const counts = new Set(Object.values(m).filter(v => typeof v === 'number').map(String));
  const pcts = new Set();
  for (const a of Object.values(m)) {
    for (const b of Object.values(m)) {
      if (typeof a === 'number' && typeof b === 'number' && b) pcts.add(String(Math.round((a / b) * 100)));
    }
  }
  const allowed = new Set([...counts, ...pcts, String(MIN_SOURCES),
    '24', // the 24-month freshness rule, a stated policy not a count
    '3', // "three times that median" — the outlier ratio, a stated rule
    '6', // the six origin values, enumerated in the same sentence
    '4', // "four" is not printed as a digit; kept for the date parts below
  ]);
  // <main> only: the chrome carries a copyright year, an app id and a GA id, none of
  // which are claims about the data.
  const main = methodology.slice(methodology.indexOf('<main>'), methodology.indexOf('</main>'));
  const text = main.replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(new RegExp(m.asOf, 'g'), ' ') // the as-of date, printed as a date
    .replace(/0\.3|0\.5|0\.01|1 mg|300 mcg|4\.0/g, ' '); // worked dose examples in the units + range rules
  for (const digits of text.match(/\d[\d,]*/g) || []) {
    const n = digits.replace(/,/g, '');
    assert.ok(allowed.has(n), `the methodology page prints "${digits}", which is not a manifest value`);
  }
});
test('the methodology page states the range rule, the parse rule, and the source-vs-agency split', () => {
  assert.ok(/range contributes its low end only/i.test(methodology), 'missing the range rule');
  assert.ok(/raw entry never enters a distribution/i.test(methodology), 'missing the raw-row rule');
  assert.ok(/Sources and named agencies are two different counts/i.test(methodology), 'missing the source/agency split');
  assert.ok(/canonicaliz/i.test(methodology), 'missing unit canonicalization');
  assert.ok(/origin/i.test(methodology), 'missing the origin enum');
  assert.ok(/hash of its contents/i.test(methodology), 'missing hash identity');
  assert.ok(/pending review/i.test(methodology), 'missing pending_review reasons');
  assert.ok(/one pass with no feedback/i.test(methodology), 'missing the single-pass outlier rule');
  assert.ok(/comes down the same day/i.test(methodology), 'missing the correction path');
  assert.ok(/refuses to publish when the number of named agencies drops/i.test(methodology), 'missing the freshness gate');
});

console.log('\ndata license page');
const license = v3html['/census/data-license/'];
test('the data license page states CC BY 4.0 on summaries and the citation format', () => {
  assert.ok(/Creative Commons Attribution 4\.0/.test(license), 'missing the CC BY 4.0 name');
  assert.ok(license.includes('ProtoQuiz EMS Census, n='), 'missing the engine cite format');
});
test('the data license page says row-level data is NOT published', () => {
  assert.ok(/not published/.test(license), 'must say rows are not published');
  assert.ok(/license request/i.test(license), 'must offer the license-request path');
  assert.ok(/[Tt]erms are not yet set/.test(license), 'must be honest that terms are TBD');
});
test('the data license page states same-day takedown and opt-out', () => {
  assert.ok(/same day/i.test(license), 'missing same-day removal');
});
test('the Dataset JSON-LD license points at the page that states a license', () => {
  const l = v3html['/census/'];
  assert.ok(l.includes('https://protoquiz.com/census/data-license/'), 'Dataset license must point at the license page');
});

console.log('\nsubmission forms');
test('the landing #list section carries a real form, not just prose', () => {
  const l = v3html['/census/'];
  assert.ok(/<form class="submit-form" id="list-form"/.test(l), 'landing must carry a form');
  assert.ok(l.includes('api.protoquiz.com/api/monitor?type=censusSubmit'), 'form must post to censusSubmit');
  assert.ok(/"kind":"listing"/.test(l) || l.includes('"listing"'), 'landing form must send kind: listing');
});
test('the agency #correct section carries a form scoped to that agency', () => {
  const dh = v3html['/census/agencies/denver-health/'];
  assert.ok(/<form class="submit-form" id="correct-form"/.test(dh), 'agency page must carry a form');
  assert.ok(dh.includes('"denver-health"'), 'the correction form must carry its agency key');
  assert.ok(dh.includes('"correction"'), 'agency form must send kind: correction');
});
test('both forms carry a honeypot named website, left empty', () => {
  for (const p of ['/census/', '/census/agencies/denver-health/']) {
    const h = v3html[p];
    assert.ok(/name="website"/.test(h), `${p} missing the honeypot field`);
    assert.ok(/id="[a-z-]+-website"[^>]*\/>/.test(h), `${p} honeypot must ship empty (no value attribute)`);
    assert.ok(!/name="website"[^>]*value=/.test(h), `${p} honeypot must not be prefilled`);
  }
});
test('the forms carry no CSRF token, nonce or timestamp', () => {
  // Any of those changes per build and would break the byte-identical rebuild the
  // nightly depends on — and a public unauthenticated endpoint needs none of them.
  for (const p of ['/census/', '/census/agencies/denver-health/']) {
    assert.ok(!/csrf|nonce|_token|timestamp/i.test(v3html[p]), `${p} form carries a per-build value`);
  }
});
test('a v2 build renders the forms too', () => {
  assert.ok(html['/census/'].includes('id="list-form"'), 'the landing form must not be v3-only');
  assert.ok(html['/census/agencies/denver-health/'].includes('id="correct-form"'), 'the correction form must not be v3-only');
});

console.log('\nterms');
// The Dataset JSON-LD has claimed a license since the census shipped; the Terms had
// zero mentions of the census. This asserts the text actually says what is claimed.
const TERMS = readFileSync(join(here, '..', 'terms', 'index.html'), 'utf8');
test('Terms carries the census sub-heading under user submissions', () => {
  assert.ok(TERMS.includes('Protocol documents and the EMS Census'), 'missing the census sub-heading');
  const submissions = TERMS.indexOf('User submissions and feedback');
  const census = TERMS.indexOf('Protocol documents and the EMS Census');
  assert.ok(submissions > -1 && census > submissions, 'the census paragraph must sit under the submissions heading');
  const nextH2 = TERMS.indexOf('<h2>', submissions + 4);
  assert.ok(census < nextH2, 'the census paragraph must be inside that section, not after the next heading');
});
test('the census paragraph says it applies alongside the general grant', () => {
  assert.ok(/applies alongside the general grant/.test(TERMS), 'must state it extends one grant, not add a second');
});
test('the census paragraph states public-record listing, aggregation and the opt-out', () => {
  assert.ok(/public record/i.test(TERMS), 'missing the public-record scope');
  assert.ok(/aggregate/i.test(TERMS), 'missing aggregation');
  assert.ok(/Opt-out/.test(TERMS), 'missing the opt-out');
  assert.ok(/same day/i.test(TERMS), 'the opt-out must state same-day removal');
  assert.ok(TERMS.includes('/census/data-license/'), 'Terms must link to the data license page');
});

rmSync(v3.out, { recursive: true, force: true });

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
