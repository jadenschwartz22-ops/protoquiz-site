// scripts/build-changes.mjs — /research/changes, what protocol books changed and when.
//
// The third axis of the census: across regions, in detail, and OVER TIME. Every extractor
// before this one read only the current edition and threw the revision history away. This
// page reads the editions an agency has published in sequence and reports what appeared
// and what stopped appearing between two dated books.
//
// THE TWO SENTENCES THIS PAGE MAY NOT WRITE, and the reason it is built the way it is:
//
//   1. "Agency X stopped doing Y." It did not. The earlier edition named Y and the later
//      one did not, and a protocol book is not a scope of practice. The page says
//      "stopped naming" everywhere, in those words, and the vocabulary is enforced by a
//      test rather than left to whoever edits the copy next.
//
//   2. "Authorization is trending toward physician contact." It was measured and it did
//      not survive verification -- 8 events toward contact-required against 3 toward
//      standing, none of them grounded. The extractor is stable comparing two REGIONS
//      and is not stable comparing one agency to its own past, so authorization changes
//      are counted in the open on this page and never drawn as a direction. The
//      cross-region comparison on /research/practice is the publishable half.
//
// Only `verified` events are rendered as history: a verified event had its quote re-found
// on the page it was cited from. Candidates are counted, never shown.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';
import {
  readTimeline, verifiedEvents, CHANGE_LABEL, isAdd, isDrop,
  subjectOf, fmtMonth, n, escapeHtml,
} from './practice-data.mjs';

// THE HEADLINE. One change on this page carries evidence the others do not: a human
// opened the source PDF and confirmed it by hand, against the agency's own revision
// notice. That is a different grade of evidence from "the extractor re-found the quote",
// and HAND_CHECKED records it as the fact it is rather than hiding it inside a scoring
// rule tuned until the right answer fell out.
//
// The entry is (agencyKey, subject, the date the check was made, what was checked). The
// event itself is still read from the data: if a rebuild drops it, no hand-checked
// headline renders and the rule below picks the best remaining candidate instead. This
// page never prints a claim its data no longer supports.
export const HAND_CHECKED = [{
  agencyKey: 'nebraska-board-of-emergency-medical-services',
  subject: 'CHEST_TUBE',
  checkedOn: '2026-09-19',
  note: `Confirmed by hand against the source PDF: the 2024 edition's page 144 is headed
    &ldquo;THORACOSTOMY (Revised 5/7/2024)&rdquo; &mdash; the agency dating its own change
    &mdash; and the term appears nowhere in the 2022 edition.`,
}];

// Every other headline is PICKED FROM THE DATA by a rule rather than named in this
// source, so it cannot outlive the event it describes: if a rebuild drops it, the rule
// selects the next best and the prose around it still holds, because every word of that
// prose is generated from the event it chose.
//
// The rule ranks the things that make a change hard to argue with, in order:
//
//   1. THE QUOTE NAMES THE SUBJECT. Evidence that does not contain the thing it is cited
//      for is weak however long it is, and long quotes are not better than short ones.
//      Ranking by LENGTH picked a four-line clinical aside over a headed revision notice.
//   2. THE AGENCY DATES ITS OWN REVISION. A quote carrying "revised" plus a date is the
//      agency confirming the change in its own document, which no longer rests on our
//      comparison at all.
//   3. A STATEWIDE BOOK, which any reader in that state can check for themselves.
//   4. A LONGER SERIES of editions behind the comparison.
//
// `dateStamped` deliberately requires a DATE or the word "revised". An earlier version
// also accepted "effective", which matched "if effective respirations are not restored"
// -- clinical prose, not a revision notice -- and put a naloxone line above a protocol
// page headed with its own revision date. A heuristic that fires on ordinary clinical
// English is not measuring self-dating, and the rank it produces is arbitrary.
const dateStamped = /\brevis(?:ed|ion)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i;
export function pickHeadline(events, agencies = []) {
  const added = events.filter(e => isAdd(e.changeType) && e.verification?.evidence);
  if (!added.length) return null;

  // A hand-checked event wins outright, and only if it is still in the data.
  for (const hc of HAND_CHECKED) {
    const hit = added.find(e => e.agencyKey === hc.agencyKey && e.subject === hc.subject);
    if (hit) return { ...hit, handChecked: hc };
  }
  const editionsOf = k => agencies.find(a => a.agencyKey === k)?.editions?.length || 0;
  // The quote is checked against BOTH the vocabulary key and the human label, because
  // the two carry different words and the key alone is not enough: CHEST_TUBE's own page
  // says "Finger Thoracostomy ... Tube Thoracostomy", which names the procedure exactly
  // and contains neither "chest" nor a long word from the key. Checking only the key
  // scored that quote as off-topic and ranked a routine medication line above it.
  const namesSubject = (e) => {
    const q = e.verification.evidence.toLowerCase();
    return `${e.subject || ''} ${e.subjectLabel || ''}`.toLowerCase()
      .split(/[^a-z]+/).filter(w => w.length > 4).some(w => q.includes(w));
  };
  // A PROCEDURE added, across a LONG gap, in a statewide book is the strongest shape a
  // change in this corpus takes: a procedure is a capability rather than a restock, a
  // multi-year gap between two editions of the same book is a real revision rather than
  // an errata pass, and a statewide document is one any reader in that state can check.
  const yearsApart = e => Math.max(0,
    (Date.parse(e.toDate) - Date.parse(e.fromDate)) / 31557600000) || 0;
  const score = e => (namesSubject(e) ? 1000 : 0)
    + (e.changeType === 'procedure_added' ? 400 : 0)
    + (dateStamped.test(e.verification.evidence) ? 300 : 0)
    + (e.jurisdiction === 'statewide' ? 150 : 0)
    + Math.min(yearsApart(e), 5) * 60
    + editionsOf(e.agencyKey) * 5;
  return added.slice().sort((a, b) => score(b) - score(a)
    || String(a.agencyKey).localeCompare(String(b.agencyKey)))[0];
}

export function render({ timeline, charts = {} }) {
  const ev = verifiedEvents(timeline);
  const all = timeline.events || [];
  const agencies = timeline.agencies || [];

  const covered = new Set(ev.map(e => e.agencyKey)).size;
  const states = [...new Set(ev.map(e => e.state).filter(Boolean))].sort();
  const adds = ev.filter(e => isAdd(e.changeType)).length;
  const drops = ev.filter(e => isDrop(e.changeType)).length;

  // Everything the guards threw out, stated plainly. This number is larger than the
  // published one by an order of magnitude and that is the most honest thing on the page:
  // a timeline built from PDF differences is mostly noise, and the work is the rejecting.
  const rejected = (timeline.rejected || []).length;
  const candidates = all.filter(e => e.confidence === 'candidate').length;
  const unchanged = all.filter(e => e.changeType === 'unchanged').length;
  const authEvents = all.filter(e => e.changeType === 'authorization_changed').length;
  const certEvents = all.filter(e => e.changeType === 'cert_changed').length;

  const head = pickHeadline(ev, agencies);
  const headAgency = head && agencies.find(a => a.agencyKey === head.agencyKey);
  const headEditions = headAgency ? headAgency.editions.length : 0;

  // Editions read, across every agency the timeline could use: the denominator behind
  // every event on this page.
  const editions = agencies.reduce((s, a) => s + (a.editions?.length || 0), 0);

  // ── the ledger ────────────────────────────────────────────────────────────────────
  // Grouped by agency and ordered by the change date, because "what did MY system do"
  // is the question a medic brings, and a single national list by date answers nobody's.
  const byAgency = new Map();
  for (const e of ev) {
    if (!byAgency.has(e.agencyKey)) byAgency.set(e.agencyKey, []);
    byAgency.get(e.agencyKey).push(e);
  }
  const ledger = [...byAgency.entries()]
    .map(([key, es]) => ({
      key,
      name: es[0].agencyName,
      state: es[0].state,
      jurisdiction: es[0].jurisdiction,
      events: es.slice().sort((a, b) => String(a.toDate).localeCompare(String(b.toDate))
        || String(subjectOf(a)).localeCompare(String(subjectOf(b)))),
      editions: (agencies.find(a => a.agencyKey === key)?.editions || []).length,
    }))
    .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name));

  // "added" can be stated plainly; "dropped" can only be stated as what the books did.
  const verb = e => isAdd(e.changeType)
    ? 'first appears in'
    : 'is not named in';

  const evRow = (e) => `          <tr>
            <td class="ch-when">${fmtMonth(e.fromDate)} &rarr; ${fmtMonth(e.toDate)}</td>
            <td class="ch-what"><span class="ch-dir ch-${isAdd(e.changeType) ? 'add' : 'drop'}">${isAdd(e.changeType) ? 'Added' : 'Stopped naming'}</span>
              <strong>${escapeHtml(subjectOf(e))}</strong>
              <span class="ch-kind">${CHANGE_LABEL[e.changeType] || e.changeType}</span></td>
            <td class="ch-ev">${e.verification?.evidence
    ? `<q>${escapeHtml(String(e.verification.evidence).replace(/\s+/g, ' ').trim().slice(0, 260))}</q>
              <span class="ch-cite">page ${e.verification.page ?? (e.sourcePages || [])[0] ?? '&mdash;'}, ${fmtMonth(verb(e) === 'first appears in' ? e.toDate : e.fromDate)} edition</span>`
    : `<span class="ch-cite">page ${(e.sourcePages || []).join(', ') || '&mdash;'}</span>`}</td>
          </tr>`;

  const agencyBlock = a => `      <section class="ch-agency">
        <h3>${escapeHtml(a.name)}<span class="ch-meta">${escapeHtml(a.state || '')} &middot; ${escapeHtml(a.jurisdiction || '')} &middot; ${a.editions} editions read</span></h3>
        <div class="table-scroll">
        <table class="res-table ch-table">
          <thead><tr><th scope="col">Between editions</th><th scope="col">Change</th><th scope="col">What the page says</th></tr></thead>
          <tbody>
${a.events.map(evRow).join('\n')}
          </tbody>
        </table>
        </div>
      </section>`;

  const headBlock = head ? `    <section class="res-headline ch-headline">
      <div class="res-eyebrow">${escapeHtml(head.agencyName)} &middot; ${escapeHtml(head.state || '')}</div>
      <h2>${escapeHtml(subjectOf(head))} was not in the ${fmtMonth(head.fromDate)} book. It is in the ${fmtMonth(head.toDate)} one.</h2>
      <p class="ch-lede">Same agency, same statewide document, ${headEditions} dated editions of it.
      The ${fmtMonth(head.toDate)} edition names it on page ${head.verification.page}; the
      ${fmtMonth(head.fromDate)} edition does not name it anywhere.</p>
      <blockquote class="ch-quote">
        <p>${escapeHtml(String(head.verification.evidence).replace(/\s+/g, ' ').trim())}</p>
        <cite>${escapeHtml(head.agencyName)}, ${fmtMonth(head.toDate)} edition, page ${head.verification.page}</cite>
      </blockquote>
      <p class="headline-note">We did not infer this from a word count. The quote above was
      re-found on the page it was cited from before this event was allowed to publish, which is
      what &ldquo;verified&rdquo; means everywhere on this page.${head.handChecked
    ? ` ${head.handChecked.note}` : ''}</p>
    </section>` : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>What changed - US EMS protocols between dated editions</title>
  <meta name="description" content="US EMS agencies revise their protocols quietly. We read ${n(editions)} dated editions from ${agencies.length} agencies and report what appeared and what stopped appearing between them, each change quoted from the page it was found on.">
  <link rel="canonical" href="https://protoquiz.com/research/changes/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="What changed in US EMS protocols">
  <meta property="og:description" content="Agencies revise their protocols quietly. We read the dated editions in sequence and report what appeared and what stopped appearing, quoted from the page.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://protoquiz.com/research/changes/">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:site_name" content="ProtoQuiz">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${navFor('/research/')}
${researchBar('/research/changes/')}

  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">Protocol census &middot; a finding</div>
      <h1>Protocols change. Almost nobody announces it.</h1>
      <p class="lede">An agency publishes a new edition of its protocol book and the old one
      disappears from the website. Nothing says what moved. We kept the old editions, read
      ${n(editions)} dated books from ${agencies.length} agencies in sequence, and report what
      appeared and what stopped appearing between them &mdash; each one quoted from the page it
      was found on.</p>
    </section>

${headBlock}

    <section class="res-map-wrap">
      <figure class="practice-fig">
${charts.changes || '<p class="rm-cap">Chart unavailable: the timeline extract was not readable at build time.</p>'}
        <figcaption class="rm-cap">Every verified change this timeline holds, by agency. The
        shape of this chart is the finding as much as the bars are: ${covered} agencies, very
        unevenly. An agency near the bottom is not a stable one &mdash; it is one we hold fewer
        editions of.</figcaption>
      </figure>
    </section>

    <section class="res-headline">
      <div class="res-eyebrow">What survived verification</div>
      <dl class="vol-stats ch-stats">
        <div><dt>${n(ev.length)}</dt><dd>changes published, each re-read on the page it was cited from</dd></div>
        <div><dt>${n(adds)}</dt><dd>things a later edition added</dd></div>
        <div><dt>${n(drops)}</dt><dd>things a later edition stopped naming</dd></div>
        <div><dt>${n(rejected)}</dt><dd>candidate changes the guards threw out</dd></div>
      </dl>
      <p class="headline-note">The fourth number is the one to read first. Comparing two PDFs
      produces mostly noise &mdash; a reorganised chapter, a term the extractor missed, one
      edition twice the length of the other &mdash; and ${n(rejected)} candidates were rejected
      to publish ${n(ev.length)}. A further ${n(candidates)} survived the guards but were never
      re-read against the page, so they are leads and are not shown here.
      ${unchanged ? `${n(unchanged)} edition pairs came back with no difference at all, which is
      also a result.` : ''}</p>
    </section>

    <section class="res-table-wrap">
      <h2>The ledger</h2>
      <p class="res-subnote">Grouped by agency, in the order the changes happened, because
      &ldquo;what did my system change&rdquo; is the question this is for. Every row names the
      two editions, the page, and what that page says.</p>
${ledger.map(agencyBlock).join('\n')}
    </section>

    <section class="res-method">
      <h2>Why a row says &ldquo;stopped naming&rdquo; and never &ldquo;stopped doing&rdquo;</h2>
      <p>This is the whole discipline of the page. When a procedure is in the ${states.length ? '' : ''}earlier
      edition and not the later one, what we know is exactly that: <strong>the later book does
      not name it</strong>. We do not know the agency stopped doing it. A protocol book is
      written to guide care, not to enumerate a scope of practice, and a procedure can move to a
      separate policy, a state rule, a training bulletin or a medical director&rsquo;s memo and
      go on being performed every day.</p>
      <p>So no row on this page says an agency stopped doing anything, and if you find one, it
      is a bug. Both editions were read successfully &mdash; a book we could not parse produces
      no rows rather than an empty one, because an unread document would otherwise look like an
      agency that dropped everything.</p>

      <h2>What we deliberately do not publish</h2>
      <p>We can tell you that ${n(authEvents)} authorization changes and ${n(certEvents)}
      certification changes were detected between editions, and we will not draw them as a
      trend. They were measured and they did not survive: the readings pointed both ways in
      similar numbers and none of them was grounded well enough to publish. The extractor is
      stable comparing one region against another and is <em>not</em> stable comparing one
      agency against its own past, and until that is fixed a direction drawn from these would be
      a picture of our instrument rather than of EMS.</p>
      <p>The half that does hold &mdash; who decides, compared across regions at one moment
      &mdash; is on <a href="/research/practice/">the authorization page</a>.</p>

      <h2>How far this reaches</h2>
      <p>${covered} agencies have a published change here${states.length ? ` (${states.join(', ')})` : ''},
      out of roughly 26,883 licensed EMS agencies nationally. This is not a national picture of
      how EMS is changing and cannot be read as one: an agency is here only if it publishes
      dated editions, keeps them readable, and published at least two we could hold side by
      side. What it is good for is showing that the changes are real, specific, and findable
      &mdash; and that nobody is currently telling the people who work there.</p>
      <p><a href="/research/practice/">Who decides: authorization across regions</a> &middot;
      <a href="/census/">The protocol census</a> &middot;
      <a href="/census/methodology/">Methodology</a></p>
    </section>
  </main>
${FOOTER_HTML}
</body>
</html>
`;
  return html;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const timeline = readTimeline();
  if (!timeline) {
    console.error('timeline_v2.json not found — set PRACTICE_DATA_DIR');
    process.exit(1);
  }
  const charts = existsSync('assets/practice-charts.json')
    ? JSON.parse(readFileSync('assets/practice-charts.json', 'utf8'))
    : {};
  const html = render({ timeline, charts });
  mkdirSync('research/changes', { recursive: true });
  writeFileSync('research/changes/index.html', html);
  console.log(`wrote research/changes/index.html — ${html.length} bytes`);
}
