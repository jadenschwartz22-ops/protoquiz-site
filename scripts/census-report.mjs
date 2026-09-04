#!/usr/bin/env node
// "State of EMS Protocols" — one edition page rendered from compare.json.
//
//   node scripts/census-report.mjs --edition 2026-09 --out <dir> [--data <dir>]
//   node scripts/census-report.mjs --candidates [--data <dir>]
//
// AGGREGATE-FIRST (decided 2026-09-04): edition #1 shows distributions with their n
// and NO agency labels. Named agencies appear on their own pages and, after courtesy
// emails, in edition #2. Nothing here reads the private row file — the report is built
// from exactly the same public file the site pages and the compare endpoint serve, so
// a number in the report and the same number on a page cannot disagree.
//
// The findings are chosen by the DATA, not by hand: groups ranked by spread at the
// highest source floor that still yields six of them. Below six at the lowest floor the
// edition does not ship — a thin report is worse than no report, and printing the
// candidate list makes the reason legible instead of leaving it to judgment.
//
// Determinism, same as census-pages.mjs: nothing reads the clock, asOf comes from the
// data, and two runs over the same input produce byte-identical bytes.
//
// SITEMAPS: this script writes ONE file, the edition page, and no sitemap. Report
// editions are not in sitemap-census.xml, which census-pages.mjs builds from the page
// tree it generates and which does not include /census/report/. The repo's committed
// sitemap-index.xml also deliberately omits the census sitemap entirely — that omission
// is correct only while the census is unpublished and ends the night item 9 first
// rsyncs the generated sitemap-index to the repo root under CENSUS_PUBLISH=1. Adding
// report editions to a sitemap is an item-9 decision (they are a handful of URLs a
// month and are linked from the census landing), deliberately not made here.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ORIGIN = 'https://protoquiz.com';
const APP_ID = '6753611139';
const GA_ID = 'G-LNSS9BMEP8';

// Floors are tried highest first. 15 is the number worth writing about; 8 is the floor
// below which "across US EMS protocols" is a claim about eight documents.
export const FLOORS = [15, 10, 8];
export const MIN_FINDINGS = 6;
export const MAX_FINDINGS = 8;

const DISCLAIMER = 'Training reference compiled from published protocols. Not a clinical order. Verify with your agency and medical director.';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonLdText = obj => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const num = n => Number(n).toLocaleString('en-US');
const fmtNum = v => (v == null ? 'not captured' : String(Number(v.toFixed(4))));
const titleCase = s => String(s ?? '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
const drugLabel = k => titleCase(String(k).replace(/_/g, ' '));
const indicationLabel = k => titleCase(String(k).replace(/_/g, ' '));
const popLabel = p => (p === 'peds' ? 'pediatric' : 'adult');
const unitLabel = k => `${k.unit ?? ''}${k.perKg ? '/kg' : ''}`;

// ------------------------------------------------------------------- selection

/**
 * spread = (p75 - p25) / median — the interquartile range as a fraction of the middle
 * value. It is the right ranking for "where do agencies disagree": min-to-max would be
 * ranked by whichever single document is furthest out, which is the thing the outlier
 * review already removes rather than the thing worth writing about. A zero or absent
 * median has no meaningful spread and is excluded rather than treated as agreement.
 */
export const spreadOf = g => (g.dist && g.dist.median ? (g.dist.p75 - g.dist.p25) / g.dist.median : null);

const eligible = (groups, floor) => groups.filter(g => g.dist && g.n.sources >= floor && spreadOf(g) !== null);

/** Ranked by spread, then by sources, then by the key — so ties never depend on input order. */
const rank = gs => [...gs].sort((a, b) => (spreadOf(b) - spreadOf(a))
  || (b.n.sources - a.n.sources)
  || `${a.key.drugKey} ${a.key.indicationKey} ${a.key.population} ${a.key.unit}`
    .localeCompare(`${b.key.drugKey} ${b.key.indicationKey} ${b.key.population} ${b.key.unit}`));

/**
 * selectFindings(groups) -> {floor, findings} | {floor: null, findings: [], candidates}
 *
 * The floor steps down only when the higher one cannot fill the edition. It never steps
 * down to get MORE findings than MAX_FINDINGS — the point of the floor is the strength
 * of each claim, not the length of the page.
 */
export function selectFindings(groups) {
  const candidates = FLOORS.map(floor => ({ floor, count: eligible(groups, floor).length }));
  for (const floor of FLOORS) {
    const gs = eligible(groups, floor);
    if (gs.length >= MIN_FINDINGS) {
      return { floor, findings: rank(gs).slice(0, MAX_FINDINGS), candidates };
    }
  }
  return { floor: null, findings: [], candidates };
}

// --------------------------------------------------------------------- sentence

/**
 * One sentence per finding, and it says only what the distribution says. No causal
 * claim, no "should", no agency named — the numbers are a description of what is
 * published, not an argument about what is right.
 */
export function findingSentence(g) {
  const u = unitLabel(g.key);
  const d = g.dist;
  const same = d.p25 === d.p75;
  const half = same
    ? `the middle half of protocols all landing on ${fmtNum(d.median)} ${u}`
    : `the middle half between ${fmtNum(d.p25)} and ${fmtNum(d.p75)} ${u}`;
  const ends = d.min === d.max
    ? ''
    : ` The full published range runs ${fmtNum(d.min)} to ${fmtNum(d.max)} ${u}.`;
  return `Across ${num(g.n.sources)} published protocols, the ${popLabel(g.key.population)} `
    + `${drugLabel(g.key.drugKey).toLowerCase()} dose for ${indicationLabel(g.key.indicationKey).toLowerCase()} `
    + `has a median of ${fmtNum(d.median)} ${u}, with ${half}.${ends}`;
}

// ------------------------------------------------------------------------ chart
//
// CSS bars, no chart library — the same technique census-pages.mjs uses, so the report
// and the pages look like one thing and neither ships a runtime dependency.

function chart(g) {
  const d = g.dist;
  const span = d.max - d.min;
  const at = v => (span > 0 ? ((v - d.min) / span) * 100 : 50);
  const left = at(d.p25);
  const width = Math.max(at(d.p75) - left, 0.5);
  const u = unitLabel(g.key);
  return `        <figure class="chart">
          <div class="track"><span class="iqr" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span><span class="med" style="left:${at(d.median).toFixed(2)}%"></span></div>
          <table class="nums">
            <thead><tr><th>min</th><th>p25</th><th>median</th><th>p75</th><th>max</th></tr></thead>
            <tbody><tr>${[d.min, d.p25, d.median, d.p75, d.max].map(v => `<td>${esc(fmtNum(v))}</td>`).join('')}</tr></tbody>
          </table>
          <figcaption>${esc(u)}. One value per protocol &mdash; a document listing a drug several times gets one vote, its own median.</figcaption>
        </figure>`;
}

// ------------------------------------------------------------------------- page

const editionLabel = (edition) => {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const m = String(edition).match(/^(\d{4})-(\d{2})$/);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(edition);
};

export function reportPage({ edition, floor, findings, compare, manifest }) {
  const path = `/census/report/${edition}/`;
  const title = `State of EMS Protocols, ${editionLabel(edition)}`;
  const description = `Where United States EMS protocols agree on a dose and where they do not: ${findings.length} distributions from published protocols, each with its n and its source count.`;

  const body = `      <span class="badge">Report</span>
      <h1>${esc(title)}</h1>
      <p class="lede">${num(findings.length)} doses where US EMS protocols vary most, widest first &mdash; some spread far apart, some barely at all. Every figure is drawn from agencies' own published documents, one value per protocol, as of ${esc(compare.asOf)}.</p>

      <section id="how">
        <h2>How these were chosen</h2>
        <p>Nothing here was picked by hand. Every comparable group in the census was ranked by <strong>spread</strong> &mdash; the width of the middle half of protocols, as a fraction of the median &mdash; among groups with at least <strong>${num(floor)} published protocols</strong>, and the top ${num(findings.length)} are below. The floor stepped down from ${FLOORS.map(f => num(f)).join(' to ')} until ${num(MIN_FINDINGS)} groups cleared it; this edition used <strong>${num(floor)}</strong>.</p>
        <p>This edition names no agencies. The figures are aggregate distributions with their counts; individual agencies' protocols are published on <a href="/census/">their own census pages</a>. <a href="/census/methodology/">How the census is built</a> covers what is measured, what is not, and why no dose-level accuracy number is published.</p>
      </section>

${findings.map((g, i) => `      <section id="f${i + 1}">
        <h2>${num(i + 1)}. ${esc(drugLabel(g.key.drugKey))} for ${esc(indicationLabel(g.key.indicationKey))}${g.key.population === 'peds' ? ' (pediatric)' : ''}${g.key.perKg ? ', weight-based' : ''}</h2>
        <p>${esc(findingSentence(g))}</p>
${chart(g)}
        <p class="cite">${esc(g.cite)}</p>
      </section>`).join('\n')}

      <section id="caveats">
        <h2>What these numbers are not</h2>
        <p>They are a description of what agencies have published, not a recommendation and not a judgment about which protocol is right. A wide spread can mean genuine clinical disagreement, different patient populations, different transport times, or a difference in how a dose is written down &mdash; this data cannot tell those apart.</p>
        <p>Dose-level extraction accuracy has not been measured, and no accuracy figure is published anywhere on this site. Entries under outlier review are excluded from every number here.</p>
      </section>

      <section id="cite">
        <h2>Citation</h2>
        <p class="cite">ProtoQuiz EMS Census, ${esc(title)}, as of ${esc(compare.asOf)}. ${ORIGIN}${path}</p>
        <p class="muted">Summaries are published under <a href="/census/data-license/">CC BY 4.0</a>. Quote a finding with the citation line printed beneath it &mdash; the n is part of the number.</p>
      </section>`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [['Home', '/'], ['EMS Census', '/census/'], [title, path]]
        .map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Report',
      name: title,
      description,
      url: ORIGIN + path,
      datePublished: compare.asOf,
      license: `${ORIGIN}/census/data-license/`,
      creator: { '@type': 'Organization', name: 'ProtoQuiz', url: ORIGIN },
      isAccessibleForFree: true,
    },
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} - ProtoQuiz EMS Census</title>
  <meta name="description" content="${esc(description)}" />

  <meta name="apple-itunes-app" content="app-id=${APP_ID}" />
  <link rel="canonical" href="${ORIGIN}${path}">
  <meta name="robots" content="index,follow" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${ORIGIN}${path}" />
  <meta property="og:image" content="${ORIGIN}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${ORIGIN}/og-image.png" />
  <meta name="theme-color" content="#05080c" />

  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=4" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />

${jsonLd.map(j => `  <script type="application/ld+json">\n${jsonLdText(j)}\n  </script>`).join('\n')}

  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/census/census.css">
  <style>
.chart{margin:14px 0 6px;padding:0}
.chart .track{position:relative;height:16px;background:var(--panel);border:1px solid var(--line);border-radius:8px;margin:8px 0 8px}
.chart .iqr{position:absolute;top:2px;bottom:2px;background:var(--accent);opacity:.42;border-radius:5px}
.chart .med{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--accent)}
.chart .nums{font-size:.84rem;width:auto;min-width:min(100%,420px)}
.chart .nums th{font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-size:.68rem}
.chart .nums td{font-family:ui-monospace,SFMono-Regular,monospace}
.chart figcaption{font-size:.78rem;color:var(--muted);margin-top:4px}
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <nav class="navbar">
        <a href="/" class="brand-link"><img src="/logo-128.png" alt="ProtoQuiz logo" width="34" height="34"><span>ProtoQuiz</span></a>
        <div class="nav-links">
          <a href="/census/" class="nav-btn">Census</a>
          <a href="/agency/" class="nav-btn">For Agencies</a>
          <a href="/blog/" class="nav-btn">Blog</a>
        </div>
      </nav>
    </div>
  </header>
  <main>
    <div class="wrap">
      <nav class="crumbs"><a href="/">Home</a> <span class="sep">/</span> <a href="/census/">EMS Census</a> <span class="sep">/</span> <span>${esc(title)}</span></nav>
${body}
    </div>
  </main>
  <footer>
    <div class="wrap">
      <p class="disclaimer">${DISCLAIMER}</p>
      <p>&copy; 2026 Teach Me to Live LLC, d/b/a ProtoQuiz&trade;. &middot; <a href="/census/">EMS Census</a> &middot; <a href="/census/methodology/">Methodology</a> &middot; <a href="/census/data-license/">Data license</a> &middot; <a href="/agency/">For Agencies</a> &middot; <a href="/blog/">Blog</a></p>
    </div>
  </footer>
</body>
</html>
`;
  return { path, html };
}

// ------------------------------------------------------------------- LinkedIn
//
// A DRAFT for Jaden to post by hand through /pq-linkedin-post. Aggregate only, no
// agency names, and no accuracy claim of any kind (b2b-public-accuracy-claims): the
// census publishes none, so a post that implies one is a claim the site contradicts.

export function linkedinDraft({ edition, floor, findings, compare, manifest }) {
  const lead = findings[0];
  const lines = [
    `# State of EMS Protocols, ${editionLabel(edition)} — LinkedIn draft`,
    '',
    `Post from the ProtoQuiz Page. Aggregate only — no agency named, no accuracy claim.`,
    `Link: ${ORIGIN}/census/report/${edition}/`,
    '',
    '---',
    '',
    `We read ${num(manifest.namedAgencies)} US EMS agencies' published protocols and asked a simple question: where do they actually disagree about a dose?`,
    '',
    `${editionLabel(edition)}'s State of EMS Protocols is out. ${num(findings.length)} distributions, every one of them from at least ${num(floor)} published protocols, no agency named.`,
    '',
    lead ? `The one that surprised me: ${findingSentence(lead).replace(/^Across /, 'across ')}` : '',
    '',
    'Two things worth saying plainly about this data:',
    '',
    `- It describes what agencies published. It is not a recommendation, and a wide spread is not evidence that anyone is wrong — it can be clinical disagreement, different populations, or just a difference in how a dose gets written down.`,
    `- We have not measured dose-level extraction accuracy, so we do not publish an accuracy number. The methodology page says exactly that, along with what we do measure.`,
    '',
    `Full report and the methodology behind it: ${ORIGIN}/census/report/${edition}/`,
    '',
    '---',
    '',
    '## Notes for the poster',
    '',
    `- Floor used this edition: ${num(floor)} sources.`,
    `- As of: ${compare.asOf}.`,
    `- Do NOT add: "no errors", "medical-director reviewed", or any accuracy percentage.`,
    `- If the report did not ship this edition, post the coverage figures instead: ${num(manifest.namedAgencies)} named agencies, ${num(manifest.documents)} documents, ${num(manifest.doseRows)} dose entries.`,
    '',
  ];
  return `${lines.filter(l => l !== null).join('\n')}`;
}

// ----------------------------------------------------------------------- build

export function readCompare(dataDir) {
  const compare = JSON.parse(readFileSync(join(dataDir, 'compare.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(dataDir, 'manifest.json'), 'utf8'));
  if (compare.schemaVersion !== 3) {
    throw new Error(`compare.json: schemaVersion ${compare.schemaVersion}, the report needs 3`);
  }
  return { compare, manifest };
}

/**
 * buildReport -> {ok, floor, findings, candidates, page, linkedin}
 *
 * `ok: false` means the edition does not ship. The caller exits non-zero and prints the
 * candidate counts; nothing is rendered, because a page built from four groups would
 * make a claim about US EMS protocols that four documents cannot support.
 */
export function buildReport({ edition, compare, manifest }) {
  const { floor, findings, candidates } = selectFindings(compare.groups || []);
  if (!floor) return { ok: false, floor: null, findings: [], candidates };
  return {
    ok: true,
    floor,
    findings,
    candidates,
    page: reportPage({ edition, floor, findings, compare, manifest }),
    linkedin: linkedinDraft({ edition, floor, findings, compare, manifest }),
  };
}

const writeFile = (dest, content) => {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
};

// ------------------------------------------------------------------------ main

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
  };
  const dataDir = arg('data', 'data/census');
  let compare, manifest;
  try {
    ({ compare, manifest } = readCompare(dataDir));
  } catch (e) {
    // A version mismatch is an operator-legible sentence and the message is what an
    // operator (or a card) reads; a stack trace on top of it is noise.
    console.error(`census-report: ${e.message}`);
    if (!/schemaVersion/.test(e.message)) console.error(e.stack);
    process.exit(2);
  }
  const groups = compare.groups || [];

  if (process.argv.includes('--candidates')) {
    // The pre-step: how many groups clear each floor TODAY, before anyone commits to
    // an edition. Its output belongs in the ledger.
    console.log(`census-report --candidates (as of ${compare.asOf}, ${num(groups.length)} groups)`);
    for (const floor of FLOORS) {
      const gs = rank(eligible(groups, floor));
      console.log(`\n  floor ${floor} sources: ${gs.length} eligible${gs.length >= MIN_FINDINGS ? '  <- usable' : ''}`);
      for (const g of gs.slice(0, MAX_FINDINGS)) {
        console.log(`    ${(spreadOf(g)).toFixed(3)}  n=${g.n.sources}  ${g.key.drugKey} / ${g.key.indicationKey} / ${g.key.population}${g.key.perKg ? ' per-kg' : ''} ${g.key.unit}`);
      }
    }
    process.exit(0);
  }

  const edition = arg('edition', null);
  if (!edition || !/^\d{4}-\d{2}$/.test(edition)) {
    console.error('census-report: --edition YYYY-MM is required');
    process.exit(2);
  }
  const outDir = arg('out', null);
  if (!outDir) {
    console.error('census-report: --out <dir> is required');
    process.exit(2);
  }

  const r = buildReport({ edition, compare, manifest });
  if (!r.ok) {
    console.error(`census-report: edition ${edition} does NOT ship — fewer than ${MIN_FINDINGS} groups clear the lowest floor (${FLOORS[FLOORS.length - 1]} sources). Nothing was rendered.`);
    for (const c of r.candidates) console.error(`  floor ${c.floor} sources: ${c.count} eligible`);
    console.error('  Put this output in the ledger; the report is not a launch blocker.');
    process.exit(1);
  }

  writeFile(join(outDir, 'index.html'), r.page.html);
  writeFile(join('scratch', 'census-outreach', `${edition}-linkedin.md`), r.linkedin);
  console.log(`census-report: edition ${edition}, floor ${r.floor} sources, ${r.findings.length} findings -> ${join(outDir, 'index.html')}`);
  console.log(`  LinkedIn draft -> scratch/census-outreach/${edition}-linkedin.md`);
  for (const c of r.candidates) console.log(`  floor ${c.floor} sources: ${c.count} eligible`);
}
