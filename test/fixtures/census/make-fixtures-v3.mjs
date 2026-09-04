// Builds test/fixtures/census/data-v3/*.json and test/fixtures/census/rows-v3/rows_private.json
// — the contract v3 shapes census-pages.mjs reads. Run:
//   node test/fixtures/census/make-fixtures-v3.mjs
//
// v3 is the "rows private, summaries public" split: the site set is
// documents / agencies / compare / ledger / manifest, and the dose rows live only in
// the private directory --rows points at. dose_latest.json does not exist at v3.
//
// compare.json here is computed by a MIRROR of lib/census/compare.mjs (backend repo),
// not by importing it: a site fixture must build offline with no backend checkout. The
// mirror implements only what the fixture needs — one value per source, MIN_SOURCES,
// the group key, and the drug rollup — and is exercised against the real engine's rules
// by the numbers the site test asserts. If the engine's grouping changes, this changes
// with it.
//
// The JSON is committed so the determinism test has a fixed input; regenerate only when
// the contract changes.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataOut = join(here, 'data-v3');
const rowsOut = join(here, 'rows-v3');
mkdirSync(dataOut, { recursive: true });
mkdirSync(rowsOut, { recursive: true });

const MIN_SOURCES = 5;
const ASOF = '2026-09-04';

// ------------------------------------------------------------------ documents

const doc = (o) => ({
  hash: null, hashSource: 'pdf_hash', agencyKey: null, agencyName: null, state: null, country: 'US',
  city: null, jurisdiction: null, publicRecord: false, confidence: 'high', effectiveDate: null,
  capturedDate: null, effectiveDateSource: 'none', origin: 'seed', versionLabel: null,
  publicationState: 'listed_named', status: 'current', pageCount: null, sourceUrl: null,
  corpusDocId: null, doseCount: 0, ...o,
});

const named = (hash, agencyKey, agencyName, state, city, jurisdiction, effectiveDate, extra = {}) =>
  doc({
    hash, agencyKey, agencyName, state, city, jurisdiction, publicRecord: true,
    effectiveDate, effectiveDateSource: 'printed', origin: 'app', ...extra,
  });

const documents = [
  named('aaa1', 'denver-health', 'Denver Health Paramedic Division', 'CO', 'Denver', 'city', '2026-01-15', { pageCount: 240, sourceUrl: 'https://example.gov/denver-protocols.pdf', doseCount: 9 }),
  named('aaa2', 'denver-health', 'Denver Health Paramedic Division', 'CO', 'Denver', 'city', '2024-01-15', { status: 'superseded', pageCount: 230, doseCount: 0 }),
  named('bbb1', 'boulder-county-ems', 'Boulder County EMS', 'CO', 'Boulder', 'county', '2023-02-01', { pageCount: 180, doseCount: 6 }),
  named('ggg1', 'aurora-fire-rescue', 'Aurora Fire Rescue', 'CO', 'Aurora', 'city', '2026-02-10', { pageCount: 160, doseCount: 5 }),
  named('hhh1', 'jeffco-ems', 'Jefferson County EMS', 'CO', 'Golden', 'county', '2026-01-20', { pageCount: 150, doseCount: 5 }),
  named('iii1', 'travis-county-ems', 'Travis County EMS', 'TX', 'Austin', 'county', '2026-03-01', { pageCount: 210, doseCount: 5 }),
  named('jjj1', 'king-county-medic', 'King County Medic One', 'WA', 'Seattle', 'county', '2026-02-20', { pageCount: 190, doseCount: 5 }),
  // Two drugs only -> below MIN_AGENCY_DRUGS, no page.
  named('ccc1', 'thin-agency', 'Thin Agency EMS', 'CO', null, 'county', '2026-03-01', { pageCount: 40, doseCount: 2 }),
  // Named but stateless -> no page, and must not create a state page.
  named('ddd1', 'stateless-ems', 'Stateless EMS', null, null, 'regional', '2026-02-01', { pageCount: 70, doseCount: 4 }),
  // Aggregate: every named field stays null by contract. Counted, never on a named page.
  doc({ hash: 'eee1', publicationState: 'listed_aggregate', confidence: 'low', pageCount: 120, doseCount: 5, hashSource: 'corpus_only', origin: 'device' }),
  doc({ hash: 'fff1', publicationState: 'delisted', status: null, pageCount: 55, doseCount: 0, origin: 'wayback' }),
  // Statewide baseline (ruling R1): a floor every CO agency inherits, never counted
  // as any one agency's own coverage. Not `named()` — a statewide document has no
  // one agency to attach to; it carries the state's own name for the page's list.
  doc({ hash: 'kkk1', agencyName: 'Colorado Statewide EMS Protocols', state: 'CO', jurisdiction: 'statewide', publicRecord: true, effectiveDate: '2026-01-01', effectiveDateSource: 'printed', origin: 'seed', pageCount: 90, sourceUrl: 'https://example.gov/co-statewide.pdf', doseCount: 0 }),
];

// ------------------------------------------------------------------- agencies

const agency = (o) => ({
  agencyKey: null, name: null, state: null, country: 'US', city: null, jurisdiction: 'county',
  currentHash: null, currentEffectiveDate: null, documentCount: 1, doseCount: 0,
  pendingReview: null, mayBeOutdated: false, ...o,
});

// coverage (spec 8) is deliberately present on CO agencies only, and TRUE/FALSE
// mixed within CO — this fixture exercises both the split-list rendering AND the
// "some rows carry it, some don't" case a real mid-rollout build produces. TX and
// WA carry no `coverage` field at all, same as a v2 row or a v3 build before the
// field lands: state pages for those must render as the single unsplit list.
const coverage = (hasProtocol) => ({ coverage: { hasProtocol, jurisdiction: 'county' } });

const agencies = [
  agency({ agencyKey: 'aurora-fire-rescue', name: 'Aurora Fire Rescue', state: 'CO', city: 'Aurora', jurisdiction: 'city', currentHash: 'ggg1', currentEffectiveDate: '2026-02-10', doseCount: 5, coverage: { hasProtocol: false, jurisdiction: 'city' } }),
  agency({ agencyKey: 'boulder-county-ems', name: 'Boulder County EMS', state: 'CO', city: 'Boulder', jurisdiction: 'county', currentHash: 'bbb1', currentEffectiveDate: '2023-02-01', doseCount: 6, mayBeOutdated: true, ...coverage(true) }),
  agency({ agencyKey: 'denver-health', name: 'Denver Health Paramedic Division', state: 'CO', city: 'Denver', jurisdiction: 'city', currentHash: 'aaa1', currentEffectiveDate: '2026-01-15', documentCount: 2, doseCount: 9, pendingReview: { effectiveDate: '2026-06-01' }, coverage: { hasProtocol: true, jurisdiction: 'city' } }),
  agency({ agencyKey: 'jeffco-ems', name: 'Jefferson County EMS', state: 'CO', city: 'Golden', jurisdiction: 'county', currentHash: 'hhh1', currentEffectiveDate: '2026-01-20', doseCount: 5, ...coverage(false) }),
  agency({ agencyKey: 'king-county-medic', name: 'King County Medic One', state: 'WA', city: 'Seattle', jurisdiction: 'county', currentHash: 'jjj1', currentEffectiveDate: '2026-02-20', doseCount: 5 }),
  agency({ agencyKey: 'stateless-ems', name: 'Stateless EMS', jurisdiction: 'regional', currentHash: 'ddd1', currentEffectiveDate: '2026-02-01', doseCount: 4 }),
  agency({ agencyKey: 'thin-agency', name: 'Thin Agency EMS', state: 'CO', jurisdiction: 'county', currentHash: 'ccc1', currentEffectiveDate: '2026-03-01', doseCount: 2 }),
  agency({ agencyKey: 'travis-county-ems', name: 'Travis County EMS', state: 'TX', city: 'Austin', jurisdiction: 'county', currentHash: 'iii1', currentEffectiveDate: '2026-03-01', doseCount: 5 }),
];

const stateOf = Object.fromEntries(agencies.map(a => [a.agencyKey, a.state]));

// ----------------------------------------------------------------------- rows
//
// v3 row shape = v2's dose_latest row plus `doseShape` and `state`. `doseShape` is
// what lets the engine drop shape-B pediatric rows (their age bands were lost at
// ingest, so per-band doses cannot be compared); `state` is carried on the row so a
// consumer counts states without joining back to agencies.json.

const row = (o) => ({
  agencyKey: null, hash: null, state: null, effectiveDate: null, drugKey: null, drugRaw: null,
  indicationKey: null, indicationRaw: null, population: 'adult', doseRaw: null, value: null,
  valueMax: null, unit: null, perKg: false, maxValue: null, maxUnit: null, route: null,
  repeatRaw: null, standing: null, ageRange: null, sourcePages: [], parseStatus: 'raw',
  doseShape: 'doses', ...o,
});

const at = (agencyKey, hash, effectiveDate) => (o) =>
  row({ agencyKey, hash, state: stateOf[agencyKey] ?? null, effectiveDate, ...o });

const epi = (mk, value, extra = {}) => mk({
  drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine 1:10,000', indicationKey: 'CARDIAC_ARREST',
  indicationRaw: 'Cardiac Arrest', doseRaw: `${value} mg IV/IO`, value, unit: 'mg',
  route: 'IV/IO', parseStatus: 'parsed', ...extra,
});

const naloxone = (mk, value, extra = {}) => mk({
  drugKey: 'NALOXONE', drugRaw: 'Narcan', indicationKey: 'OPIOID_OVERDOSE',
  indicationRaw: 'Opioid OD', doseRaw: `${value} mg IN`, value, unit: 'mg', route: 'IN',
  parseStatus: 'parsed', ...extra,
});

const amio = (mk, value, extra = {}) => mk({
  drugKey: 'AMIODARONE', drugRaw: 'Amiodarone', indicationKey: 'VENTRICULAR_FIBRILLATION',
  indicationRaw: 'VF/pVT', doseRaw: `${value} mg IV`, value, unit: 'mg', route: 'IV',
  parseStatus: 'parsed', ...extra,
});

const dh = at('denver-health', 'aaa1', '2026-01-15');
const bc = at('boulder-county-ems', 'bbb1', '2023-02-01');
const af = at('aurora-fire-rescue', 'ggg1', '2026-02-10');
const jc = at('jeffco-ems', 'hhh1', '2026-01-20');
const tc = at('travis-county-ems', 'iii1', '2026-03-01');
const kc = at('king-county-medic', 'jjj1', '2026-02-20');
const th = at('thin-agency', 'ccc1', '2026-03-01');
const sl = at('stateless-ems', 'ddd1', '2026-02-01');
const agg = (o) => row({ agencyKey: null, hash: 'eee1', state: null, ...o });

const rows = [
  // EPINEPHRINE / CARDIAC_ARREST, adult, mg: 7 sources -> clears MIN_SOURCES, publishes a dist.
  epi(dh, 1, { sourcePages: [42, 43], standing: true, repeatRaw: 'q3-5 min' }),
  epi(bc, 1, { standing: false }),
  epi(af, 1),
  epi(jc, 1),
  epi(tc, 2, { doseRaw: '2 mg IV/IO' }),
  epi(kc, 1),
  // An aggregate source: counted as a source, never as a named agency.
  epi(agg, 1, { standing: null }),
  // Same source, second entry — must NOT become a second vote.
  epi(dh, 1, { doseRaw: '1 mg IV/IO repeat', repeatRaw: 'q5 min' }),
  // A raw entry on the same group: counted in rowsRaw, never in the distribution.
  dh({ drugKey: 'EPINEPHRINE', drugRaw: 'Epi', indicationKey: 'CARDIAC_ARREST', indicationRaw: 'Arrest', doseRaw: 'per medical control', parseStatus: 'raw' }),

  // EPINEPHRINE / CARDIAC_ARREST, peds, per-kg: shape A, 5 sources -> its own group and dist.
  epi(dh, 0.01, { population: 'peds', perKg: true, doseRaw: '0.01 mg/kg IV/IO', maxValue: 1, maxUnit: 'mg', ageRange: '<12 y' }),
  epi(bc, 0.01, { population: 'peds', perKg: true, doseRaw: '0.01 mg/kg IV/IO' }),
  epi(af, 0.01, { population: 'peds', perKg: true, doseRaw: '0.01 mg/kg IV/IO' }),
  epi(jc, 0.01, { population: 'peds', perKg: true, doseRaw: '0.01 mg/kg IV/IO' }),
  epi(tc, 0.02, { population: 'peds', perKg: true, doseRaw: '0.02 mg/kg IV/IO' }),
  // Shape B peds: dropped by the engine, so it must not move any number above.
  epi(kc, 0.5, { population: 'peds', perKg: true, doseRaw: '0.5 mg/kg IV/IO', doseShape: 'indicationDoses' }),

  // EPINEPHRINE / HYPOTENSION_PUSH_DOSE, mcg: only 2 sources -> group exists, dist null,
  // and no indication page.
  dh({ drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine', indicationKey: 'HYPOTENSION_PUSH_DOSE', indicationRaw: 'Push-dose pressor', doseRaw: '5 - 20 mcg IV', value: 5, valueMax: 20, unit: 'mcg', route: 'IV', parseStatus: 'parsed', standing: true }),
  bc({ drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine', indicationKey: 'HYPOTENSION_PUSH_DOSE', indicationRaw: 'Push dose', doseRaw: '10 mcg IV', value: 10, unit: 'mcg', route: 'IV', parseStatus: 'parsed' }),

  // NALOXONE / OPIOID_OVERDOSE, adult, mg: 7 sources.
  naloxone(dh, 2, { sourcePages: [88] }),
  naloxone(bc, 2),
  naloxone(af, 2),
  naloxone(jc, 4, { doseRaw: '4 mg IN' }),
  naloxone(tc, 2),
  naloxone(kc, 2),
  naloxone(th, 2),
  naloxone(sl, 2),
  // Route variety, so the route shares on the page are not a single 100% bar.
  naloxone(dh, 0.4, { doseRaw: '0.4 mg IV', route: 'IV' }),

  // AMIODARONE / VENTRICULAR_FIBRILLATION, adult, mg: 6 sources.
  amio(dh, 300),
  amio(bc, 300, { doseRaw: '300 mg', route: null, parseStatus: 'partial' }),
  amio(af, 300),
  amio(jc, 300),
  amio(tc, 150, { doseRaw: '150 mg IV' }),
  amio(th, 300),
  amio(sl, 300),
];

// ----------------------------------------------------------------------- ledger

const ledger = [
  { at: '2026-08-01T00:00:00Z', hash: 'aaa1', agencyKey: 'denver-health', change: 'added', from: null, to: 'listed_named', by: 'build', reason: null },
  { at: '2026-08-02T00:00:00Z', hash: 'aaa2', agencyKey: 'denver-health', change: 'superseded', from: 'current', to: 'superseded', by: 'build', reason: null },
  { at: '2026-08-03T00:00:00Z', hash: 'bbb1', agencyKey: 'boulder-county-ems', change: 'state_changed', from: 'pending_review', to: 'listed_named', by: 'jaden', reason: 'verified public record' },
];

// ------------------------------------------------- the engine mirror (fixtures only)

const TO_MG = { mcg: 1 / 1000, g: 1000 };
const canonical = r => (TO_MG[r.unit] === undefined
  ? { unit: r.unit, value: r.value }
  : { unit: 'mg', value: r.value * TO_MG[r.unit] });
const isShapeBPeds = r => r.population === 'peds' && r.doseShape === 'indicationDoses';
const isParsed = r => r.value != null && r.unit != null;
const sourceKeyOf = r => r.agencyKey ?? r.hash;
const keyTuple = k => `${k.drugKey} ${k.indicationKey} ${k.population} ${k.perKg ? 1 : 0} ${k.unit}`;

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const median = sorted => quantile(sorted, 0.5);

const admitted = rows.filter(r => !isShapeBPeds(r));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const cite = (n) => {
  const m = ASOF.match(/^(\d{4})-(\d{2})/);
  return `ProtoQuiz EMS Census, n=${n.sources} protocols from ${n.agencies} named agencies / `
    + `${n.states} states, updated ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

function buildGroups() {
  const buckets = new Map();
  const raw = new Map();
  const base = r => `${r.drugKey} ${r.indicationKey} ${r.population} ${r.perKg ? 1 : 0}`;

  for (const r of admitted) {
    if (!isParsed(r)) {
      const id = base(r);
      raw.set(id, (raw.get(id) || 0) + 1);
      continue;
    }
    const { unit, value } = canonical(r);
    const key = { drugKey: r.drugKey, indicationKey: r.indicationKey, population: r.population, perKg: Boolean(r.perKg), unit };
    const id = keyTuple(key);
    if (!buckets.has(id)) buckets.set(id, { key, rows: [] });
    buckets.get(id).rows.push({ row: r, value });
  }

  const allSources = new Set(admitted.map(sourceKeyOf));
  const carrying = new Map();
  for (const r of admitted) {
    if (!carrying.has(r.drugKey)) carrying.set(r.drugKey, new Set());
    carrying.get(r.drugKey).add(sourceKeyOf(r));
  }

  const out = [];
  for (const [, g] of buckets) {
    const bySource = new Map();
    const agencySet = new Set(), stateSet = new Set(), routes = new Map();
    let oldest = null, newest = null;
    for (const { row: r, value } of g.rows) {
      const sk = sourceKeyOf(r);
      if (!bySource.has(sk)) bySource.set(sk, []);
      bySource.get(sk).push(value);
      if (r.agencyKey) agencySet.add(r.agencyKey);
      if (r.state) stateSet.add(r.state);
      routes.set(r.route ?? null, (routes.get(r.route ?? null) || 0) + 1);
      if (r.effectiveDate) {
        if (oldest === null || r.effectiveDate < oldest) oldest = r.effectiveDate;
        if (newest === null || r.effectiveDate > newest) newest = r.effectiveDate;
      }
    }
    const sourceValues = [...bySource.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([, vals]) => median([...vals].sort((x, y) => x - y)));
    const sorted = [...sourceValues].sort((a, b) => a - b);
    const n = {
      sources: bySource.size,
      agencies: agencySet.size,
      states: stateSet.size,
      rows: g.rows.length,
      rowsRaw: raw.get(base(g.key)) || 0,
    };
    out.push({
      schemaVersion: 3,
      asOf: ASOF,
      key: g.key,
      n,
      // agencyKeys is a v3 REQUIREMENT of compare.json, not an engine field today:
      // n.agencies is a count and a count cannot be linked. Names only, no values.
      agencyKeys: [...agencySet].sort(),
      // sourceKeys/states: same sorted-distinct shape as agencyKeys, so the indication
      // page can UNION them across (population, unit) groups instead of taking a
      // Math.max that understates whenever two groups have disjoint sets.
      sourceKeys: [...bySource.keys()].sort(),
      states: [...stateSet].sort(),
      dist: n.sources < MIN_SOURCES || !sorted.length ? null : {
        min: sorted[0], p25: quantile(sorted, 0.25), median: median(sorted),
        p75: quantile(sorted, 0.75), max: sorted[sorted.length - 1],
      },
      routes: [...routes.entries()]
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .map(([route, count]) => ({ route, share: count / n.rows })),
      adoption: allSources.size ? carrying.get(g.key.drugKey).size / allSources.size : 0,
      freshness: { oldestEffectiveDate: oldest, newestEffectiveDate: newest },
      cite: cite(n),
    });
  }
  return out.sort((a, b) => keyTuple(a.key).localeCompare(keyTuple(b.key)));
}

function buildDrugs() {
  const byDrug = new Map();
  for (const r of admitted) {
    if (!byDrug.has(r.drugKey)) {
      byDrug.set(r.drugKey, { drugKey: r.drugKey, agencies: new Set(), sources: new Set(), states: new Set(), rows: 0, parsed: 0, indications: new Map() });
    }
    const d = byDrug.get(r.drugKey);
    const sk = sourceKeyOf(r);
    d.sources.add(sk);
    if (r.agencyKey) d.agencies.add(r.agencyKey);
    if (r.state) d.states.add(r.state);
    d.rows++;
    if (isParsed(r)) d.parsed++;
    if (!d.indications.has(r.indicationKey)) d.indications.set(r.indicationKey, new Set());
    d.indications.get(r.indicationKey).add(sk);
  }
  return [...byDrug.values()].map(d => ({
    drugKey: d.drugKey,
    n: { agencies: d.agencies.size, sources: d.sources.size, states: d.states.size, rows: d.rows, parsed: d.parsed },
    parsedShare: d.rows ? d.parsed / d.rows : 0,
    indications: [...d.indications.entries()]
      .map(([indicationKey, s]) => ({ indicationKey, sources: s.size }))
      .sort((a, b) => a.indicationKey.localeCompare(b.indicationKey)),
  })).sort((a, b) => a.drugKey.localeCompare(b.drugKey));
}

const groups = buildGroups();
const drugs = buildDrugs();

// ---------------------------------------------------------------------- manifest

const parsedCount = rows.filter(r => r.parseStatus === 'parsed').length;
const partialCount = rows.filter(r => r.parseStatus === 'partial').length;
const rawCount = rows.filter(r => r.parseStatus === 'raw').length;
const pedsExcluded = rows.filter(isShapeBPeds).length;

const manifest = {
  schemaVersion: 3,
  buildVersion: 'test-fixture-v3-1',
  builtAt: '2026-09-04T00:00:00Z',
  asOf: ASOF,
  namedAgencies: agencies.length,
  documents: documents.length,
  listedNamed: documents.filter(d => d.publicationState === 'listed_named').length,
  listedAggregate: documents.filter(d => d.publicationState === 'listed_aggregate').length,
  pendingReview: 0,
  excluded: 0,
  delisted: documents.filter(d => d.publicationState === 'delisted').length,
  doseRows: rows.length,
  dosesParsed: parsedCount,
  dosesPartial: partialCount,
  dosesRaw: rawCount,
  // publishedRows = rows minus flagged minus rejected. The fixture has no suppressed
  // rows, so it equals doseRows; flaggedRows is non-zero anyway so the "n rows under
  // review" line and the methodology page's review paragraph are both exercised.
  publishedRows: rows.length,
  flaggedRows: 2,
  rejectedRows: 1,
  rowsPedsExcluded: pedsExcluded,
  compareGroups: groups.length,
  indicationMapReviewed: true,
  unmappedIndications: 0,
};

// ------------------------------------------------------------------------ write

const sortBy = (xs, ...keys) => [...xs].sort((a, b) =>
  keys.map(k => String(a[k] ?? '').localeCompare(String(b[k] ?? ''))).find(Boolean) || 0);

const w = (dir, name, obj) => writeFileSync(join(dir, name), `${JSON.stringify(obj, null, 2)}\n`);

w(dataOut, 'documents.json', { schemaVersion: 3, rows: sortBy(documents, 'hash') });
w(dataOut, 'agencies.json', { schemaVersion: 3, rows: sortBy(agencies, 'agencyKey') });
w(dataOut, 'compare.json', { schemaVersion: 3, asOf: ASOF, groups, drugs });
w(dataOut, 'ledger.json', { schemaVersion: 3, rows: sortBy(ledger, 'at', 'hash') });
w(dataOut, 'manifest.json', manifest);
w(rowsOut, 'rows_private.json', {
  schemaVersion: 3,
  rows: sortBy(rows, 'agencyKey', 'drugKey', 'indicationKey', 'population'),
});

console.log(`v3 fixtures: ${dataOut} (+ rows_private.json in ${rowsOut})`);
console.log(`  ${rows.length} rows, ${groups.length} groups, ${drugs.length} drugs, ${groups.filter(g => g.dist).length} with a distribution`);
