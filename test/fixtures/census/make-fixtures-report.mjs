// Builds test/fixtures/census/report/{compare,manifest}.json — a compare.json big
// enough to exercise census-report.mjs's floor selection end to end. Run:
//   node test/fixtures/census/make-fixtures-report.mjs
//
// The site's v3 fixture is deliberately small (it exists to exercise page rules, and a
// large one would make every page diff unreadable), so it can never fill an edition.
// This one is shaped for the selection logic instead: groups at each floor, with known
// spreads, so the test can assert WHICH floor was used and WHICH findings were picked
// rather than just that something rendered.
//
// Committed, like every other fixture, so the byte-identical test has a fixed input.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'report');
mkdirSync(out, { recursive: true });

const ASOF = '2026-09-04';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const cite = n => `ProtoQuiz EMS Census, n=${n.sources} protocols from ${n.agencies} named agencies / `
  + `${n.states} states, updated ${MONTHS[8]} 2026`;

// A group with a chosen source count and a chosen spread. `spread` is
// (p75-p25)/median, which is exactly what the report ranks by — building the fixture
// from the ranking input means a test can assert the ORDER, not just the count.
const group = ({ drug, indication, population = 'adult', perKg = false, unit = 'mg', sources, median, spread, agencies = null, states = 3, routes = [['IV', 1]] }) => {
  const half = (spread * median) / 2;
  const n = {
    sources,
    agencies: agencies ?? Math.max(1, sources - 1),
    states,
    rows: sources + 2,
    rowsRaw: 1,
  };
  return {
    schemaVersion: 3,
    asOf: ASOF,
    key: { drugKey: drug, indicationKey: indication, population, perKg, unit },
    n,
    agencyKeys: Array.from({ length: n.agencies }, (_, i) => `agency-${String(i + 1).padStart(2, '0')}`),
    dist: {
      min: Number((median - half * 2).toFixed(4)),
      p25: Number((median - half).toFixed(4)),
      median,
      p75: Number((median + half).toFixed(4)),
      max: Number((median + half * 2).toFixed(4)),
    },
    routes: routes.map(([route, share]) => ({ route, share })),
    adoption: sources / 40,
    freshness: { oldestEffectiveDate: '2022-01-01', newestEffectiveDate: '2026-06-01' },
    cite: cite(n),
  };
};

// Six groups clear 15 sources, so a full-strength edition selects floor 15. Spreads are
// distinct and descending so the ranked order is unambiguous.
const highFloor = [
  group({ drug: 'FENTANYL', indication: 'PAIN_SEVERE', sources: 22, median: 100, spread: 0.60, unit: 'mcg' }),
  group({ drug: 'KETAMINE', indication: 'AGITATION', sources: 19, median: 4, spread: 0.50, perKg: true, unit: 'mg' }),
  group({ drug: 'MIDAZOLAM', indication: 'SEIZURE', sources: 24, median: 5, spread: 0.40 }),
  group({ drug: 'MORPHINE', indication: 'PAIN_SEVERE', sources: 17, median: 4, spread: 0.30 }),
  group({ drug: 'ONDANSETRON', indication: 'NAUSEA_VOMITING', sources: 26, median: 4, spread: 0.20 }),
  group({ drug: 'DEXTROSE', indication: 'HYPOGLYCEMIA', sources: 21, median: 25, spread: 0.10, unit: 'g' }),
  // A seventh and eighth at the same floor, lower spread: they fill MAX_FINDINGS.
  group({ drug: 'ATROPINE', indication: 'BRADYCARDIA', sources: 18, median: 1, spread: 0.08 }),
  group({ drug: 'ADENOSINE', indication: 'SVT', sources: 20, median: 6, spread: 0.05 }),
  group({ drug: 'GLUCAGON', indication: 'HYPOGLYCEMIA', sources: 16, median: 1, spread: 0.02 }),
];

// Below the floor: present in the file, never eligible at 15.
const lowFloor = [
  group({ drug: 'CALCIUM_CHLORIDE', indication: 'HYPERKALEMIA', sources: 11, median: 1000, spread: 0.9 }),
  group({ drug: 'MAGNESIUM_SULFATE', indication: 'ECLAMPSIA', sources: 9, median: 4, spread: 0.8, unit: 'g' }),
  group({ drug: 'SODIUM_BICARBONATE', indication: 'HYPERKALEMIA', sources: 8, median: 50, spread: 0.7, unit: 'mEq' }),
];

// A group with a dist but a zero median: it has no meaningful spread and must be
// EXCLUDED rather than ranked as perfect agreement.
const zeroMedian = {
  ...group({ drug: 'ZERO_MEDIAN_DRUG', indication: 'NOWHERE', sources: 30, median: 1, spread: 0 }),
};
zeroMedian.dist = { min: 0, p25: 0, median: 0, p75: 0, max: 0 };

// A sub-threshold group: dist null, never eligible at any floor.
const noDist = {
  ...group({ drug: 'THIN_DRUG', indication: 'THIN', sources: 3, median: 1, spread: 0.5 }),
  dist: null,
};

const groups = [...highFloor, ...lowFloor, zeroMedian, noDist]
  .sort((a, b) => `${a.key.drugKey} ${a.key.indicationKey} ${a.key.population} ${a.key.perKg ? 1 : 0} ${a.key.unit}`
    .localeCompare(`${b.key.drugKey} ${b.key.indicationKey} ${b.key.population} ${b.key.perKg ? 1 : 0} ${b.key.unit}`));

const drugs = [...new Set(groups.map(g => g.key.drugKey))].sort().map(drugKey => {
  const gs = groups.filter(g => g.key.drugKey === drugKey);
  return {
    drugKey,
    n: {
      agencies: Math.max(...gs.map(g => g.n.agencies)),
      sources: Math.max(...gs.map(g => g.n.sources)),
      states: Math.max(...gs.map(g => g.n.states)),
      rows: gs.reduce((s, g) => s + g.n.rows, 0),
    },
    parsedShare: 0.9,
    indications: [...new Set(gs.map(g => g.key.indicationKey))].sort()
      .map(indicationKey => ({ indicationKey, sources: Math.max(...gs.filter(g => g.key.indicationKey === indicationKey).map(g => g.n.sources)) })),
  };
});

const manifest = {
  schemaVersion: 3,
  buildVersion: 'test-fixture-report-1',
  builtAt: '2026-09-04T00:00:00Z',
  asOf: ASOF,
  namedAgencies: 42,
  documents: 61,
  listedNamed: 55,
  listedAggregate: 5,
  pendingReview: 1,
  excluded: 0,
  delisted: 0,
  doseRows: 4180,
  dosesParsed: 3520,
  dosesPartial: 410,
  dosesRaw: 250,
  publishedRows: 4142,
  flaggedRows: 27,
  rejectedRows: 11,
  rowsPedsExcluded: 96,
  compareGroups: groups.length,
  indicationMapReviewed: true,
  unmappedIndications: 0,
};

const w = (name, obj) => writeFileSync(join(out, name), `${JSON.stringify(obj, null, 2)}\n`);
w('compare.json', { schemaVersion: 3, asOf: ASOF, groups, drugs });
w('manifest.json', manifest);

// A second compare.json shaped so NO floor can fill an edition — the "does not ship"
// path, which must render nothing and exit non-zero.
mkdirSync(join(out, 'thin'), { recursive: true });
const thinGroups = [...lowFloor.slice(0, 2), noDist];
writeFileSync(join(out, 'thin', 'compare.json'),
  `${JSON.stringify({ schemaVersion: 3, asOf: ASOF, groups: thinGroups, drugs: [] }, null, 2)}\n`);
writeFileSync(join(out, 'thin', 'manifest.json'),
  `${JSON.stringify({ ...manifest, compareGroups: thinGroups.length }, null, 2)}\n`);

console.log(`report fixtures -> ${out} (${groups.length} groups, ${groups.filter(g => g.dist).length} with a distribution)`);
