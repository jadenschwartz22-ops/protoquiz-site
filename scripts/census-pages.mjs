#!/usr/bin/env node
// Generates the /census/ page tree from the JSON contract (lib/census/CONTRACT.md,
// backend repo). Reads data/census/*.json, writes HTML + sitemaps to --out.
//
//   node scripts/census-pages.mjs [--data <dir>] [--out <dir>] [--quiet]
//
// --out defaults to a fresh temp dir: this script never writes into the repo
// unless a caller names a directory, and it never publishes.
//
// Determinism is a hard requirement (test:census-rebuild-noop): every input is
// sorted before it is rendered, nothing reads the clock, and `asOf` comes from
// the manifest rather than today's date. Two runs over the same fixture produce
// byte-identical bytes, so a nightly build that changed nothing commits nothing.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

export const SCHEMA_VERSION = 1;
const ORIGIN = 'https://protoquiz.com';
const APP_ID = '6753611139';
const GA_ID = 'G-LNSS9BMEP8';
const SITEMAP_SPLIT = 10_000;

// Thin-page rules (spec 9): below these a page is NOT generated — no file, no
// noindex. A page with nothing to say is worse than no page.
export const MIN_AGENCY_DRUGS = 3;
export const MIN_INDICATION_ROWS = 5;

const DISCLAIMER = 'Training reference compiled from published protocols. Not a clinical order. Verify with your agency and medical director.';
const NOT_CAPTURED = 'not captured';

// ---------------------------------------------------------------- utilities

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// JSON.stringify escapes JSON, not HTML: an agency name containing "</script>"
// would close the tag and put the rest of the name into the document as markup.
// Escaping "<" as \u003c keeps the JSON valid and the tag intact.
const jsonLdText = obj => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const slug = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = n => Number(n).toLocaleString('en-US');

// A stat is never printed without the n behind it (ADR-6).
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : NOT_CAPTURED);

const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Terse numbers: 0.5 not 0.50, 1 not 1.0 — doses are read at a glance.
const fmtNum = v => (v == null ? NOT_CAPTURED : String(Number(v.toFixed(4))));

// Rows inside a group keep the order they arrived in, so anything rendered as a
// list sorts explicitly with doseOrder rather than trusting the input to already
// be sorted — determinism must not depend on the writer's ordering.
const doseOrder = (a, b) =>
  String(a.indicationKey ?? '').localeCompare(String(b.indicationKey ?? ''))
  || String(a.population ?? '').localeCompare(String(b.population ?? ''))
  || String(a.agencyKey ?? '').localeCompare(String(b.agencyKey ?? ''))
  || String(a.hash ?? '').localeCompare(String(b.hash ?? ''))
  || String(a.doseRaw ?? '').localeCompare(String(b.doseRaw ?? ''));

const groupBy = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    (m.get(k) || m.set(k, []).get(k)).push(r);
  }
  // Sorted so downstream iteration order never depends on input order.
  return new Map([...m].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
};

const titleCase = s => String(s ?? '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
// An unrecognized code renders as itself rather than being dropped — a state we
// have not enumerated is still a real listing.
const stateLabel = code => STATE_NAMES[String(code).toUpperCase()] || String(code);
const drugLabel = k => titleCase(String(k).replace(/_/g, ' '));
const indicationLabel = k => titleCase(String(k).replace(/_/g, ' '));

// ------------------------------------------------------------------ reading

function readContract(dataDir) {
  const read = name => {
    const raw = readFileSync(join(dataDir, name), 'utf8');
    const j = JSON.parse(raw);
    // An unknown schemaVersion aborts rather than rendering partial data
    // (CONTRACT.md "Stability"): a silently half-rendered census is worse
    // than a failed build, which the §12 gate turns into one alert.
    if (j.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`${name}: schemaVersion ${j.schemaVersion}, this generator understands ${SCHEMA_VERSION}`);
    }
    return j;
  };
  const manifest = JSON.parse(readFileSync(join(dataDir, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`manifest.json: schemaVersion ${manifest.schemaVersion}, this generator understands ${SCHEMA_VERSION}`);
  }
  return {
    documents: read('documents.json').rows,
    agencies: read('agencies.json').rows,
    doses: read('dose_latest.json').rows,
    ledger: read('ledger.json').rows,
    manifest,
  };
}

// ------------------------------------------------------------------ chrome

const head = ({ title, description, path, jsonLd }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <meta name="apple-itunes-app" content="app-id=${APP_ID}" />
  <link rel="canonical" href="${ORIGIN}${path}">
  <meta name="robots" content="index,follow" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
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
    function track(name, props){ try { gtag('event', name, props || {}); } catch(e){} }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/census/census.css">
</head>`;

const nav = `  <header>
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
  </header>`;

const footer = `  <footer>
    <div class="wrap">
      <p class="disclaimer">${DISCLAIMER}</p>
      <p>&copy; 2026 Teach Me to Live LLC, d/b/a ProtoQuiz&trade;. &middot; <a href="/census/">EMS Census</a> &middot; <a href="/agency/">For Agencies</a> &middot; <a href="/blog/">Blog</a></p>
    </div>
  </footer>
</body>
</html>
`;

const breadcrumbs = trail => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + item })),
});

const crumbHtml = trail => `      <nav class="crumbs">${trail.map(([n, p], i) =>
  i === trail.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`).join(' <span class="sep">/</span> ')}</nav>`;

// Every page carries the same honest-counts block: n, the parseable subset, and
// the as-of date. A stat without them does not ship (ADR-6).
const stats = items => `      <div class="stats">${items.map(([label, value]) =>
  `<div class="stat"><span class="v">${esc(value)}</span><span class="l">${esc(label)}</span></div>`).join('')}</div>`;

const page = ({ title, description, path, trail, jsonLd = [], body }) =>
  `${head({ title, description, path, jsonLd: [breadcrumbs(trail), ...jsonLd] })}
<body>
${nav}
  <main>
    <div class="wrap">
${crumbHtml(trail)}
${body}
    </div>
  </main>
${footer}`;

// ------------------------------------------------------------- page bodies

// Attribution is required on every named row (spec 11). sourceUrl lives on the
// DOCUMENT, keyed by the dose row's hash — never on the agency.
const sourceLine = (r, docByHash) => {
  const pages = r.sourcePages?.length
    ? `${r.sourcePages.length === 1 ? 'page' : 'pages'} ${r.sourcePages.join(', ')}`
    : `page ${NOT_CAPTURED}`;
  const url = docByHash.get(r.hash)?.sourceUrl;
  const link = url ? ` &middot; <a href="${esc(url)}" rel="nofollow noopener">source</a>` : '';
  return `${esc(pages)}${link}`;
};

// standing is null on documents whose corpus shape carries no standing flag —
// absence of the flag is not evidence of the negative (CONTRACT.md).
const standingLabel = v => (v === true ? 'standing' : v === false ? 'requires contact' : NOT_CAPTURED);

function doseCell(r) {
  if (r.value == null) return `<span class="raw">${esc(r.doseRaw)}</span>`;
  const range = r.valueMax != null ? `${fmtNum(r.value)}&ndash;${fmtNum(r.valueMax)}` : fmtNum(r.value);
  const max = r.maxValue != null ? ` <span class="muted">(max ${fmtNum(r.maxValue)} ${esc(r.maxUnit ?? '')})</span>` : '';
  return `${range} ${esc(r.unit ?? '')}${r.perKg ? '/kg' : ''}${max}`;
}

function landingPage({ manifest, states, drugs, agencyPageCount }) {
  // Two different numbers, both true: how many agencies the census holds, and
  // how many have a page (the rest are below a thin-page threshold). Printing
  // only the first would promise pages that are deliberately not generated.
  const withheld = manifest.namedAgencies - agencyPageCount;
  const body = `      <span class="badge">Public record</span>
      <h1>The EMS Protocol Census</h1>
      <p class="lede">A free, versioned record of what United States EMS agencies actually carry, built from published protocol documents. ${num(manifest.doseRows)} dose entries from ${num(manifest.namedAgencies)} named agencies, as of ${esc(manifest.asOf)}.</p>
${stats([
    ['named agencies', num(manifest.namedAgencies)],
    ['with a page', num(agencyPageCount)],
    ['documents', num(manifest.documents)],
    ['dose entries', num(manifest.doseRows)],
    ['machine-parsed', `${pct(manifest.dosesParsed, manifest.doseRows)} of ${num(manifest.doseRows)}`],
    ['as of', manifest.asOf],
  ])}
      <p class="honest">${num(manifest.dosesParsed)} entries parsed to a number and route, ${num(manifest.dosesPartial)} partially, ${num(manifest.dosesRaw)} kept as written. Raw entries are counted and shown as written, never dropped.${withheld > 0 ? ` ${num(withheld)} named ${withheld === 1 ? 'agency has' : 'agencies have'} too little published detail for a page of ${withheld === 1 ? 'its' : 'their'} own and ${withheld === 1 ? 'is' : 'are'} counted here only.` : ''}</p>
${drugs.length ? `      <section id="drugs">
        <h2>By drug</h2>
        <ul class="cols">${drugs.map(d => `<li><a href="/census/drugs/${slug(d)}/">${esc(drugLabel(d))}</a></li>`).join('')}</ul>
      </section>` : `      <section id="drugs">
        <h2>By drug</h2>
        <p>Drug and indication pages are not published for this build: the indication map has not been reviewed since it last changed.</p>
      </section>`}
      <section id="states">
        <h2>By state</h2>
        <ul class="cols">${states.map(s => `<li><a href="/census/states/${slug(s)}/">${esc(stateLabel(s))}</a></li>`).join('')}</ul>
      </section>
      <section id="list">
        <h2>List your agency</h2>
        <p>If your agency's protocols are a public record and you would like them in the census, or you want an existing listing corrected or removed, send the document's public URL and we will handle it.</p>
      </section>
      <section id="cite">
        <h2>Citation</h2>
        <p class="cite">ProtoQuiz EMS Protocol Census, as of ${esc(manifest.asOf)}. ${ORIGIN}/census/</p>
      </section>`;

  return {
    path: '/census/',
    html: page({
      title: 'EMS Protocol Census - what US EMS agencies actually carry',
      description: `A free, versioned record of United States EMS protocols: ${num(manifest.doseRows)} dose entries from ${num(manifest.namedAgencies)} named agencies, as of ${manifest.asOf}.`,
      path: '/census/',
      trail: [['Home', '/'], ['EMS Census', '/census/']],
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'ProtoQuiz EMS Protocol Census',
        description: 'Dose, route, and indication facts extracted from published United States EMS protocol documents.',
        url: `${ORIGIN}/census/`,
        license: `${ORIGIN}/terms/`,
        creator: { '@type': 'Organization', name: 'ProtoQuiz', url: ORIGIN },
        dateModified: manifest.asOf,
        isAccessibleForFree: true,
      }],
      body,
    }),
  };
}

function agencyPage(agency, { doses, ledger, docByHash }) {
  const drugs = groupBy(doses, r => r.drugKey);
  const parsed = doses.filter(r => r.parseStatus === 'parsed').length;
  const outdated = agency.mayBeOutdated
    ? `      <p class="warn">The current listed document is more than 24 months old and may be outdated.</p>\n`
    : '';
  const pending = agency.pendingReview
    ? `      <p class="warn">${agency.pendingReview.effectiveDate
        ? `A newer version (dated ${esc(agency.pendingReview.effectiveDate)}) is under review.`
        : 'An undated version is under review.'} The figures below are from the current listed document.</p>\n`
    : '';

  const rows = [...drugs].map(([drugKey, rs]) => {
    const inner = [...rs].sort(doseOrder).map(r => `<tr>
              <td>${esc(indicationLabel(r.indicationKey))}</td>
              <td>${esc(r.population)}</td>
              <td>${doseCell(r)}</td>
              <td>${esc(r.route ?? NOT_CAPTURED)}</td>
              <td>${esc(r.repeatRaw ?? NOT_CAPTURED)}</td>
              <td>${esc(standingLabel(r.standing))}</td>
              <td class="src">${sourceLine(r, docByHash)}</td>
            </tr>`).join('\n');
    return `        <h3 id="${slug(drugKey)}">${esc(drugLabel(drugKey))}</h3>
        <div class="scroll"><table>
          <thead><tr><th>Indication</th><th>Population</th><th>Dose</th><th>Route</th><th>Repeat</th><th>Standing</th><th>Source</th></tr></thead>
          <tbody>
${inner}
          </tbody>
        </table></div>`;
  }).join('\n');

  const history = ledger.length
    ? `      <section id="ledger">
        <h2>Change history</h2>
        <div class="scroll"><table>
          <thead><tr><th>Recorded</th><th>Change</th><th>From</th><th>To</th></tr></thead>
          <tbody>${ledger.map(e => `<tr><td>${esc(String(e.at).slice(0, 10))}</td><td>${esc(e.change)}</td><td>${esc(e.from ?? NOT_CAPTURED)}</td><td>${esc(e.to ?? NOT_CAPTURED)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`
    : '';

  const where = [agency.city, agency.state].filter(Boolean).join(', ');
  const title = `${agency.name} EMS protocols - drugs, doses, and routes`;
  const body = `      <span class="badge">${esc(agency.jurisdiction)}</span>
      <h1>${esc(agency.name)}</h1>
      <p class="lede">${esc(agency.name)}${where ? ` (${esc(where)})` : ''} carries ${num(drugs.size)} drugs across ${num(doses.length)} dose entries in its current published protocol${agency.currentEffectiveDate ? `, effective ${esc(agency.currentEffectiveDate)}` : ''}.</p>
${pending}${outdated}${stats([
    ['drugs', num(drugs.size)],
    ['dose entries', num(doses.length)],
    ['machine-parsed', `${pct(parsed, doses.length)} of ${num(doses.length)}`],
    ['documents', num(agency.documentCount)],
    ['effective', agency.currentEffectiveDate ?? NOT_CAPTURED],
  ])}
      <section id="doses">
        <h2>Drugs and doses</h2>
${rows}
      </section>
${history}
      <section id="correct">
        <h2>Outdated or wrong?</h2>
        <p>Send the current document's public URL and the listing is rebuilt from it. To have this agency removed from the census entirely, say so and it comes down the same day.</p>
      </section>`;

  return {
    path: `/census/agencies/${agency.agencyKey}/`,
    html: page({
      title,
      description: `Drugs, doses, routes, and revision history published by ${agency.name}${where ? ` (${where})` : ''}, from its own protocol document.`,
      path: `/census/agencies/${agency.agencyKey}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], ...(agency.state ? [[stateLabel(agency.state), `/census/states/${slug(agency.state)}/`]] : []), [agency.name, `/census/agencies/${agency.agencyKey}/`]],
      body,
    }),
  };
}

function statePage(state, { agencies, doses }) {
  const listed = agencies.filter(a => a.state === state).sort((a, b) => a.agencyKey.localeCompare(b.agencyKey));
  const drugs = groupBy(doses, r => r.drugKey);
  const name = stateLabel(state);
  const body = `      <span class="badge">State</span>
      <h1>EMS protocols in ${esc(name)}</h1>
      <p class="lede">${num(listed.length)} named ${listed.length === 1 ? 'agency' : 'agencies'} in ${esc(name)} ${listed.length === 1 ? 'has' : 'have'} published protocols in the census, with ${num(doses.length)} dose entries across ${num(drugs.size)} ${drugs.size === 1 ? 'drug' : 'drugs'}.</p>
${stats([
    ['named agencies', num(listed.length)],
    ['dose entries', num(doses.length)],
    ['drugs', num(drugs.size)],
  ])}
      <section id="agencies">
        <h2>Agencies</h2>
        ${listed.length
    ? `<ul class="cols">${listed.map(a => `<li><a href="/census/agencies/${a.agencyKey}/">${esc(a.name)}</a>${a.currentEffectiveDate ? ` <span class="muted">${esc(a.currentEffectiveDate)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p>No agency in this state has a page yet.</p>'}
      </section>`;

  return {
    path: `/census/states/${slug(state)}/`,
    html: page({
      title: `${name} EMS protocols - agencies, drugs, and doses`,
      description: `${listed.length} named EMS agencies in ${name} with published protocol doses in the ProtoQuiz EMS Census.`,
      path: `/census/states/${slug(state)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [name, `/census/states/${slug(state)}/`]],
      body,
    }),
  };
}

function drugPage(drugKey, { rows, indicationPaths }) {
  const byInd = groupBy(rows, r => r.indicationKey);
  const agencies = new Set(rows.map(r => r.agencyKey).filter(Boolean));
  const body = `      <span class="badge">Drug</span>
      <h1>${esc(drugLabel(drugKey))} in US EMS protocols</h1>
      <p class="lede">${num(agencies.size)} named ${agencies.size === 1 ? 'agency carries' : 'agencies carry'} ${esc(drugLabel(drugKey))} across ${num(byInd.size)} ${byInd.size === 1 ? 'indication' : 'indications'} and ${num(rows.length)} dose entries.</p>
${stats([
    ['agencies', num(agencies.size)],
    ['indications', num(byInd.size)],
    ['dose entries', num(rows.length)],
    ['machine-parsed', `${pct(rows.filter(r => r.parseStatus === 'parsed').length, rows.length)} of ${num(rows.length)}`],
  ])}
      <section id="indications">
        <h2>Indications</h2>
        <ul class="cols">${[...byInd].map(([k, rs]) => {
    const p = indicationPaths.get(`${drugKey}/${k}`);
    const label = `${esc(indicationLabel(k))} <span class="muted">${num(rs.length)}</span>`;
    return `<li>${p ? `<a href="${p}">${label}</a>` : label}</li>`;
  }).join('')}</ul>
      </section>`;

  return {
    path: `/census/drugs/${slug(drugKey)}/`,
    html: page({
      title: `${drugLabel(drugKey)} EMS dose by protocol - indications and routes`,
      description: `How ${num(agencies.size)} US EMS agencies dose ${drugLabel(drugKey)}: indications, routes, and adult vs pediatric entries from published protocols.`,
      path: `/census/drugs/${slug(drugKey)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [drugLabel(drugKey), `/census/drugs/${slug(drugKey)}/`]],
      body,
    }),
  };
}

// pageAgencies is the agencies that actually GOT a page, not everything in
// agencies.json: an agency below a thin-page threshold is counted in the stats
// but never named or linked, or the page ships a dead link to a file that
// deliberately does not exist (spec 9).
function indicationPage(drugKey, indicationKey, rows, pageAgencies, docByHash) {
  const byPop = groupBy(rows, r => r.population);
  const named = rows.filter(r => r.agencyKey && pageAgencies.has(r.agencyKey))
    .sort((a, b) => String(a.agencyKey).localeCompare(String(b.agencyKey)) || doseOrder(a, b));

  // A weight-based dose and a flat dose are different quantities: 0.01 mg/kg and
  // 1 mg do not belong in one median or one range. Summaries are computed per
  // (population, unit, per-kg) so every number printed is comparable to the
  // others under the same heading.
  const summaryKey = r => `${r.population}|${r.unit ?? ''}|${r.perKg ? 'per-kg' : 'flat'}`;
  const summaryLabel = r => `${r.population === 'peds' ? 'Pediatric' : 'Adult'}${r.perKg ? ', weight-based' : ''}`;
  const summaries = [...groupBy(rows.filter(r => r.value != null), summaryKey)]
    .map(([, rs]) => {
      const vs = rs.map(r => r.value);
      return {
        label: summaryLabel(rs[0]),
        n: rs.length,
        median: median(vs),
        lo: Math.min(...vs),
        hi: Math.max(...vs),
        unit: `${rs[0].unit ?? ''}${rs[0].perKg ? '/kg' : ''}`,
      };
    })
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

  const parsedCount = rows.filter(r => r.value != null).length;
  const lead = summaries[0];
  const lede = lead
    ? `${lead.label.replace(', weight-based', ' weight-based')} dosing has a median of ${esc(fmtNum(lead.median))} ${esc(lead.unit)} across ${num(lead.n)} published ${lead.n === 1 ? 'entry' : 'entries'} with a machine-readable number${lead.lo === lead.hi ? ', with no variation between them' : `, ranging ${esc(fmtNum(lead.lo))}&ndash;${esc(fmtNum(lead.hi))} ${esc(lead.unit)}`}.`
    : `No entry for this indication carries a machine-readable number; all ${num(rows.length)} are shown as written.`;

  // The histogram bins by the printed dose string, so per-kg and flat rows are
  // separate bars rather than one misleading distribution.
  const dist = [...groupBy(rows.filter(r => r.value != null), r => `${fmtNum(r.value)} ${r.unit ?? ''}${r.perKg ? '/kg' : ''} (${r.population})`.replace(/\s+/g, ' ').trim())]
    .map(([label, rs]) => [label, rs.length])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const maxCount = dist.length ? dist[0][1] : 0;

  const routes = [...groupBy(rows.filter(r => r.route), r => r.route)]
    .map(([route, rs]) => [route, rs.length]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const body = `      <span class="badge">Indication</span>
      <h1>${esc(drugLabel(drugKey))} for ${esc(indicationLabel(indicationKey))}</h1>
      <p class="lede">${lede}</p>
${stats([
    ['entries', num(rows.length)],
    ['with a number', `${num(parsedCount)} of ${num(rows.length)}`],
    ['agencies', num(new Set(rows.map(r => r.agencyKey).filter(Boolean)).size)],
    ['named here', num(new Set(named.map(r => r.agencyKey)).size)],
  ])}
${summaries.length ? `      <section id="summary">
        <h2>Median and range</h2>
        <p class="muted">Weight-based and flat doses are summarized separately &mdash; they are not the same quantity.</p>
        <div class="scroll"><table>
          <thead><tr><th>Population</th><th>Entries</th><th>Median</th><th>Range</th></tr></thead>
          <tbody>${summaries.map(x => `<tr><td>${esc(x.label)}</td><td>${num(x.n)}</td><td>${esc(fmtNum(x.median))} ${esc(x.unit)}</td><td>${x.lo === x.hi ? esc(fmtNum(x.lo)) : `${esc(fmtNum(x.lo))}&ndash;${esc(fmtNum(x.hi))}`} ${esc(x.unit)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>` : ''}
${dist.length ? `      <section id="distribution">
        <h2>Dose distribution</h2>
        <table class="hist">
          <tbody>${dist.map(([label, n]) => `<tr><th scope="row">${esc(label)}</th><td><span class="bar" style="width:${Math.round((n / maxCount) * 100)}%"></span></td><td class="n">${num(n)}</td></tr>`).join('')}</tbody>
        </table>
      </section>` : ''}
${routes.length ? `      <section id="routes">
        <h2>Routes</h2>
        <ul class="inline">${routes.map(([r, n]) => `<li>${esc(r)} <span class="muted">${num(n)}</span></li>`).join('')}</ul>
      </section>` : ''}
      <section id="populations">
        <h2>Adult vs pediatric</h2>
        <ul class="inline">${[...byPop].map(([p, rs]) => `<li>${esc(p)} <span class="muted">${num(rs.length)}</span></li>`).join('')}</ul>
      </section>
      <section id="agencies">
        <h2>Named agencies</h2>
        <p class="muted">Agencies whose protocols are a public record are named. Everything else is counted above but not named.</p>
        <div class="scroll"><table>
          <thead><tr><th>Agency</th><th>Population</th><th>Dose</th><th>Route</th><th>Repeat</th><th>Effective</th><th>Source</th></tr></thead>
          <tbody>${named.map(r => {
    const a = pageAgencies.get(r.agencyKey);
    return `<tr>
              <td><a href="/census/agencies/${esc(r.agencyKey)}/">${esc(a.name)}</a></td>
              <td>${esc(r.population)}</td>
              <td>${doseCell(r)}</td>
              <td>${esc(r.route ?? NOT_CAPTURED)}</td>
              <td>${esc(r.repeatRaw ?? NOT_CAPTURED)}</td>
              <td>${esc(r.effectiveDate ?? NOT_CAPTURED)}</td>
              <td class="src">${sourceLine(r, docByHash)}</td>
            </tr>`;
  }).join('')}</tbody>
        </table></div>
      </section>`;

  const path = `/census/drugs/${slug(drugKey)}/${slug(indicationKey)}/`;
  return {
    path,
    html: page({
      title: `${drugLabel(drugKey)} dose for ${indicationLabel(indicationKey)} - US EMS protocols`,
      description: `Published ${drugLabel(drugKey)} doses for ${indicationLabel(indicationKey)} across US EMS agencies: median, range, routes, and adult vs pediatric, with named agencies and source pages.`,
      path,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [drugLabel(drugKey), `/census/drugs/${slug(drugKey)}/`], [indicationLabel(indicationKey), path]],
      body,
    }),
  };
}

// ------------------------------------------------------------------ sitemaps

const sitemapUrls = (urls, lastmod) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;

const sitemapIndex = (files, lastmod) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map(f => `  <sitemap>\n    <loc>${ORIGIN}/${f}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>
`;

// -------------------------------------------------------------------- build

export function buildPages({ documents, agencies, doses, ledger, manifest }) {
  const agencyByKey = new Map(agencies.map(a => [a.agencyKey, a]));
  const docByHash = new Map(documents.map(d => [d.hash, d]));
  const files = [];

  // Only doses that belong to a named agency reach a named page; the rest are
  // counted. agencies.json is named-only by contract, so this is the one filter.
  const namedDoses = doses.filter(r => r.agencyKey && agencyByKey.has(r.agencyKey));

  const dosesByAgency = groupBy(namedDoses, r => r.agencyKey);
  const ledgerByAgency = groupBy(ledger, e => e.agencyKey);

  // --- agency pages: >= 3 drugs and a known state (spec 9 thin-page rule)
  const agencyPages = [];
  for (const a of [...agencies].sort((x, y) => x.agencyKey.localeCompare(y.agencyKey))) {
    const rows = dosesByAgency.get(a.agencyKey) || [];
    const drugCount = new Set(rows.map(r => r.drugKey)).size;
    if (drugCount < MIN_AGENCY_DRUGS || !a.state) continue;
    agencyPages.push(agencyPage(a, {
      doses: rows,
      docByHash,
      ledger: [...(ledgerByAgency.get(a.agencyKey) || [])].sort((p, q) => String(p.at).localeCompare(String(q.at)) || p.hash.localeCompare(q.hash)),
    }));
  }
  files.push(...agencyPages);
  const agencyPathSet = new Set(agencyPages.map(p => p.path));

  // --- state pages: link only to agency pages that exist (spec 9)
  const statesWithPages = [...new Set(agencies
    .filter(a => a.state && agencyPathSet.has(`/census/agencies/${a.agencyKey}/`))
    .map(a => a.state))].sort();
  const linkableAgencies = agencies.filter(a => agencyPathSet.has(`/census/agencies/${a.agencyKey}/`));
  for (const st of statesWithPages) {
    files.push(statePage(st, {
      agencies: linkableAgencies,
      doses: namedDoses.filter(r => agencyByKey.get(r.agencyKey)?.state === st),
    }));
  }

  // --- drug + indication pages, skipped wholesale when the indication map has
  // not been reviewed since it last changed (CONTRACT.md, spec 8). Skipping is
  // not a failure: an unreviewed map means the indication keys are not yet
  // trustworthy enough to headline a page.
  const pageAgencies = new Map(linkableAgencies.map(a => [a.agencyKey, a]));

  let drugKeys = [];
  if (manifest.indicationMapReviewed) {
    const byDrug = groupBy(doses, r => r.drugKey);
    // Two passes: indication pages first, so drug pages only link to ones that exist.
    const indicationPaths = new Map();
    const indicationPages = [];
    for (const [drugKey, rows] of byDrug) {
      for (const [indKey, rs] of groupBy(rows, r => r.indicationKey)) {
        if (rs.length < MIN_INDICATION_ROWS) continue;
        const p = indicationPage(drugKey, indKey, rs, pageAgencies, docByHash);
        indicationPaths.set(`${drugKey}/${indKey}`, p.path);
        indicationPages.push(p);
      }
    }
    for (const [drugKey, rows] of byDrug) {
      files.push(drugPage(drugKey, { rows, indicationPaths }));
      drugKeys.push(drugKey);
    }
    files.push(...indicationPages);
  }

  files.push(landingPage({ manifest, states: statesWithPages, drugs: drugKeys, agencyPageCount: agencyPages.length }));
  files.push({ path: '/census/census.css', html: CSS });

  // Sorted by path: the file list, the sitemap, and the manifest are all
  // order-independent of how the JSON happened to arrive.
  files.sort((a, b) => a.path.localeCompare(b.path));

  const urls = files.filter(f => f.path.endsWith('/')).map(f => f.path).sort();
  const chunks = [];
  for (let i = 0; i < urls.length; i += SITEMAP_SPLIT) chunks.push(urls.slice(i, i + SITEMAP_SPLIT));
  const sitemapNames = chunks.map((_, i) => (chunks.length === 1 ? 'sitemap-census.xml' : `sitemap-census-${i + 1}.xml`));

  const extra = chunks.map((c, i) => ({ path: `/${sitemapNames[i]}`, html: sitemapUrls(c, manifest.asOf) }));
  extra.push({ path: '/sitemap-index.xml', html: sitemapIndex(['sitemap.xml', ...sitemapNames], manifest.asOf) });

  return { files, sitemaps: extra, urls };
}

// The page manifest census-indexnow.mjs diffs against: path -> content hash.
export function pageManifest(files, manifest) {
  return {
    schemaVersion: SCHEMA_VERSION,
    asOf: manifest.asOf,
    buildVersion: manifest.buildVersion,
    pages: Object.fromEntries(files.map(f => [f.path, hash(f.html)])),
  };
}


const CSS = `:root{--bg:#05080c;--panel:#0b1018;--line:#1b2532;--ink:#e8eef6;--muted:#93a3b8;--accent:#ffb000}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6}
a{color:var(--accent)}
.wrap{max-width:900px;margin:0 auto;padding:0 24px}
header{border-bottom:1px solid var(--line)}
.navbar{display:flex;align-items:center;justify-content:space-between;padding:14px 0;gap:16px;flex-wrap:wrap}
.brand-link{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none;font-weight:800}
.nav-links{display:flex;gap:8px;flex-wrap:wrap}
.nav-btn{padding:7px 14px;border:1px solid var(--line);border-radius:8px;text-decoration:none;font-size:.88rem;font-weight:600}
main{padding:32px 0 64px}
.crumbs{font-size:.8rem;color:var(--muted);margin-bottom:18px}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{color:var(--accent)}
.crumbs .sep{opacity:.5;margin:0 2px}
.badge{display:inline-block;padding:4px 11px;border:1px solid var(--line);border-radius:999px;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
h1{font-size:2.1rem;line-height:1.2;margin:14px 0 10px;letter-spacing:-.02em}
h2{font-size:1.28rem;margin:38px 0 12px;letter-spacing:-.01em}
h3{font-size:1rem;margin:26px 0 8px;color:var(--accent);font-family:ui-monospace,SFMono-Regular,monospace}
.lede{font-size:1.06rem;color:var(--muted);margin:0 0 20px}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0 8px}
.stat{flex:1 1 140px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.stat .v{display:block;font-size:1.15rem;font-weight:800}
.stat .l{display:block;font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.honest,.cite{font-size:.85rem;color:var(--muted)}
.warn{background:rgba(255,176,0,.08);border:1px solid rgba(255,176,0,.3);border-radius:10px;padding:11px 14px;font-size:.88rem;margin:14px 0}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.84rem;margin:6px 0 4px}
th{text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--line);padding:7px 10px;white-space:nowrap}
td{padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.src,.muted{color:var(--muted);font-size:.78rem}
.raw{font-family:ui-monospace,SFMono-Regular,monospace;font-size:.8rem}
.hist th{width:150px;font-family:ui-monospace,SFMono-Regular,monospace;color:var(--ink);border:none;padding:4px 10px 4px 0}
.hist td{border:none;padding:4px 0}
.hist .n{width:56px;text-align:right;color:var(--muted)}
.bar{display:block;height:12px;background:var(--accent);border-radius:3px;min-width:2px}
ul.cols{list-style:none;padding:0;margin:8px 0;columns:3;column-gap:22px}
ul.cols li{break-inside:avoid;padding:3px 0;font-size:.9rem}
ul.inline{list-style:none;padding:0;margin:8px 0;display:flex;flex-wrap:wrap;gap:8px}
ul.inline li{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:5px 13px;font-size:.85rem}
footer{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:.82rem}
.disclaimer{border-left:2px solid var(--accent);padding-left:12px;margin:0 0 12px}
@media(max-width:640px){ul.cols{columns:1}h1{font-size:1.6rem}}
`;

// --------------------------------------------------------------------- main

function write(outDir, files) {
  for (const f of files) {
    const rel = f.path.endsWith('/') ? `${f.path}index.html` : f.path;
    const dest = join(outDir, rel.replace(/^\//, ''));
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, f.html);
  }
}

export function generate({ dataDir, outDir }) {
  const data = readContract(dataDir);
  const { files, sitemaps, urls } = buildPages(data);
  const all = [...files, ...sitemaps];
  const pm = pageManifest(all, data.manifest);
  write(outDir, all);
  mkdirSync(join(outDir, 'data', 'census'), { recursive: true });
  writeFileSync(join(outDir, 'data', 'census', 'pages-manifest.json'), `${JSON.stringify(pm, null, 2)}\n`);
  return { files: all, urls, manifest: pm };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
  };
  const dataDir = arg('data', 'data/census');
  const outDir = arg('out', mkdtempSync(join(tmpdir(), 'census-pages-')));
  const quiet = process.argv.includes('--quiet');
  const { files, urls } = generate({ dataDir, outDir });
  if (!quiet) {
    console.log(`census-pages: ${files.length} files, ${urls.length} URLs -> ${outDir}`);
  }
}
