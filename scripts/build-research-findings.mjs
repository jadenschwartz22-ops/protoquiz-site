// scripts/build-research-findings.mjs — /research/doses/ and /research/carry/.
//
// The two census findings behind the slides on /research. Charts and numbers come from
// assets/research-thumbs.json (build-research-thumbs.mjs), so a slide and its page can
// never disagree. No agency names: these are counts across the census.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD, assetHash } from './shared-chrome.mjs';
import { indicationLabel } from './census-pages.mjs';

const T = JSON.parse(readFileSync('assets/research-thumbs.json', 'utf8'));
const n = x => Number(x).toLocaleString('en-US');
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const label = k => k.charAt(0) + k.slice(1).toLowerCase();
const drug = k => existsSync(`census/drugs/${slug(k)}/index.html`)
  ? `<a href="/census/drugs/${slug(k)}/">${label(k)}</a>` : label(k);

const page = ({ path, title, desc, body }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - ProtoQuiz Research</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="https://protoquiz.com${path}">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://protoquiz.com${path}">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:site_name" content="ProtoQuiz">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css?v=${assetHash('assets/research.css')}">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${navFor('/research/')}
${researchBar(path)}
  <main id="main">
${body}
    <section class="res-method">
      <p><a href="/census/methodology/">Census methodology</a> &middot;
      <a href="/census/data-license/">Data license</a></p>
    </section>
  </main>
${FOOTER_HTML}
</body>
</html>
`;

const table = (head, rows) => `      <div class="table-scroll">
      <table class="res-table fnd-table">
        <thead><tr>${head.map(([h, num]) => `<th scope="col"${num ? ' class="num"' : ''}>${h}</th>`).join('')}</tr></thead>
        <tbody>
${rows.join('\n')}
        </tbody>
      </table>
      </div>`;

// Filter bar + short default view. Without JS the bar stays hidden and every row shows.
// A row carries data-q (search text), data-c (its chip) and data-top (in the short view).
const filter = (chips = []) => `      <div class="fnd-filter" hidden>
        <input type="search" class="fnd-q" placeholder="Search" aria-label="Search the table">${chips.length ? `
        <div class="fnd-chips">${chips.map(c => `<button type="button" data-c="${slug(c)}" aria-pressed="false">${c}</button>`).join('')}<button type="button" data-c="all" aria-pressed="false">All</button></div>` : ''}
      </div>`;
const more = count => `      <p class="fnd-more" hidden><span class="fnd-none" hidden>No match.</span><button type="button">Show all ${count}</button></p>
      <script>
        (function () {
          var box = document.querySelector('.fnd-filter'), more = document.querySelector('.fnd-more');
          var q = box.querySelector('.fnd-q'), chips = [].slice.call(box.querySelectorAll('[data-c]'));
          var rows = [].slice.call(document.querySelectorAll('.fnd-table tbody tr')), c = '';
          function apply() {
            var t = q.value.trim().toLowerCase(), n = 0;
            rows.forEach(function (r) {
              r.hidden = t ? r.dataset.q.indexOf(t) < 0 : c === 'all' ? false : c ? r.dataset.c !== c : !r.hasAttribute('data-top');
              if (!r.hidden) n++;
            });
            chips.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.c === c); });
            more.hidden = c === 'all' && !t;
            more.querySelector('button').hidden = !!t || c === 'all';
            more.querySelector('.fnd-none').hidden = n > 0;
          }
          box.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]');
            if (b) { c = c === b.dataset.c ? '' : b.dataset.c; q.value = ''; apply(); }
          });
          q.addEventListener('input', apply);
          more.querySelector('button').addEventListener('click', function () { c = 'all'; apply(); });
          box.hidden = false; apply();
        })();
      </script>`;

const write = (path, html) => {
  mkdirSync(path.slice(1), { recursive: true });
  writeFileSync(`${path.slice(1)}index.html`, html);
  console.log(`wrote ${path}index.html — ${html.length} bytes`);
};

// ── /research/doses/ ──────────────────────────────────────────────────────────────────
// Chips are the calls a medic runs every week; each groups the census indications behind it.
const CHIPS = [
  ['Seizure', ['SEIZURE']],
  ['Pain', ['PAIN_MILD_MODERATE', 'PAIN_SEVERE']],
  ['Cardiac arrest', ['CARDIAC_ARREST', 'VF_PVT']],
  ['Overdose', ['OPIOID_OVERDOSE', 'BETA_BLOCKER_CCB_OVERDOSE', 'TCA_OVERDOSE']],
  ['Allergic/Anaphylaxis', ['ALLERGIC_REACTION', 'ANAPHYLAXIS']],
  ['Hypoglycemia', ['HYPOGLYCEMIA']],
  ['Trauma', ['TRAUMA_HEMORRHAGE', 'CRUSH_INJURY']],
  ['Agitation', ['AGITATION', 'EXCITED_DELIRIUM']],
];
const chipOf = k => slug(CHIPS.find(([, ks]) => ks.includes(k))?.[0] ?? '');
// One row's spread, drawn on its own scale like the hub chart: whiskers min to max,
// box p25 to p75, median line. When the middle half is one value, a dot marks the dose
// most agencies agree on, and the text says so (the census drug pages do the same).
const agrees = r => r.q[1] === r.q[3];
const boxSvg = ([mn, p25, md, p75, mx], med) => {
  const at = v => mx === mn ? 50 : +(3 + ((v - mn) / (mx - mn)) * 94).toFixed(1);
  return `<svg viewBox="0 0 100 14" class="fnd-box" role="img" aria-label="median ${med}"><path d="M${at(mn)} 7H${at(mx)}M${at(mn)} 3v8M${at(mx)} 3v8" class="w"/>${p75 === p25
    ? `<circle cx="${at(p25)}" cy="7" r="5" class="agree"/>`
    : `<rect x="${at(p25)}" y="2.5" width="${(at(p75) - at(p25)).toFixed(1)}" height="9"/><path d="M${at(md)} 1.5v11" class="m"/>`}</svg>`;
};
const span = r => r.lo === r.hi ? r.hi : `${r.lo.split(' ')[0]} to ${r.hi}`;
const range = r => !agrees(r) ? span(r)
  : r.lo === r.hi ? `<strong>All use ${r.hi}</strong>` : `<strong>Most use ${r.med}</strong> <span class="fnd-of">of ${span(r)}</span>`;
const TOP = 10;
const doses = [...T.doseTable].sort((a, b) =>
  indicationLabel(a.indicationKey).localeCompare(indicationLabel(b.indicationKey)) || a.drugKey.localeCompare(b.drugKey));
const topDoses = new Set([...doses].sort((a, b) => b.n - a.n).slice(0, TOP));
write('/research/doses/', page({
  path: '/research/doses/',
  title: 'Same call, different dose',
  desc: 'The lowest to highest adult dose US EMS protocols give for the same call, across the agencies in the ProtoQuiz protocol census.',
  body: `    <section class="res-hero fnd-hero">
      <div>
        <div class="res-eyebrow">Protocol census &middot; a finding</div>
        <h1>Same call, different dose</h1>
        <p class="lede">Lowest to highest adult dose across agencies. Box is the middle half; line is the median; a dot means most agree on one dose.</p>
      </div>
      <figure class="fnd-fig">${T.census}</figure>
    </section>
    <section class="res-table-wrap">
      <h2>Every well-covered call <span class="fnd-sub">adult, fixed doses, 15+ protocols each</span></h2>
${filter(CHIPS.map(([c]) => c))}
${table([['Call'], ['Dose range'], ['Agencies', 1]], doses.map(r => {
  const call = indicationLabel(r.indicationKey);
  return `          <tr data-q="${`${call} ${label(r.drugKey)}`.toLowerCase()}" data-c="${chipOf(r.indicationKey)}"${topDoses.has(r) ? ' data-top' : ''}><th scope="row">${call}<span class="fnd-drug">${drug(r.drugKey)}</span></th><td class="fnd-rng" title="Lowest ${r.lo}, median ${r.med}, highest ${r.hi}">${boxSvg(r.q, r.med)}<span>${range(r)}</span></td><td class="num">${n(r.n)}</td></tr>`;
}))}
${more(doses.length)}
    </section>`,
}));

// ── /research/carry/ ──────────────────────────────────────────────────────────────────
// Items named by one or two agencies are mostly spellings and translations of the drugs
// above them, so the table starts at three.
const MIN = 3;
const carried = T.carryTable.filter(([, c]) => c >= MIN);
const F = T.formularyStats, Z = T.carryZones;
const topCarry = 15;
write('/research/carry/', page({
  path: '/research/carry/',
  title: 'Where agencies split',
  desc: `What ${n(T.carryN)} US EMS agencies carry: ${Z.core} medications are on nearly every protocol, ${Z.split} split agencies down the middle.`,
  body: `    <section class="res-hero fnd-hero">
      <div>
        <div class="res-eyebrow">Protocol census &middot; what agencies carry</div>
        <h1>Where agencies split</h1>
        <p class="lede">${Z.core} medications are on nearly every protocol. ${Z.split} more are on a quarter to three quarters of them: that is where agencies disagree.</p>
        <p class="fnd-note">Share of ${n(T.carryN)} agencies whose protocol lists it as a medication.</p>
      </div>
      <figure class="fnd-fig">${T.carry}</figure>
    </section>
    <section class="res-table-wrap fnd-pair" id="formulary">
      <div>
        <h2>Formulary size</h2>
        <p class="fnd-note">Medications each protocol lists: median ${F.median}, most ${F.max}, across ${n(F.n)} agencies.</p>
      </div>
      <figure class="fnd-fig">${T.formulary}</figure>
    </section>
    <section class="res-table-wrap">
      <h2>Every medication <span class="fnd-sub">named by ${MIN}+ agencies; blood and procedures come later</span></h2>
${filter()}
${table([['Medication'], ['Lists it', 1]], carried.map(([k, c], i) => {
  const pct = Math.round((c / T.carryN) * 100);
  return `          <tr data-q="${label(k).toLowerCase()}" data-c=""${i < topCarry ? ' data-top' : ''}><th scope="row">${drug(k)}</th><td class="num fnd-pct" title="${n(c)} of ${n(T.carryN)} agencies"><span class="fnd-bar"><i style="width:${pct}%"></i></span>${pct}%</td></tr>`;
}))}
${more(carried.length)}
    </section>`,
}));
