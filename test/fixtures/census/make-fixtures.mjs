// Builds test/fixtures/census/data/*.json — the L3 contract shapes, hand-written
// to exercise every rule census-pages.mjs implements. Run: node test/fixtures/census/make-fixtures.mjs
// Regenerate only when the contract changes; the JSON is committed so the
// determinism test has a fixed input.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'data');
mkdirSync(out, { recursive: true });

const doc = (o) => ({
  hash: null, hashSource: 'pdf_hash', agencyKey: null, agencyName: null, state: null, country: 'US',
  city: null, jurisdiction: null, publicRecord: false, confidence: 'high', effectiveDate: null,
  effectiveDateApproximate: false, versionLabel: null, publicationState: 'listed_named',
  status: 'current', pageCount: null, sourceUrl: null, corpusDocId: null, doseCount: 0, ...o,
});

const documents = [
  doc({ hash: 'aaa1', agencyKey: 'denver-health', agencyName: 'Denver Health Paramedic Division', state: 'CO', city: 'Denver', jurisdiction: 'city', publicRecord: true, effectiveDate: '2026-01-15', pageCount: 240, sourceUrl: 'https://example.gov/denver-protocols.pdf', doseCount: 9 }),
  doc({ hash: 'aaa2', agencyKey: 'denver-health', agencyName: 'Denver Health Paramedic Division', state: 'CO', city: 'Denver', jurisdiction: 'city', publicRecord: true, effectiveDate: '2024-01-15', status: 'superseded', pageCount: 230, doseCount: 0 }),
  doc({ hash: 'bbb1', agencyKey: 'boulder-county-ems', agencyName: 'Boulder County EMS', state: 'CO', city: 'Boulder', jurisdiction: 'county', publicRecord: true, effectiveDate: '2023-02-01', pageCount: 180, doseCount: 5 }),
  // Two drugs only -> below MIN_AGENCY_DRUGS, must get no page.
  doc({ hash: 'ccc1', agencyKey: 'thin-agency', agencyName: 'Thin Agency EMS', state: 'CO', jurisdiction: 'county', publicRecord: true, effectiveDate: '2026-03-01', pageCount: 40, doseCount: 2 }),
  // Named but stateless -> no page, and must not create a state page.
  doc({ hash: 'ddd1', agencyKey: 'stateless-ems', agencyName: 'Stateless EMS', jurisdiction: 'regional', publicRecord: true, effectiveDate: '2026-02-01', pageCount: 70, doseCount: 4 }),
  // Aggregate: every named field is null by contract.
  doc({ hash: 'eee1', publicationState: 'listed_aggregate', confidence: 'low', status: 'current', pageCount: 120, doseCount: 6, hashSource: 'corpus_only' }),
  doc({ hash: 'fff1', agencyKey: null, publicationState: 'delisted', status: null, pageCount: 55, doseCount: 0 }),
];

const agency = (o) => ({
  agencyKey: null, name: null, state: null, country: 'US', city: null, jurisdiction: 'county',
  currentHash: null, currentEffectiveDate: null, documentCount: 1, doseCount: 0,
  pendingReview: null, mayBeOutdated: false, ...o,
});

const agencies = [
  agency({ agencyKey: 'boulder-county-ems', name: 'Boulder County EMS', state: 'CO', city: 'Boulder', jurisdiction: 'county', currentHash: 'bbb1', currentEffectiveDate: '2023-02-01', documentCount: 1, doseCount: 5, mayBeOutdated: true }),
  agency({ agencyKey: 'denver-health', name: 'Denver Health Paramedic Division', state: 'CO', city: 'Denver', jurisdiction: 'city', currentHash: 'aaa1', currentEffectiveDate: '2026-01-15', documentCount: 2, doseCount: 9, pendingReview: { effectiveDate: '2026-06-01' } }),
  agency({ agencyKey: 'stateless-ems', name: 'Stateless EMS', jurisdiction: 'regional', currentHash: 'ddd1', currentEffectiveDate: '2026-02-01', doseCount: 4 }),
  agency({ agencyKey: 'thin-agency', name: 'Thin Agency EMS', state: 'CO', jurisdiction: 'county', currentHash: 'ccc1', currentEffectiveDate: '2026-03-01', doseCount: 2 }),
];

const dose = (o) => ({
  agencyKey: null, hash: null, effectiveDate: null, drugKey: null, drugRaw: null, indicationKey: null,
  indicationRaw: null, population: 'adult', doseRaw: null, value: null, valueMax: null, unit: null,
  perKg: false, maxValue: null, maxUnit: null, route: null, repeatRaw: null, standing: null,
  ageRange: null, sourcePages: [], parseStatus: 'raw', ...o,
});

const epi = (agencyKey, hash, effectiveDate, value, extra = {}) => dose({
  agencyKey, hash, effectiveDate, drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine 1:10,000',
  indicationKey: 'CARDIAC_ARREST', indicationRaw: 'Cardiac Arrest', doseRaw: `${value} mg IV/IO`,
  value, unit: 'mg', route: 'IV/IO', parseStatus: 'parsed', ...extra,
});

const doses = [
  // CARDIAC_ARREST reaches 5 rows -> gets an indication page.
  epi('denver-health', 'aaa1', '2026-01-15', 1, { sourcePages: [42, 43], standing: true, repeatRaw: 'q3-5 min' }),
  epi('denver-health', 'aaa1', '2026-01-15', 0.01, { population: 'peds', perKg: true, doseRaw: '0.01 mg/kg IV/IO', maxValue: 1, maxUnit: 'mg', ageRange: '<12 y' }),
  epi('boulder-county-ems', 'bbb1', '2023-02-01', 1, { standing: false }),
  epi('stateless-ems', 'ddd1', '2026-02-01', 1),
  // Aggregate contribution: counted in the stats, never named on a page.
  epi(null, 'eee1', null, 1, { standing: null, sourcePages: [] }),

  // A raw dose with no number, on the same indication — must be counted and shown as written.
  dose({ agencyKey: 'denver-health', hash: 'aaa1', effectiveDate: '2026-01-15', drugKey: 'EPINEPHRINE', drugRaw: 'Epi', indicationKey: 'CARDIAC_ARREST', indicationRaw: 'Arrest', doseRaw: 'per medical control', parseStatus: 'raw' }),

  // A range + a second indication that stays UNDER the 5-row threshold -> no page,
  // and the drug page must not link to it.
  dose({ agencyKey: 'denver-health', hash: 'aaa1', effectiveDate: '2026-01-15', drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine', indicationKey: 'HYPOTENSION_PUSH_DOSE', indicationRaw: 'Push-dose pressor', doseRaw: '5 - 20 mcg IV', value: 5, valueMax: 20, unit: 'mcg', route: 'IV', parseStatus: 'parsed', standing: true }),
  dose({ agencyKey: 'boulder-county-ems', hash: 'bbb1', effectiveDate: '2023-02-01', drugKey: 'EPINEPHRINE', drugRaw: 'Epinephrine', indicationKey: 'HYPOTENSION_PUSH_DOSE', indicationRaw: 'Push dose', doseRaw: '10 mcg IV', value: 10, unit: 'mcg', route: 'IV', parseStatus: 'parsed' }),

  // Second and third drug for denver + boulder so both clear MIN_AGENCY_DRUGS.
  dose({ agencyKey: 'denver-health', hash: 'aaa1', effectiveDate: '2026-01-15', drugKey: 'NALOXONE', drugRaw: 'Narcan', indicationKey: 'OPIOID_OVERDOSE', indicationRaw: 'Opioid OD', doseRaw: '2 mg IN', value: 2, unit: 'mg', route: 'IN', parseStatus: 'parsed', sourcePages: [88] }),
  dose({ agencyKey: 'denver-health', hash: 'aaa1', effectiveDate: '2026-01-15', drugKey: 'NALOXONE', drugRaw: 'Naloxone', indicationKey: 'OPIOID_OVERDOSE', indicationRaw: 'Opioid OD', population: 'peds', doseRaw: '0.1 mg/kg IN', value: 0.1, unit: 'mg', perKg: true, route: 'IN', parseStatus: 'parsed' }),
  dose({ agencyKey: 'denver-health', hash: 'aaa1', effectiveDate: '2026-01-15', drugKey: 'AMIODARONE', drugRaw: 'Amiodarone', indicationKey: 'VENTRICULAR_FIBRILLATION', indicationRaw: 'VF/pVT', doseRaw: '300 mg IV', value: 300, unit: 'mg', route: 'IV', parseStatus: 'parsed' }),
  dose({ agencyKey: 'boulder-county-ems', hash: 'bbb1', effectiveDate: '2023-02-01', drugKey: 'NALOXONE', drugRaw: 'Narcan', indicationKey: 'OPIOID_OVERDOSE', indicationRaw: 'Overdose', doseRaw: '2 mg IN', value: 2, unit: 'mg', route: 'IN', parseStatus: 'parsed' }),
  dose({ agencyKey: 'boulder-county-ems', hash: 'bbb1', effectiveDate: '2023-02-01', drugKey: 'AMIODARONE', drugRaw: 'Amiodarone', indicationKey: 'VENTRICULAR_FIBRILLATION', indicationRaw: 'VF', doseRaw: '300 mg', value: 300, unit: 'mg', parseStatus: 'partial' }),
  // thin-agency: two drugs only.
  dose({ agencyKey: 'thin-agency', hash: 'ccc1', effectiveDate: '2026-03-01', drugKey: 'NALOXONE', drugRaw: 'Narcan', indicationKey: 'OPIOID_OVERDOSE', indicationRaw: 'OD', doseRaw: '2 mg IN', value: 2, unit: 'mg', route: 'IN', parseStatus: 'parsed' }),
  dose({ agencyKey: 'thin-agency', hash: 'ccc1', effectiveDate: '2026-03-01', drugKey: 'AMIODARONE', drugRaw: 'Amiodarone', indicationKey: 'VENTRICULAR_FIBRILLATION', indicationRaw: 'VF', doseRaw: '300 mg IV', value: 300, unit: 'mg', route: 'IV', parseStatus: 'parsed' }),
  // stateless-ems: three drugs, but no state -> still no page.
  dose({ agencyKey: 'stateless-ems', hash: 'ddd1', effectiveDate: '2026-02-01', drugKey: 'NALOXONE', drugRaw: 'Narcan', indicationKey: 'OPIOID_OVERDOSE', indicationRaw: 'OD', doseRaw: '2 mg IN', value: 2, unit: 'mg', route: 'IN', parseStatus: 'parsed' }),
  dose({ agencyKey: 'stateless-ems', hash: 'ddd1', effectiveDate: '2026-02-01', drugKey: 'AMIODARONE', drugRaw: 'Amiodarone', indicationKey: 'VENTRICULAR_FIBRILLATION', indicationRaw: 'VF', doseRaw: '300 mg IV', value: 300, unit: 'mg', route: 'IV', parseStatus: 'parsed' }),
];

const ledger = [
  { at: '2026-08-01T00:00:00Z', hash: 'aaa1', agencyKey: 'denver-health', change: 'added', from: null, to: 'listed_named', by: 'build', reason: null },
  { at: '2026-08-02T00:00:00Z', hash: 'aaa2', agencyKey: 'denver-health', change: 'superseded', from: 'current', to: 'superseded', by: 'build', reason: null },
  { at: '2026-08-03T00:00:00Z', hash: 'bbb1', agencyKey: 'boulder-county-ems', change: 'state_changed', from: 'pending_review', to: 'listed_named', by: 'jaden', reason: 'verified public record' },
];

const manifest = {
  schemaVersion: 1, buildVersion: 'test-fixture-1', builtAt: '2026-08-28T00:00:00Z', asOf: '2026-08-28',
  namedAgencies: agencies.length, documents: documents.length,
  listedNamed: 5, listedAggregate: 1, pendingReview: 0, excluded: 0, delisted: 1,
  doseRows: doses.length,
  dosesParsed: doses.filter(d => d.parseStatus === 'parsed').length,
  dosesPartial: doses.filter(d => d.parseStatus === 'partial').length,
  dosesRaw: doses.filter(d => d.parseStatus === 'raw').length,
  indicationMapReviewed: true, unmappedIndications: 0,
};

const sortBy = (rows, ...keys) => [...rows].sort((a, b) =>
  keys.map(k => String(a[k] ?? '').localeCompare(String(b[k] ?? ''))).find(Boolean) || 0);

const w = (name, obj) => writeFileSync(join(out, name), `${JSON.stringify(obj, null, 2)}\n`);
w('documents.json', { schemaVersion: 1, rows: sortBy(documents, 'hash') });
w('agencies.json', { schemaVersion: 1, rows: sortBy(agencies, 'agencyKey') });
w('dose_latest.json', { schemaVersion: 1, rows: sortBy(doses, 'agencyKey', 'drugKey', 'indicationKey', 'population') });
w('ledger.json', { schemaVersion: 1, rows: sortBy(ledger, 'at', 'hash') });
w('manifest.json', manifest);
console.log(`fixtures written to ${out}`);
