// scripts/build-practice.mjs — /research/practice, what a crew may do and who decides.
//
// A finding of the protocol census, not a new volume: the census answers "what does this
// agency carry", and this page answers the two questions a medic asks NEXT — may I do
// this without calling, and does the state next door let my certification do it at all.
//
// It is a STANDALONE page by necessity and by design. census-pages.mjs needs the private
// dose rows to build anything, so the ~770 census URLs cannot be regenerated outside the
// nightly; this page reads the procedure and scope extracts directly and owns its own
// URL, so it ships and rebuilds without touching that tree.
//
// EVERY NUMBER ON THIS PAGE IS DERIVED AT BUILD TIME. The extracts are regenerated
// nightly and the row counts move, so a figure typed into a sentence would be wrong
// within a day and would look authoritative while it was. If you find yourself about to
// write a number in prose here, compute it instead.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';
import {
  readProcedures, readScope, byProcedure, contested, MIN_PER_SIDE,
  matrixOnly, scopeDisagreements, authOf,
  n, COPY, escapeHtml,
} from './practice-data.mjs';

export function render({ proc, scope, charts = {} }) {
  const rows = proc.rows;
  const groups = byProcedure(rows);
  const con = contested(groups);

  const agencies = new Set(rows.map(r => r.agencyKey)).size;
  const states = new Set(rows.map(r => r.state).filter(Boolean)).size;
  const procedures = groups.length;

  // The headline bar is counted over AGENCY-PROCEDURE PAIRS, the same unit the table and
  // the chart use, so a reader comparing the bar to a row is comparing like with like.
  // Counting rows instead would let one verbose book outweigh twenty terse ones AND would
  // disagree with every other number on the page.
  const authTotals = groups.reduce((a, g) => ({
    standing: a.standing + g.standing,
    contact_required: a.contact_required + g.contact_required,
    conditional: a.conditional + g.conditional,
    unknown: a.unknown + g.unknown,
  }), { standing: 0, contact_required: 0, conditional: 0, unknown: 0 });
  const authAll = groups.reduce((a, g) => a + g.n, 0);
  const pct = v => Math.round((v / authAll) * 100);

  // Certification. `unknown` and `certUndeterminable` are counted SEPARATELY and never
  // pooled: one is a fact we could not read, the other is a document telling us the
  // answer is set somewhere else. Michigan's statewide book is the second kind.
  const undeterminable = rows.filter(r => r.certUndeterminable);
  const certUnknown = rows.filter(r => !r.certUndeterminable && (!r.certLevel || r.certLevel === 'unknown'));
  const certStated = rows.length - undeterminable.length - certUnknown.length;
  const undetAgencies = new Set(undeterminable.map(r => r.agencyKey));
  const undetStates = [...new Set(undeterminable.map(r => r.state).filter(Boolean))].sort();

  const scopeRows = scope ? scope.rows : [];
  const matrix = matrixOnly(scopeRows);
  const dis = scope ? scopeDisagreements(scopeRows) : [];
  const matrixStates = [...new Set(matrix.map(r => r.state))].sort();
  const sectionStates = [...new Set(scopeRows.filter(r => r.shape !== 'matrix').map(r => r.state))]
    .filter(s => !matrixStates.includes(s)).sort();

  // ── the contested table ───────────────────────────────────────────────────────────
  const conRow = g => `        <tr>
          <th scope="row">${escapeHtml(g.label)}</th>
          <td class="num">${g.n}</td>
          <td class="num a-so">${g.standing}</td>
          <td class="num a-cr">${g.contact_required}</td>
          <td class="num a-cd">${g.conditional}</td>
          <td class="num a-un">${g.unknown}</td>
        </tr>`;

  // ── the scope disagreement table ──────────────────────────────────────────────────
  // yes / no side by side, both sides read off a competency matrix. The state code
  // carries the verdict as a class so the answer is legible without reading the word,
  // and the word is there anyway for anyone who cannot see the colour.
  const disRow = d => `        <tr>
          <th scope="row">${escapeHtml(d.skill)}</th>
          <td>${d.certLabel}</td>
          <td class="sc-states">${d.states.map(s =>
    `<span class="sc-${s.permitted}"><abbr title="${escapeHtml(s.source || '')}, page ${s.page}">${s.state}</abbr> ${s.permitted === 'yes' ? 'yes' : 'no'}</span>`).join(' ')}</td>
        </tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Who decides - authorization and certification across US EMS protocols</title>
  <meta name="description" content="The same procedure is a standing order in one US EMS system and requires calling a physician in another. Read from ${n(agencies)} agencies' own protocol books, and from state competency matrices where a state enumerates what each certification level may do.">
  <link rel="canonical" href="https://protoquiz.com/research/practice/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="Who decides: authorization and certification across US EMS">
  <meta property="og:description" content="The same procedure is a standing order in one EMS system and requires a physician's permission in another. Read from the agencies' own protocol books.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://protoquiz.com/research/practice/">
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
${researchBar('/research/practice/')}

  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">Protocol census &middot; a finding</div>
      <h1>The same procedure. A different person deciding.</h1>
      <p class="lede">A paramedic decompresses a chest on their own authority in one county
      and telephones a physician for permission in the next. Both crews trained to the same
      national standard. We read ${n(agencies)} agencies&rsquo; protocol books across
      ${states} states to see how far that reaches, and it reaches further than the
      procedure list does.</p>
    </section>

    <section class="res-map-wrap">
      <figure class="practice-fig">
${charts.contested || '<p class="rm-cap">Chart unavailable: the procedure extract was not readable at build time.</p>'}
        <figcaption class="rm-cap">Procedures where at least ${MIN_PER_SIDE} agencies make it a
        standing order and at least ${MIN_PER_SIDE} require contacting a physician first. Each
        bar counts agencies, not pages: an agency whose book names a procedure on nine pages
        is one practice, not nine votes.</figcaption>
      </figure>
    </section>

    <section class="res-headline">
      <div class="res-eyebrow">Across ${n(authAll)} agency-and-procedure pairs</div>
      <div class="bar">
        <div class="bar-seg a-seg-so" style="width:${pct(authTotals.standing)}%"><span>${pct(authTotals.standing)}%</span></div>
        <div class="bar-seg a-seg-cr" style="width:${pct(authTotals.contact_required)}%"><span>${pct(authTotals.contact_required)}%</span></div>
        <div class="bar-seg a-seg-cd" style="width:${pct(authTotals.conditional)}%"><span>${pct(authTotals.conditional)}%</span></div>
        <div class="bar-seg a-seg-un" style="width:${pct(authTotals.unknown)}%"><span>${pct(authTotals.unknown)}%</span></div>
      </div>
      <div class="bar-key">
        <span class="key"><i class="a-seg-so"></i>Standing order &mdash; act, then report</span>
        <span class="key"><i class="a-seg-cr"></i>Contact required &mdash; call first</span>
        <span class="key"><i class="a-seg-cd"></i>Depends on the presentation</span>
        <span class="key"><i class="a-seg-un"></i>Not stated in the book</span>
      </div>
      <p class="headline-note"><strong>&ldquo;Depends&rdquo; is a real answer, not a muddle.</strong>
      Those books give BOTH answers for the same procedure &mdash; a standing order in one
      presentation, a call to a physician in another, most often cardiac arrest against
      everything else. Counting such an agency on both sides would make the columns add up to
      more agencies than exist, and picking a side for it would invent a policy its book does
      not have. So it is counted once, here. ${COPY.notStated}</p>
    </section>

    <section class="res-table-wrap">
      <h2>Where agencies disagree about who decides</h2>
      <p class="res-subnote">${con.length} of ${procedures} procedures in the vocabulary are
      contested: enough agencies commit to each single answer that neither is one
      document&rsquo;s habit. Ordered by how many agencies took a side, so the best-evidenced
      disagreements sit at the top. Every agency appears in exactly one column of a row, and
      the four columns add up to the agencies naming that procedure.</p>
      <div class="table-scroll">
      <table class="res-table">
        <thead>
          <tr>
            <th scope="col">Procedure</th>
            <th scope="col" class="num">Agencies naming it</th>
            <th scope="col" class="num">Standing order</th>
            <th scope="col" class="num">Contact required</th>
            <th scope="col" class="num">Depends</th>
            <th scope="col" class="num">Not stated</th>
          </tr>
        </thead>
        <tbody>
${con.map(conRow).join('\n')}
        </tbody>
      </table>
      </div>
      <p class="headline-note"><strong>These columns do not add up to a national picture, and
      should not be read as one.</strong> They count the agencies whose published book we have
      read. An agency absent from a row did not decline the procedure &mdash; it is simply not
      in the corpus, or its book does not name the procedure in words this extractor reads.</p>
    </section>

${dis.length ? `    <section class="res-table-wrap">
      <h2>Where states disagree at the same certification level</h2>
      <p class="res-subnote">This is the one comparison in the census where a
      <em>no</em> is publishable. ${matrixStates.length} states publish a real competency
      matrix &mdash; every skill against every certification level, each cell ticked or not
      &mdash; and an unticked cell in an enumeration like that is the state saying no, not the
      document being quiet. Below are the ${dis.length} skills where two of those states, at
      the same level, give opposite answers.</p>
      <div class="table-scroll">
      <table class="res-table">
        <thead>
          <tr><th scope="col">Skill, as the state names it</th><th scope="col">Level</th>
          <th scope="col">What each state&rsquo;s matrix says</th></tr>
        </thead>
        <tbody>
${dis.map(disRow).join('\n')}
        </tbody>
      </table>
      </div>
      <p class="headline-note">Skills are matched on the state&rsquo;s own wording, so this
      table <strong>undercounts</strong>: one state&rsquo;s &ldquo;Cardiac Pacing&rdquo; and
      another&rsquo;s &ldquo;Transcutaneous Pacing&rdquo; are the same skill and will not pair
      here. An instrument that can only miss disagreements is the right way round for this
      question.${sectionStates.length ? ` ${sectionStates.length} further states
      (${sectionStates.join(', ')}) publish scope as prose rather than a matrix. Nothing they
      leave out appears here as a <em>no</em>, because a list of what a level may do is not a
      list of what it may not.` : ''}</p>
    </section>` : ''}

    <section class="res-method">
      <h2>What a certification level is, and when we cannot tell you</h2>
      <p>${n(certStated)} of ${n(rows.length)} readings name the level that may perform the
      procedure. The rest split into two groups that this page refuses to pool, because they
      are not the same fact:</p>
      <dl class="tierdl">
        <dt><span class="tierchip t-unk"></span>Not stated &mdash; ${n(certUnknown.length)} readings</dt>
        <dd>The page names the procedure and never names a level. We could not read the
        answer, so we do not print one. This is an absence of evidence in our reading, not a
        statement by the agency.</dd>
${undeterminable.length ? `        <dt><span class="tierchip t-und"></span>Set elsewhere by design &mdash; ${n(undeterminable.length)} readings, ${undetAgencies.size} ${undetAgencies.size === 1 ? 'agency' : 'agencies'}${undetStates.length ? ` (${undetStates.join(', ')})` : ''}</dt>
        <dd>${COPY.undeterminable} We hold this apart from &ldquo;not stated&rdquo; because the
        document is not failing to answer &mdash; it is answering that the answer is local.
        Rolling it into a missing-data bucket would erase one of the more interesting facts in
        the corpus.</dd>` : `        <dt><span class="tierchip t-und"></span>Set elsewhere by design &mdash; none in this build</dt>
        <dd>${COPY.undeterminable} No reading in the current extract carries that flag, so the
        page shows none. It is kept here, and counted separately the moment one appears,
        because the distinction is the point: a document that declines to set a tier has said
        something, and folding it into &ldquo;not stated&rdquo; would throw it away.</dd>`}
      </dl>

      <h2>What this page will never tell you</h2>
      <p><strong>${COPY.presenceOnly}</strong></p>
      <p>Nowhere on this page does an agency appear as not doing something. The census reads
      what books say, and a protocol book is written to guide care, not to enumerate a scope of
      practice: it can omit a procedure the crew performs daily under a separate policy, a
      state rule or a medical director&rsquo;s standing memo. The only negatives we publish are
      the state matrix cells above, and they are negatives because a matrix is an enumeration
      &mdash; it lists every skill and every level and ticks the boxes, so an unticked box is
      the document speaking.</p>

      <h2>How far this reaches</h2>
      <p>${n(agencies)} agencies across ${states} states, of roughly 26,883 licensed EMS
      agencies our own roster research counts nationally. That is a sample, and a sample chosen
      by which agencies publish their protocols in a readable form &mdash; which is not a random
      slice of American EMS. Read every count here as &ldquo;of the books we have read&rdquo;,
      never as &ldquo;of the country&rdquo;.</p>
      <p>Every reading carries the document and the page it came from, and is rebuilt from the
      source documents on each run rather than edited in place.</p>
      <p><a href="/census/">Open the protocol census</a> &middot;
      <a href="/research/changes/">How these books change over time</a> &middot;
      <a href="/census/methodology/">Census methodology</a></p>
    </section>
  </main>
${FOOTER_HTML}
</body>
</html>
`;
  return html;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const CHARTS = existsSync('assets/practice-charts.json')
    ? JSON.parse(readFileSync('assets/practice-charts.json', 'utf8'))
    : {};
  const proc = readProcedures();
  if (!proc) {
    console.error('procedures_corpus_full.json not found — set PRACTICE_DATA_DIR');
    process.exit(1);
  }
  const html = render({ proc, scope: readScope(), charts: CHARTS });
  mkdirSync('research/practice', { recursive: true });
  writeFileSync('research/practice/index.html', html);
  console.log(`wrote research/practice/index.html — ${html.length} bytes`);
}
