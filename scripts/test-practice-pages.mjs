// scripts/test-practice-pages.mjs — the two census finding pages keep their promises.
// Run: node scripts/test-practice-pages.mjs (also npm run test:practice-pages).
//
// These pages make claims about real EMS agencies from documents those agencies wrote,
// and the standing rules of the census (NORTH_STAR.md) are what makes that publishable.
// Every test here guards a rule that, if broken, would put a false statement about a real
// agency's practice in public:
//
//   * a `no` may come only from a competency matrix, never from a book's silence
//   * `unknown` and `certUndeterminable` are different facts and never pool
//   * nothing anywhere says an agency stopped DOING something
//   * only verified events publish as history
//
// The fixtures are small and hand-written so a rule can be tested against data shaped to
// break it, which the real extracts do not currently contain.
import assert from 'node:assert';
import { render as renderPractice } from './build-practice.mjs';
import { render as renderChanges, pickHeadline, HAND_CHECKED } from './build-changes.mjs';
import { byProcedure, contested, scopeDisagreements, matrixOnly, authOf } from './practice-data.mjs';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

const procRow = (o = {}) => ({
  agencyKey: 'a1', agencyName: 'Agency One', state: 'CO', jurisdiction: 'county',
  procedure: 'NEEDLE_DECOMPRESSION', procedureLabel: 'Needle chest decompression',
  certLevel: 'paramedic', authorization: 'standing', sourcePages: [1], ...o,
});

// ── the presence-only rule ──────────────────────────────────────────────────────────

test('an agency that never states an authorization is counted as NOT STATED, not as a no', () => {
  const g = byProcedure([procRow({ authorization: 'unknown' })])[0];
  assert.strictEqual(g.unknown, 1);
  assert.strictEqual(g.standing, 0);
  assert.strictEqual(g.contact_required, 0);
  // The stated denominator excludes it, so it can never round into either answer.
  assert.strictEqual(g.stated, 0);
});

test('one agency stating an authorization on one page of many lands in exactly one bucket', () => {
  // The same agency, the same procedure, two readings: one silent, one grounded. Without
  // the dedupe this agency is counted as both "standing" and "not stated" and the three
  // shares add to more than the agency count.
  const g = byProcedure([
    procRow({ authorization: 'unknown', sourcePages: [4] }),
    procRow({ authorization: 'standing', sourcePages: [9] }),
  ])[0];
  assert.strictEqual(g.n, 1, 'one agency');
  assert.strictEqual(g.standing + g.contact_required + g.unknown, 1, 'counted once');
  assert.strictEqual(g.standing, 1, 'the grounded reading wins over the silent one');
});

test('an agency whose book gives BOTH answers is counted once, as conditional', () => {
  // Protocol books routinely write "standing order in cardiac arrest, otherwise contact
  // medical control". That is one agency with a conditional policy, not one agency on
  // each side. Counting it twice made the two columns add up to 212 agencies across a
  // procedure that only 176 agencies name.
  const g = byProcedure([
    procRow({ agencyKey: 'both', authorization: 'standing', sourcePages: [3] }),
    procRow({ agencyKey: 'both', authorization: 'contact_required', sourcePages: [8] }),
  ])[0];
  assert.strictEqual(g.n, 1);
  assert.strictEqual(g.conditional, 1, 'lands in its own bucket');
  assert.strictEqual(g.standing, 0, 'and in neither single-answer column');
  assert.strictEqual(g.contact_required, 0);
  assert.strictEqual(g.stated, 0, 'a conditional agency has not taken a side');
});

test('the four buckets always add up to the agencies naming the procedure', () => {
  // The invariant the double-count broke. Held over a mix of every shape of row.
  const rows = [
    procRow({ agencyKey: 'a', authorization: 'standing' }),
    procRow({ agencyKey: 'b', authorization: 'contact_required' }),
    procRow({ agencyKey: 'c', authorization: 'unknown' }),
    procRow({ agencyKey: 'd', authorization: 'standing' }),
    procRow({ agencyKey: 'd', authorization: 'contact_required' }),
    // An agency with a silent page AND a grounded one is stated, never both.
    procRow({ agencyKey: 'e', authorization: 'unknown' }),
    procRow({ agencyKey: 'e', authorization: 'standing' }),
  ];
  for (const g of byProcedure(rows)) {
    assert.strictEqual(
      g.standing + g.contact_required + g.conditional + g.unknown, g.n,
      `${g.key}: buckets must sum to the agency count`);
  }
});

test('a procedure is contested only when both answers have real backing', () => {
  const many = (k, auth, from) => Array.from({ length: k }, (_, i) =>
    procRow({ agencyKey: `${from}${i}`, authorization: auth }));
  // 4 vs 4 is three or four books agreeing with themselves, not a national disagreement.
  assert.strictEqual(contested(byProcedure([...many(4, 'standing', 's'), ...many(4, 'contact_required', 'c')])).length, 0);
  assert.strictEqual(contested(byProcedure([...many(5, 'standing', 's'), ...many(5, 'contact_required', 'c')])).length, 1);
});

test('an unrecognized authorization degrades to NOT STATED rather than inventing a bucket', () => {
  assert.strictEqual(authOf({ authorization: 'per_medical_director_memo' }), 'unknown');
  assert.strictEqual(authOf({}), 'unknown');
});

// ── the only door to a `no` ─────────────────────────────────────────────────────────

test('a NO is never taken from a section-shaped document', () => {
  const rows = [
    { state: 'OR', shape: 'section', skill: 'Cardiac Pacing', certLevel: 'emt', permitted: 'yes', sourcePage: 2 },
    { state: 'SD', shape: 'section', skill: 'Cardiac Pacing', certLevel: 'emt', permitted: 'no', sourcePage: 3 },
  ];
  assert.strictEqual(matrixOnly(rows).length, 0, 'section rows never reach a comparison');
  assert.deepStrictEqual(scopeDisagreements(rows), [], 'and can never produce a disagreement');
});

test('a disagreement needs two MATRIX states giving opposite answers at the same level', () => {
  const rows = [
    { state: 'NC', shape: 'matrix', skill: 'Cardiac Pacing', certLevel: 'aemt', permitted: 'no', sourcePage: 4, sourceName: 'Wake' },
    { state: 'UT', shape: 'matrix', skill: 'Cardiac pacing', certLevel: 'aemt', permitted: 'yes', sourcePage: 7, sourceName: 'Utah' },
    // Same skill, a DIFFERENT level: not a disagreement, and must not be reported as one.
    { state: 'NC', shape: 'matrix', skill: 'Cardiac Pacing', certLevel: 'paramedic', permitted: 'yes', sourcePage: 4 },
    { state: 'UT', shape: 'matrix', skill: 'Cardiac pacing', certLevel: 'paramedic', permitted: 'yes', sourcePage: 7 },
  ];
  const d = scopeDisagreements(rows);
  assert.strictEqual(d.length, 1, 'exactly one disagreement');
  assert.strictEqual(d[0].cert, 'aemt');
  assert.deepStrictEqual(d[0].states.map(s => `${s.state}:${s.permitted}`), ['NC:no', 'UT:yes']);
});

test('an unknown scope cell is never rendered as a no', () => {
  const rows = [
    { state: 'NC', shape: 'matrix', skill: 'Pacing', certLevel: 'emt', permitted: 'yes', sourcePage: 1 },
    { state: 'VA', shape: 'matrix', skill: 'Pacing', certLevel: 'emt', permitted: 'unknown', sourcePage: 1 },
  ];
  assert.deepStrictEqual(scopeDisagreements(rows), [],
    'unknown vs yes is not a disagreement — it is one state that did not say');
});

// ── unknown vs certUndeterminable ───────────────────────────────────────────────────

const practiceHtml = (rows, scopeRows = []) => renderPractice({
  proc: { rows }, scope: { rows: scopeRows }, charts: {},
});

test('certUndeterminable is counted and explained apart from ordinary unknown', () => {
  const html = practiceHtml([
    procRow({ agencyKey: 'mi', state: 'MI', certLevel: 'unknown', certUndeterminable: true }),
    procRow({ agencyKey: 'a2', certLevel: 'unknown' }),
    procRow({ agencyKey: 'a3', certLevel: 'paramedic' }),
  ]);
  assert.match(html, /Set elsewhere by design/, 'the undeterminable group is named');
  assert.match(html, /Medical Control Authority ticks a box/, 'and explained as a choice');
  assert.match(html, /Not stated &mdash; 1 readings/, 'ordinary unknown counted separately');
  assert.match(html, /Set elsewhere by design &mdash; 1 readings, 1 agency \(MI\)/,
    'the undeterminable count does not include the ordinary unknown');
});

test('the undeterminable distinction survives a build with none of them in the data', () => {
  // The flag is not in the current extract. The page must still keep the two apart, so
  // the first row that carries it is not quietly pooled into missing data.
  const html = practiceHtml([procRow({ certLevel: 'unknown' })]);
  assert.match(html, /Set elsewhere by design &mdash; none in this build/);
  assert.match(html, /Medical Control Authority ticks a box/,
    'the explanation stays on the page so the distinction is not lost');
});

test('neither certification group is ever described as the agency not doing the procedure', () => {
  const html = practiceHtml([procRow({ certLevel: 'unknown' })]);
  // The page is REQUIRED to contain the words "the agency does not do it" — inside the
  // sentence saying that is NOT what absence means. So the check is for an ASSERTION of
  // absence, not for the phrase: an absence claim that is not preceded by a negation.
  const claims = [...html.matchAll(/(.{0,40})\b(?:does not|do not) (?:perform|carry|do)\b/gi)]
    .filter(m => !/\bnot\b|\bnever\b|\bcannot\b/i.test(m[1]));
  assert.deepStrictEqual(claims.map(m => m[0]), [], 'no unqualified absence claim about an agency');
  assert.match(html, /not evidence the agency does not do it/,
    'the page says outright what absence does NOT mean');
});

// ── the timeline vocabulary ─────────────────────────────────────────────────────────

const tl = (events, extra = {}) => ({
  events,
  agencies: [{ agencyKey: 'ne', agencyName: 'Nebraska Board', editions: [{}, {}] }],
  rejected: [],
  ...extra,
});
const change = (o = {}) => ({
  agencyKey: 'ne', agencyName: 'Nebraska Board of Emergency Medical Services',
  state: 'NE', jurisdiction: 'statewide',
  fromDate: '2022-09-01', toDate: '2024-05-01',
  changeType: 'procedure_added', subject: 'CHEST_TUBE',
  subjectLabel: 'Chest tube / finger thoracostomy', sourcePages: [144],
  confidence: 'verified',
  verification: { reason: 'grounded_page_read', evidence: 'Finger Thoracostomy only approved for Paramedic level', page: 144 },
  ...o,
});

test('a dropped procedure is rendered as STOPPED NAMING, never as stopped doing', () => {
  const html = renderChanges({
    timeline: tl([change({ changeType: 'procedure_removed' })]),
  });
  assert.match(html, /Stopped naming/, 'the allowed phrase is used');
  // The forbidden readings, in every phrasing that has tempted an editor. Each is matched
  // with the SENTENCE around it, because the page must be free to quote a forbidden phrase
  // in order to disown it — "We do not know the agency stopped doing it", "nowhere on this
  // page says an agency stopped doing anything" — and those sentences are the most
  // important ones on the page. A hit only counts when its own sentence does not negate it.
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
  const forbidden = [
    /no longer (?:performs|permitted|allowed|does)/i,
    /stopped (?:doing|performing)/i,
    /discontinued the procedure/i,
    /removed from (?:their|its) scope/i,
  ];
  // Sentence-level negation. This is deliberately a coarse check: a sentence that both
  // negates something ELSE and asserts a forbidden claim would slip through. That trade is
  // made knowingly — the alternative is parsing English, and the failure mode here is a
  // missed catch on a sentence no editor is likely to write, not a false alarm that would
  // train the next person to disable the test.
  const NEGATED = /\b(?:no|not|never|nowhere|cannot|refuses?|nothing|neither)\b/i;
  for (const bad of forbidden) {
    const claims = text.split(/(?<=[.?!])\s+/)
      .filter(sentence => bad.test(sentence) && !NEGATED.test(sentence));
    assert.deepStrictEqual(claims, [], `page must never assert: ${bad}`);
  }
});

test('only verified events publish as history; candidates are counted and not shown', () => {
  const html = renderChanges({
    timeline: tl([
      change({ subject: 'CHEST_TUBE' }),
      change({ subject: 'OXYTOCIN', subjectLabel: 'OXYTOCIN', changeType: 'drug_added', confidence: 'candidate' }),
    ]),
  });
  assert.match(html, /Chest tube/, 'the verified event is on the page');
  assert.ok(!/Oxytocin/i.test(html), 'the candidate event is not rendered as history');
});

test('no authorization or certification trend is ever drawn', () => {
  const html = renderChanges({
    timeline: tl([
      change(),
      change({ changeType: 'authorization_changed', confidence: 'candidate' }),
      change({ changeType: 'cert_changed', confidence: 'candidate' }),
    ]),
  });
  // Whitespace-insensitive: the sentence wraps in the generated source.
  assert.match(html.replace(/\s+/g, ' '), /we will not draw them as a trend/,
    'the page says outright that it is withholding this');
  for (const bad of [/trending toward/i, /increasingly require/i, /a shift toward/i]) {
    assert.ok(!bad.test(html), `page must never claim a direction: ${bad}`);
  }
});

test('the hand-checked headline renders only while its event is still in the data', () => {
  const hc = HAND_CHECKED[0];
  const present = pickHeadline([change({ agencyKey: hc.agencyKey, subject: hc.subject })], []);
  assert.ok(present.handChecked, 'the hand-checked event is chosen and marked as such');

  // Rebuilt without it: the page must fall back, never print a claim the data dropped.
  const other = change({
    agencyKey: 'ma', subject: 'OXYTOCIN', subjectLabel: 'OXYTOCIN', changeType: 'drug_added',
    verification: { evidence: 'administer oxytocin 10 un IM', page: 12 },
  });
  const fallback = pickHeadline([other], []);
  assert.strictEqual(fallback.subject, 'OXYTOCIN');
  assert.ok(!fallback.handChecked, 'the fallback is not presented as hand-checked');
});

test('the headline rule ranks a quote that names its subject above one that does not', () => {
  // The bug this guards: scoring by quote LENGTH, and matching only the vocabulary key,
  // ranked a long clinical aside above a page that named the procedure exactly.
  const onTopic = change({
    agencyKey: 'zz', subject: 'CHEST_TUBE', subjectLabel: 'Chest tube / finger thoracostomy',
    verification: { evidence: 'Finger Thoracostomy only approved for Paramedic level', page: 144 },
  });
  const offTopic = change({
    agencyKey: 'aa', subject: 'NALOXONE', subjectLabel: 'NALOXONE', changeType: 'drug_added',
    verification: { evidence: `Per MCA selection administer intranasal, repeat once in 3-5 minutes if effective respirations are not restored, ${'and continue to monitor the patient closely throughout transport. '.repeat(3)}`, page: 14 },
  });
  assert.strictEqual(pickHeadline([offTopic, onTopic], []).subject, 'CHEST_TUBE');
});

test('the page states what it does not cover rather than implying national coverage', () => {
  const html = renderChanges({ timeline: tl([change()]) });
  assert.match(html, /not a national picture/, 'coverage is disclaimed in the open');
  assert.match(html, /26,883/, 'against the national denominator, not a bare count');
});

test('every rejected candidate is reported, not just the published ones', () => {
  const html = renderChanges({
    timeline: tl([change()], { rejected: [{ kind: 'drug_removed_still_in_text' }, { kind: 'unparsed_edition' }] }),
  });
  assert.match(html, /2<\/dt>\s*<dd>candidate changes the guards threw out/,
    'the rejection count is published beside the findings');
});

// ── US spellings ────────────────────────────────────────────────────────────────────
// A past lane introduced British spellings; the audience is American. This checks the
// generated prose, not the source comments.
test('both pages use US spellings', () => {
  const pages = [
    practiceHtml([procRow()], []),
    renderChanges({ timeline: tl([change()]) }),
  ];
  const BRITISH = /\b(colour|organis|recognis|programme|centre|behaviour|analyse|licence[sd]?\b|catalogue|standardis|summaris|favour)/i;
  for (const html of pages) {
    const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const hit = body.match(BRITISH);
    assert.ok(!hit, `British spelling in rendered page: ${hit && hit[0]}`);
  }
});

console.log(`\n${passed} passed`);
