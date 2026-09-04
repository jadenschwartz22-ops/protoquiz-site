#!/usr/bin/env node
// Generates the /census/ page tree from the JSON contract (lib/census/CONTRACT.md,
// backend repo). Reads data/census/*.json, writes HTML + sitemaps to --out.
//
//   node scripts/census-pages.mjs [--data <dir>] [--rows <dir>] [--out <dir>] [--quiet]
//
// --out defaults to a fresh temp dir: this script never writes into the repo
// unless a caller names a directory, and it never publishes.
//
// --rows is REQUIRED for contract v3 and meaningless below it. v3 moves the dose
// rows off the site (phase 2 "rows private, summaries public"): the public set is
// documents/agencies/compare/ledger/manifest, and the per-agency rows the agency
// tables need live in a PRIVATE directory on the Pi, outside both repos. Only
// agency pages read them; drug and indication pages render `compare.json` alone.
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

// A SET, not a single version. L3 bumped documents.json to 2 (effectiveDateApproximate
// removed in favour of capturedDate + effectiveDateSource, plus origin), and published
// artifacts are mixed while that rolls out — so this reader accepts both and keeps 1 until
// every file it reads is v2. Accepting the set must land BEFORE the first v2 build: the abort
// in readContract is by design, so a v2 payload reaching a v1-only reader would take the
// census offline rather than degrade it (binding protocol P4).
export const ACCEPTED_SCHEMA_VERSIONS = new Set([1, 2, 3]);

// The file set, by contract version. v<=2 published the rows themselves; v3 replaces
// dose_latest.json with compare.json (engine output) and moves the rows to --rows.
// pages-manifest.json is deliberately absent from both sets: it is THIS script's own
// output, rsynced back into --data by the nightly, and its schemaVersion mirrors the
// data by design. Checking an expected set rather than scanning the directory is the
// point — the build owns --out and deletes strays, so a scan would only re-check what
// the build already enforces.
export const FILE_SETS = {
  2: ['documents.json', 'agencies.json', 'dose_latest.json', 'ledger.json', 'manifest.json'],
  3: ['documents.json', 'agencies.json', 'compare.json', 'ledger.json', 'manifest.json'],
};

const ORIGIN = 'https://protoquiz.com';
const APP_ID = '6753611139';
const GA_ID = 'G-LNSS9BMEP8';
const SITEMAP_SPLIT = 10_000;

// Thin-page rules (spec 9): below these a page is NOT generated — no file, no
// noindex. A page with nothing to say is worse than no page.
export const MIN_AGENCY_DRUGS = 3;

// MIN_INDICATION_ROWS is RETIRED at v3. It counted rows, which let one verbose
// document manufacture a page on its own; the engine counts SOURCES instead, and
// MIN_SOURCES gates both the published distribution and the outlier rule, so every
// group that publishes a `dist` was checked. Mirrored from lib/census/compare.mjs
// (backend repo) rather than imported: the site build must not depend on the backend
// checkout at runtime. If MIN_SOURCES moves there, move it here in the same change.
export const MIN_SOURCES = 5;
// v<=2 only. Kept so a v2 payload still renders exactly as it did.
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

// The named error a missing --rows on v3 raises. Named so the failure reads as
// "the operator forgot the private directory", not as a bare ENOENT on a path
// nobody recognizes — the nightly cards the message.
export const MISSING_ROWS_ERROR = 'contract v3 needs --rows <private-dir> holding rows_private.json (the dose rows left the site at v3; agency tables read them from there)';

function readContract(dataDir, rowsDir) {
  const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  const checkVersion = (name, version) => {
    // An unknown schemaVersion aborts rather than rendering partial data
    // (CONTRACT.md "Stability"): a silently half-rendered census is worse
    // than a failed build, which the §12 gate turns into one alert.
    if (!ACCEPTED_SCHEMA_VERSIONS.has(version)) {
      throw new Error(`${name}: schemaVersion ${version}, this generator understands ${[...ACCEPTED_SCHEMA_VERSIONS].join(', ')}`);
    }
  };

  // The manifest names the version of the whole set; every other file must agree
  // with it. The old reader checked each file against the accepted SET, which let a
  // v2 documents.json render beside a v3 compare.json — two contracts, one page.
  const manifest = readJson(dataDir, 'manifest.json');
  checkVersion('manifest.json', manifest.schemaVersion);
  const version = manifest.schemaVersion;
  const expected = FILE_SETS[version] || FILE_SETS[2];

  const set = {};
  for (const name of expected) {
    if (name === 'manifest.json') continue;
    const j = readJson(dataDir, name);
    checkVersion(name, j.schemaVersion);
    if (j.schemaVersion !== version) {
      throw new Error(`${name}: schemaVersion ${j.schemaVersion} but manifest.json says ${version} — the file set must share one version, not a mix`);
    }
    set[name] = j;
  }

  if (version < 3) {
    return {
      schemaVersion: version,
      documents: set['documents.json'].rows,
      agencies: set['agencies.json'].rows,
      doses: set['dose_latest.json'].rows,
      compare: null,
      ledger: set['ledger.json'].rows,
      manifest,
    };
  }

  // v3: dose_latest.json must be GONE from --data. The build deletes any top-level
  // *.json outside the v3 set, so a surviving one means the delete failed or a file
  // was placed by hand — either way the rows are on the site, which is the exact
  // thing v3 exists to prevent. Abort rather than publish it.
  let stale = false;
  try { readFileSync(join(dataDir, 'dose_latest.json')); stale = true; } catch { /* absent, as required */ }
  if (stale) {
    throw new Error('dose_latest.json is still in --data on a v3 build: rows are private at v3 and must not sit in the site tree');
  }

  if (!rowsDir) throw new Error(MISSING_ROWS_ERROR);
  let rowsFile;
  try {
    rowsFile = readJson(rowsDir, 'rows_private.json');
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error(`${MISSING_ROWS_ERROR} (not found under ${rowsDir})`);
    throw e;
  }
  checkVersion('rows_private.json', rowsFile.schemaVersion);
  if (rowsFile.schemaVersion !== version) {
    throw new Error(`rows_private.json: schemaVersion ${rowsFile.schemaVersion} but manifest.json says ${version} — the file set must share one version, not a mix`);
  }

  return {
    schemaVersion: version,
    documents: set['documents.json'].rows,
    agencies: set['agencies.json'].rows,
    doses: rowsFile.rows,
    compare: set['compare.json'],
    ledger: set['ledger.json'].rows,
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
  <link rel="canonical" href="${esc(ORIGIN + path)}">
  <meta name="robots" content="index,follow" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(ORIGIN + path)}" />
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
      <p>&copy; 2026 Teach Me to Live LLC, d/b/a ProtoQuiz&trade;. &middot; <a href="/census/">EMS Census</a> &middot; <a href="/census/methodology/">Methodology</a> &middot; <a href="/census/data-license/">Data license</a> &middot; <a href="/agency/">For Agencies</a> &middot; <a href="/blog/">Blog</a></p>
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

// Every href here is built from data (an agencyKey, a drugKey), so it is escaped
// like any other value that lands in an attribute. The same rule as jsonLdText and
// jsInline: JSON and slugs are not HTML, and "the producer already sanitized it" is
// the assumption every injection starts from.
const crumbHtml = trail => `      <nav class="crumbs">${trail.map(([n, p], i) =>
  i === trail.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${esc(p)}">${esc(n)}</a>`).join(' <span class="sep">/</span> ')}</nav>`;

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

// How a document's date reads, from schemaVersion 2's effectiveDateSource.
//
// `effectiveDate` is what the AGENCY printed. `capturedDate` only proves the file
// existed by then — an Archive or watch run saw it — so it is rendered "on or
// before <date>" and NEVER as an effective date. Collapsing the two is exactly
// what the v1 `effectiveDateApproximate` boolean did, and why it was replaced.
//
// A v1 row carries neither field: treat it as `printed` when it has a date, else
// `none`, matching what L3 derives (lib/census/CONTRACT.md).
const dateSourceOf = doc =>
  doc?.effectiveDateSource || (doc?.effectiveDate ? 'printed' : doc?.capturedDate ? 'captured' : 'none');

// Returns the phrase, or null when there is no date to state at all.
const documentDatePhrase = doc => {
  switch (dateSourceOf(doc)) {
    case 'printed': return doc.effectiveDate ? `effective ${doc.effectiveDate}` : null;
    case 'captured': return doc.capturedDate ? `on or before ${doc.capturedDate}` : null;
    default: return null;
  }
};

// The value for a stats cell: the bare date where printed, the hedge where
// captured, "not captured" where neither. Never a blank and never a 0.
const documentDateCell = doc => {
  switch (dateSourceOf(doc)) {
    case 'printed': return doc.effectiveDate ?? NOT_CAPTURED;
    case 'captured': return doc.capturedDate ? `on or before ${doc.capturedDate}` : NOT_CAPTURED;
    default: return NOT_CAPTURED;
  }
};

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

// ----------------------------------------------------------------- forms
//
// A plain <form> plus ~20 lines of inline JS. No CSRF token, no nonce, no
// timestamp: the endpoint is public and unauthenticated, so a token would protect
// nothing — and every one of those is a value that changes per build, which would
// break the byte-identical rebuild the nightly depends on. The only spam control in
// the markup is a honeypot field named `website`, which a person never sees and never
// fills; the endpoint answers 200 and drops it, so a bot learns nothing from the reply.

const SUBMIT_ENDPOINT = 'https://api.protoquiz.com/api/monitor?type=censusSubmit';

// JSON.stringify escapes JSON, not HTML. A value containing "</script>" would close the
// tag and put the rest of it into the document as markup — the same hole jsonLdText
// closes for JSON-LD, and it must be closed here for exactly the same reason. agencyKey
// is a slug today, but this file does not own the producer that mints it, and "the
// input is already safe" is the assumption every injection starts from.
const jsInline = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const submitForm = ({ id, kind, agencyKey = null, urlLabel, submitLabel }) => `        <form class="submit-form" id="${id}" novalidate>
          <label for="${id}-url">${esc(urlLabel)}</label>
          <input type="url" id="${id}-url" name="url" required placeholder="https://" autocomplete="url" />
          <label for="${id}-email">Your email <span class="muted">(optional &mdash; only so we can tell you when it is done)</span></label>
          <input type="email" id="${id}-email" name="email" placeholder="you@agency.gov" autocomplete="email" />
          <p class="hp" aria-hidden="true"><label for="${id}-website">Leave this field empty</label><input type="text" id="${id}-website" name="website" tabindex="-1" autocomplete="off" /></p>
          <button type="submit">${esc(submitLabel)}</button>
          <p class="form-msg" id="${id}-msg" role="status"></p>
        </form>
        <script>
          (function () {
            var f = document.getElementById('${id}');
            var msg = document.getElementById('${id}-msg');
            f.addEventListener('submit', function (e) {
              e.preventDefault();
              var url = f.elements.url.value.trim();
              if (!url) { msg.textContent = 'A public URL for the document is needed.'; return; }
              var btn = f.querySelector('button');
              btn.disabled = true;
              msg.textContent = 'Sending...';
              fetch(${jsInline(SUBMIT_ENDPOINT)}, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: url,
                  email: f.elements.email.value.trim() || undefined,
                  agency: ${agencyKey ? jsInline(agencyKey) : 'undefined'},
                  kind: ${jsInline(kind)},
                  website: f.elements.website.value
                })
              }).then(function (r) {
                if (!r.ok) throw new Error(String(r.status));
                f.reset();
                msg.textContent = 'Got it. We read every one of these by hand.';
                track('census_submit', { kind: ${jsInline(kind)} });
              }).catch(function () {
                btn.disabled = false;
                msg.textContent = 'That did not send. Email jaden@protoquiz.com and it gets handled the same way.';
              });
            });
          })();
        </script>`;

function doseCell(r) {
  if (r.value == null) return `<span class="raw">${esc(r.doseRaw)}</span>`;
  const range = r.valueMax != null ? `${fmtNum(r.value)}&ndash;${fmtNum(r.valueMax)}` : fmtNum(r.value);
  const max = r.maxValue != null ? ` <span class="muted">(max ${fmtNum(r.maxValue)} ${esc(r.maxUnit ?? '')})</span>` : '';
  return `${range} ${esc(r.unit ?? '')}${r.perKg ? '/kg' : ''}${max}`;
}

// Per-state coverage counts for the landing table (spec 8): agencies with a
// current protocol, agencies without, and whether the state has a statewide
// baseline document. Built from the same `linkableAgencies` + `documents` the
// state pages themselves render from, so the table can never disagree with the
// pages it summarizes.
function coverageByState(states, agencies, documents) {
  const statewideStates = new Set(
    documents.filter(d => d.jurisdiction === 'statewide' && d.status === 'current' && d.state).map(d => d.state),
  );
  return states.map(st => {
    // Only agencies that actually carry `coverage` count here — an agency with no
    // coverage data makes no claim, not a silent "without". A state whose agencies
    // are all coverage-less still gets a row (0/0), which is honest: it says the same
    // "not yet known" the state page's own fallback list says, not "zero coverage".
    const withCoverage = agencies.filter(a => a.state === st && a.coverage);
    return {
      state: st,
      withProtocol: withCoverage.filter(a => a.coverage.hasProtocol).length,
      withoutProtocol: withCoverage.filter(a => !a.coverage.hasProtocol).length,
      statewideBaseline: statewideStates.has(st),
    };
  });
}

function landingPage({ manifest, states, drugs, agencyPageCount, agencies = [], documents = [] }) {
  // Two different numbers, both true: how many agencies the census holds, and
  // how many have a page (the rest are below a thin-page threshold). Printing
  // only the first would promise pages that are deliberately not generated.
  const withheld = manifest.namedAgencies - agencyPageCount;
  // coverage is optional (v2 payloads, or a v3 build before the field lands):
  // the table renders only when at least one agency row carries it, and is
  // omitted entirely otherwise — never a table of blanks, never a throw.
  const coverageRows = agencies.some(a => a.coverage) ? coverageByState(states, agencies, documents) : [];
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
${coverageRows.length ? `        <div class="scroll"><table>
          <thead><tr><th>State</th><th>With a protocol</th><th>Without</th><th>Statewide baseline</th></tr></thead>
          <tbody>${coverageRows.map(r => `<tr><td><a href="/census/states/${slug(r.state)}/">${esc(stateLabel(r.state))}</a></td><td>${num(r.withProtocol)}</td><td>${num(r.withoutProtocol)}</td><td>${r.statewideBaseline ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody>
        </table></div>` : ''}
      </section>
      <section id="list">
        <h2>List your agency</h2>
        <p>If your agency's protocols are a public record and you would like them in the census, or you want an existing listing corrected or removed, send the document's public URL and we will handle it. Removal is same-day, no reason needed.</p>
${submitForm({ id: 'list-form', kind: 'listing', urlLabel: 'Public URL of the protocol document', submitLabel: 'Send it' })}
      </section>
      <section id="how">
        <h2>How this is built</h2>
        <p><a href="/census/methodology/">Methodology</a> &mdash; where documents come from, what is read out of them, what is not captured, and why no dose-level accuracy number is published. <a href="/census/data-license/">Data license</a> &mdash; summaries are CC BY 4.0; row-level data is not published.</p>
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
        // Points at the page that actually STATES a license (CC BY 4.0 on summaries,
        // rows unpublished). /terms/ governs the site and now carries the census
        // sub-paragraph, but it is not the dataset's license text.
        license: `${ORIGIN}/census/data-license/`,
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
  // The date and its provenance both come from the CURRENT document, not the agency row —
  // agencies.json carries only currentEffectiveDate, which by design is null for a document
  // whose only date is a capture.
  const currentDoc = docByHash.get(agency.currentHash);
  const datePhrase = documentDatePhrase(currentDoc);
  const body = `      <span class="badge">${esc(agency.jurisdiction)}</span>
      <h1>${esc(agency.name)}</h1>
      <p class="lede">${esc(agency.name)}${where ? ` (${esc(where)})` : ''} carries ${num(drugs.size)} drugs across ${num(doses.length)} dose entries in its current published protocol${datePhrase ? `, ${esc(datePhrase)}` : ''}.</p>
${pending}${outdated}${stats([
    ['drugs', num(drugs.size)],
    ['dose entries', num(doses.length)],
    ['machine-parsed', `${pct(parsed, doses.length)} of ${num(doses.length)}`],
    ['documents', num(agency.documentCount)],
    ['effective', documentDateCell(currentDoc)],
  ])}
      <section id="doses">
        <h2>Drugs and doses</h2>
${rows}
      </section>
${history}
      <section id="correct">
        <h2>Outdated or wrong?</h2>
        <p>Send the current document's public URL and the listing is rebuilt from it. To have this agency removed from the census entirely, say so and it comes down the same day.</p>
${submitForm({ id: 'correct-form', kind: 'correction', agencyKey: agency.agencyKey, urlLabel: 'Public URL of the current document', submitLabel: 'Send the correction' })}
        <p class="muted"><a href="/census/methodology/">How this page was built</a> &middot; <a href="/census/data-license/">Data license</a></p>
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

// One <li>, shared by every list below so the coverage split and the plain
// list render identically for an agency that appears in both.
const agencyLi = a => `<li><a href="/census/agencies/${esc(a.agencyKey)}/">${esc(a.name)}</a>${a.currentEffectiveDate ? ` <span class="muted">${esc(a.currentEffectiveDate)}</span>` : ''}</li>`;

function statePage(state, { agencies, doses, documents = [] }) {
  const listed = agencies.filter(a => a.state === state).sort((a, b) => a.agencyKey.localeCompare(b.agencyKey));
  const drugs = groupBy(doses, r => r.drugKey);
  const name = stateLabel(state);
  // coverage is a v3 addition (spec 8) and optional: a v2 payload, or a v3 build
  // before the field lands, carries no `coverage` on any row. Rendering must be
  // byte-identical to the pre-coverage single list in that case — never throw,
  // never invent a split from data that was never asked for.
  const hasCoverage = listed.some(a => a.coverage);
  // Statewide baseline documents (ruling R1): a statewide PDF is a floor every
  // agency in the state inherits, never a claim that any one agency has its own
  // current protocol. Named separately from the agency split so it can never be
  // read as coverage. `status: 'current'` matches the same "current" the agency
  // coverage check uses — a superseded statewide baseline is not a live floor.
  const statewideBaselines = hasCoverage
    ? documents.filter(d => d.state === state && d.jurisdiction === 'statewide' && d.status === 'current')
      .sort((x, y) => String(x.hash).localeCompare(String(y.hash)))
    : [];
  const agenciesSection = hasCoverage
    ? (() => {
      // Split only agencies that actually carry `coverage`; one without it makes
      // no claim, never folded silently into "without" (that would fabricate a
      // negative from missing data — the same rule the landing table follows).
      const withProtocol = listed.filter(a => a.coverage?.hasProtocol);
      const withoutProtocol = listed.filter(a => a.coverage && !a.coverage.hasProtocol);
      const unknown = listed.filter(a => !a.coverage);
      return `      <section id="agencies">
        <h2>Agencies</h2>
        <h3>With a current protocol</h3>
        ${withProtocol.length
        ? `<ul class="cols">${withProtocol.map(agencyLi).join('')}</ul>`
        : '<p class="muted">None yet.</p>'}
        <h3>Without a current protocol</h3>
        ${withoutProtocol.length
        ? `<ul class="cols">${withoutProtocol.map(agencyLi).join('')}</ul>`
        : '<p class="muted">None.</p>'}
${unknown.length ? `        <h3>Not yet assessed</h3>
        <ul class="cols">${unknown.map(agencyLi).join('')}</ul>` : ''}
      </section>
${statewideBaselines.length ? `      <section id="statewide-baseline">
        <h2>Statewide baseline</h2>
        <p class="muted">A statewide document sets a floor every agency in ${esc(name)} inherits. It is not counted as any one agency's own coverage above.</p>
        <ul class="cols">${statewideBaselines.map(d => `<li>${esc(d.agencyName ?? name)}${d.sourceUrl ? ` <a href="${esc(d.sourceUrl)}" rel="nofollow noopener">source</a>` : ''}</li>`).join('')}</ul>
      </section>` : ''}`;
    })()
    : `      <section id="agencies">
        <h2>Agencies</h2>
        ${listed.length
      ? `<ul class="cols">${listed.map(agencyLi).join('')}</ul>`
      : '<p>No agency in this state has a page yet.</p>'}
      </section>`;
  const body = `      <span class="badge">State</span>
      <h1>EMS protocols in ${esc(name)}</h1>
      <p class="lede">${num(listed.length)} named ${listed.length === 1 ? 'agency' : 'agencies'} in ${esc(name)} ${listed.length === 1 ? 'has' : 'have'} published protocols in the census, with ${num(doses.length)} dose entries across ${num(drugs.size)} ${drugs.size === 1 ? 'drug' : 'drugs'}.</p>
${stats([
    ['named agencies', num(listed.length)],
    ['dose entries', num(doses.length)],
    ['drugs', num(drugs.size)],
  ])}
${agenciesSection}`;

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

// ------------------------------------------------- v3 drug + indication pages
//
// At v3 these pages read ONLY compare.json. Nothing here touches --rows: a
// cross-agency row table is the private row file as markup, which is the one thing
// "rows private" forbids. Named agencies still appear — as NAMES linking to their
// own pages, never beside a value.

const popLabel = p => (p === 'peds' ? 'Pediatric' : 'Adult');
const unitLabel = k => `${k.unit ?? ''}${k.perKg ? '/kg' : ''}`;
const groupLabel = k => `${popLabel(k.population)}${k.perKg ? ', weight-based' : ''}`;

// A five-number bar: min | p25 | median | p75 | max, drawn as one track with the
// middle half filled. No library, matching the rest of the generator's CSS bars.
function fiveNumberBar(dist, unit) {
  const span = dist.max - dist.min;
  const at = v => (span > 0 ? ((v - dist.min) / span) * 100 : 50);
  const left = at(dist.p25);
  const width = Math.max(at(dist.p75) - left, 0.5);
  return `        <div class="five">
          <div class="five-track"><span class="five-iqr" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span><span class="five-med" style="left:${at(dist.median).toFixed(2)}%"></span></div>
          <table class="five-nums">
            <thead><tr><th>min</th><th>p25</th><th>median</th><th>p75</th><th>max</th></tr></thead>
            <tbody><tr>${[dist.min, dist.p25, dist.median, dist.p75, dist.max].map(v => `<td>${esc(fmtNum(v))}</td>`).join('')}</tr></tbody>
          </table>
          <p class="muted">Values in ${esc(unit)}. One value per source (that source's median), so a document listing a drug five times still gets one vote.</p>
        </div>`;
}

// The named-agency list: names only, linked to their own pages. `pageAgencies` is the
// agencies that actually GOT a page — naming one without a page ships a dead link to a
// file that deliberately does not exist (spec 9).
//
// The keys come from `Comparison.agencyKeys`, which the BUILD must emit on every group
// (the engine's `n.agencies` is a count and a count cannot be linked). It is names only
// and never values, so it is not the row file in disguise. A group that omits the field
// renders no list rather than reaching for --rows: an absent list is honest, a page that
// silently starts reading the private rows is the leak v3 exists to prevent.
function namedAgencyList(agencyKeys, pageAgencies) {
  const named = [...agencyKeys].filter(k => pageAgencies.has(k)).sort();
  if (!named.length) return { count: 0, html: '' };
  return {
    count: named.length,
    html: `      <section id="agencies">
        <h2>Named agencies</h2>
        <p class="muted">Agencies whose protocols are a public record are named here. Their own doses are on their own pages; this list carries no values.</p>
        <ul class="cols">${named.map(k => `<li><a href="/census/agencies/${esc(k)}/">${esc(pageAgencies.get(k).name)}</a></li>`).join('')}</ul>
      </section>`,
  };
}

// "n rows under review" — the count of suppressed rows, build-wide, from the manifest.
// It is deliberately NOT per-group: the build counts flags before removal and publishes
// one number, so a page cannot imply a per-group figure it does not have.
const underReview = manifest => (manifest.flaggedRows
  ? `      <p class="honest">${num(manifest.flaggedRows)} ${manifest.flaggedRows === 1 ? 'row is' : 'rows are'} under review across the census and excluded from every number on this page. <a href="/census/methodology/">How that works</a>.</p>\n`
  : '');

function drugPageV3(drugKey, { summary, groups, indicationPaths, pageAgencies, manifest }) {
  const dists = groups.filter(g => g.dist);
  // Sorted here rather than trusted from the file, for the same reason every other
  // list in this generator is: determinism must not depend on the writer's ordering.
  const indications = [...summary.indications].sort((a, b) => a.indicationKey.localeCompare(b.indicationKey));
  const named = namedAgencyList(new Set(groups.flatMap(g => g.agencyKeys ?? [])), pageAgencies);
  const body = `      <span class="badge">Drug</span>
      <h1>${esc(drugLabel(drugKey))} in US EMS protocols</h1>
      <p class="lede">${num(summary.n.sources)} published ${summary.n.sources === 1 ? 'protocol carries' : 'protocols carry'} ${esc(drugLabel(drugKey))} across ${num(indications.length)} ${indications.length === 1 ? 'indication' : 'indications'}, from ${num(summary.n.agencies)} named ${summary.n.agencies === 1 ? 'agency' : 'agencies'} in ${num(summary.n.states)} ${summary.n.states === 1 ? 'state' : 'states'}.</p>
${stats([
    ['protocols', num(summary.n.sources)],
    ['named agencies', num(summary.n.agencies)],
    ['states', num(summary.n.states)],
    ['indications', num(indications.length)],
    ['dose entries', num(summary.n.rows)],
    ['machine-parsed', `${pct(Math.round(summary.parsedShare * summary.n.rows), summary.n.rows)} of ${num(summary.n.rows)}`],
  ])}
${underReview(manifest)}      <section id="indications">
        <h2>Indications</h2>
        <ul class="cols">${indications.map(({ indicationKey, sources }) => {
    const p = indicationPaths.get(`${drugKey}/${indicationKey}`);
    const label = `${esc(indicationLabel(indicationKey))} <span class="muted">n=${num(sources)}</span>`;
    return `<li>${p ? `<a href="${p}">${label}</a>` : label}</li>`;
  }).join('')}</ul>
      </section>
${dists.length ? `      <section id="distributions">
        <h2>Published distributions</h2>
        <p class="muted">Only groups with at least ${MIN_SOURCES} sources publish a distribution; thinner groups show their count alone.</p>
        <div class="scroll"><table>
          <thead><tr><th>Indication</th><th>Population</th><th>Sources</th><th>Median</th><th>Middle half</th><th>Unit</th></tr></thead>
          <tbody>${dists.map(g => `<tr><td>${esc(indicationLabel(g.key.indicationKey))}</td><td>${esc(groupLabel(g.key))}</td><td>${num(g.n.sources)}</td><td>${esc(fmtNum(g.dist.median))}</td><td>${esc(fmtNum(g.dist.p25))}&ndash;${esc(fmtNum(g.dist.p75))}</td><td>${esc(unitLabel(g.key))}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>` : ''}
${named.html}
      <section id="cite">
        <h2>Citation</h2>
        <p class="cite">${esc(`ProtoQuiz EMS Census, ${drugLabel(drugKey)}: n=${summary.n.sources} protocols from ${summary.n.agencies} named agencies / ${summary.n.states} states, as of ${manifest.asOf}`)}</p>
        <p class="muted">Each distribution above carries its own n &mdash; a per-indication figure is narrower than this drug-wide one, and the group's own citation line is the one to quote for it.</p>
      </section>`;

  return {
    path: `/census/drugs/${slug(drugKey)}/`,
    html: page({
      title: `${drugLabel(drugKey)} EMS dose by protocol - indications and routes`,
      description: `How ${num(summary.n.sources)} US EMS protocols dose ${drugLabel(drugKey)}: indications, routes, and adult vs pediatric distributions from published protocols.`,
      path: `/census/drugs/${slug(drugKey)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [drugLabel(drugKey), `/census/drugs/${slug(drugKey)}/`]],
      body,
    }),
  };
}

function indicationPageV3(drugKey, indicationKey, groups, { pageAgencies, manifest }) {
  // Groups here differ only by (population, perKg, unit) — a weight-based dose and a
  // flat dose are different quantities and never share a distribution.
  const ordered = [...groups].sort((a, b) => b.n.sources - a.n.sources
    || groupLabel(a.key).localeCompare(groupLabel(b.key))
    || String(a.key.unit).localeCompare(String(b.key.unit)));
  const lead = ordered.find(g => g.dist) || null;
  const totals = ordered.reduce((acc, g) => ({
    sources: Math.max(acc.sources, g.n.sources),
    agencies: Math.max(acc.agencies, g.n.agencies),
    states: Math.max(acc.states, g.n.states),
    rows: acc.rows + g.n.rows,
  }), { sources: 0, agencies: 0, states: 0, rows: 0 });

  const lede = lead
    ? `${groupLabel(lead.key).replace(', weight-based', ' weight-based')} dosing has a median of ${esc(fmtNum(lead.dist.median))} ${esc(unitLabel(lead.key))} across ${num(lead.n.sources)} published ${lead.n.sources === 1 ? 'protocol' : 'protocols'}, with the middle half between ${esc(fmtNum(lead.dist.p25))} and ${esc(fmtNum(lead.dist.p75))}.`
    : `No group under this indication has reached ${MIN_SOURCES} sources, so no distribution is published. The counts below are what the census holds today.`;

  const named = namedAgencyList(new Set(ordered.flatMap(g => g.agencyKeys ?? [])), pageAgencies);

  const distSections = ordered.map(g => {
    const routes = g.routes.filter(r => r.route);
    return `      <section id="g-${slug(`${g.key.population}-${g.key.perKg ? 'perkg' : 'flat'}-${g.key.unit}`)}">
        <h2>${esc(groupLabel(g.key))} &mdash; ${esc(unitLabel(g.key))}</h2>
${stats([
    ['sources', num(g.n.sources)],
    ['named agencies', num(g.n.agencies)],
    ['states', num(g.n.states)],
    ['entries', num(g.n.rows)],
    ['kept as written', num(g.n.rowsRaw)],
  ])}
${g.dist
    ? fiveNumberBar(g.dist, unitLabel(g.key))
    : `        <p class="honest">Below ${MIN_SOURCES} sources, so no distribution is published for this group &mdash; only the counts above.</p>`}
${routes.length ? `        <h3>Routes</h3>
        <ul class="inline">${routes.map(r => `<li>${esc(r.route)} <span class="muted">${pct(Math.round(r.share * 1000), 1000)}</span></li>`).join('')}</ul>` : ''}
        <p class="cite">${esc(g.cite)}</p>
      </section>`;
  }).join('\n');

  const body = `      <span class="badge">Indication</span>
      <h1>${esc(drugLabel(drugKey))} for ${esc(indicationLabel(indicationKey))}</h1>
      <p class="lede">${lede}</p>
${stats([
    ['sources', num(totals.sources)],
    ['named agencies', num(totals.agencies)],
    ['states', num(totals.states)],
    ['entries', num(totals.rows)],
    ['named here', num(named.count)],
  ])}
${underReview(manifest)}${distSections}
${named.html}`;

  const path = `/census/drugs/${slug(drugKey)}/${slug(indicationKey)}/`;
  return {
    path,
    html: page({
      title: `${drugLabel(drugKey)} dose for ${indicationLabel(indicationKey)} - US EMS protocols`,
      description: `Published ${drugLabel(drugKey)} doses for ${indicationLabel(indicationKey)} across US EMS protocols: median, quartiles, routes, and adult vs pediatric, with the agencies that carry it.`,
      path,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [drugLabel(drugKey), `/census/drugs/${slug(drugKey)}/`], [indicationLabel(indicationKey), path]],
      body,
    }),
  };
}

// ------------------------------------------------- v<=2 drug + indication pages
//
// Unchanged from the row-published contract, kept so a v2 payload still renders
// exactly as it did while the v3 build rolls out (binding protocol P4).

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

// -------------------------------------------------------------- methodology
//
// EVERY number on this page comes from a manifest field. The site test greps the
// rendered digits and asserts each one matches a manifest value, so a hand-typed
// figure — the way a methodology page rots — fails the build rather than shipping.
// There is NO accuracy number here: none is measured at dose level, and the page
// says so in those words rather than borrowing the extraction-success or
// sweep-agreement figures, which measure something else and would read as accuracy.

const shareOf = (n, d) => (d ? `${num(n)} of ${num(d)} (${pct(n, d)})` : NOT_CAPTURED);

function methodologyPage(manifest) {
  const m = manifest;
  const body = `      <span class="badge">Methodology</span>
      <h1>How the EMS Census is built</h1>
      <p class="lede">Everything on the census comes from protocol documents agencies themselves published. This page says where each document came from, what was read out of it, what was not, and which numbers are therefore safe to quote. As of ${esc(m.asOf)}.</p>
${stats([
    ['documents', num(m.documents)],
    ['named agencies', num(m.namedAgencies)],
    ['dose entries', num(m.doseRows)],
    ['machine-parsed', shareOf(m.dosesParsed, m.doseRows)],
    ['comparable groups', num(m.compareGroups)],
    ['as of', m.asOf],
  ])}

      <section id="origin">
        <h2>How a document reaches us</h2>
        <p>Each document carries an <strong>origin</strong>, one of six values, derived at build time and never guessed: <strong>app</strong> (a medic uploaded their own agency's protocol), <strong>seed</strong> (we collected a published document directly), <strong>watch</strong> (a scheduled re-check of a page an agency publishes to), <strong>wayback</strong> (an Internet Archive capture), <strong>device</strong> (recovered from an app corpus), and <strong>unknown</strong>. A document minted before origin was recorded reads <strong>unknown</strong> rather than claiming a provenance it cannot prove.</p>
        <p>Nothing here is a copy of an agency's PDF. The census links to the agency's own source where one is known, and hosts no protocol documents.</p>
      </section>

      <section id="identity">
        <h2>Document identity is a content hash</h2>
        <p>A document is identified by the hash of its contents, not by its filename, its URL, or the agency's name for it. Two agencies posting byte-identical files are one document; the same protocol re-posted at a new URL is still the same document; a revision is a new one. That is what makes a version history possible at all, and it is why a re-upload of a file we already hold adds nothing.</p>
      </section>

      <section id="classification">
        <h2>Classification and what stays unpublished</h2>
        <p>A model reads each document to find the agency, the state, and the jurisdiction, and records a <strong>confidence</strong> of high, medium, low, or user (a value a person supplied). A document whose identity is not settled goes to <strong>pending review</strong> instead of being listed &mdash; the reasons are a name that collided with an existing agency, a merge chain that could not be resolved, a document with no readable agency, and a version whose date could not be placed. Of ${num(m.documents)} documents, ${num(m.pendingReview)} ${m.pendingReview === 1 ? 'is' : 'are'} in that state and ${m.pendingReview === 1 ? 'does' : 'do'} not appear anywhere on the census.</p>
        <p>An agency is named only where its protocols are a public record &mdash; statewide, regional, county, city, or fire-district. Everything else contributes to counts and distributions as an unnamed source and never gets a page. ${num(m.listedNamed)} ${m.listedNamed === 1 ? 'document is' : 'documents are'} listed with a name; ${num(m.listedAggregate)} ${m.listedAggregate === 1 ? 'contributes' : 'contribute'} to aggregates only.</p>
      </section>

      <section id="extraction">
        <h2>What is read out of a document, and what is not</h2>
        <p>Extraction pulls drug, indication, population, dose, route, repeat interval, and standing-order status. It does not read a protocol's narrative, its flowcharts as flowcharts, or anything a human reader would infer from layout.</p>
        <p>Two corpus shapes feed the census, and their limits are different. One carries page numbers; the other carries none, so <strong>page not captured</strong> is the majority case and is not a defect. The second shape also carries no standing-order flag, so <strong>standing</strong> is absent rather than false on those entries &mdash; the census never renders an absent flag as "not a standing order", because absence of a flag is not evidence of the negative. Pediatric age bands were lost upstream on the second shape entirely: ${num(m.rowsPedsExcluded)} of ${num(m.doseRows)} entries (${pct(m.rowsPedsExcluded, m.doseRows)}) ${m.rowsPedsExcluded === 1 ? 'is a pediatric entry' : 'are pediatric entries'} with no age band, and ${m.rowsPedsExcluded === 1 ? 'it is' : 'they are'} excluded from every distribution and every outlier check on this site. ${m.rowsPedsExcluded === 1 ? 'It is' : 'They are'} still counted, and ${m.rowsPedsExcluded === 1 ? 'it still appears' : 'they still appear'} on their agency's own page as written.</p>
      </section>

      <section id="parse">
        <h2>Parsed, partial, and raw</h2>
        <p>A dose string is either parsed to a number with a unit and a route, parsed partially (a number and a unit but no route), or kept raw &mdash; a string like "per medical control" that carries no number at all. Today: ${shareOf(m.dosesParsed, m.doseRows)} parsed, ${shareOf(m.dosesPartial, m.doseRows)} partial, ${shareOf(m.dosesRaw, m.doseRows)} raw.</p>
        <p><strong>A raw entry never enters a distribution.</strong> It is real data and it is shown as written on its agency's page, and it is counted in the entry totals &mdash; but it has no number, so putting it in a median would mean inventing one. Every distribution on this site says how many entries under it carry a machine-readable number.</p>
      </section>

      <section id="units">
        <h2>Units, per-kilogram doses, and ranges</h2>
        <p>Mass units are canonicalized to milligrams: micrograms and grams convert, so 300 mcg and 0.3 mg are the same value in the same group. <strong>Nothing else converts.</strong> Millilitres need a concentration the documents do not carry, and units, milliequivalents and joules are not doses of a mass at all &mdash; each is its own group and is never folded into another.</p>
        <p>A weight-based dose and a flat dose are separate groups for the same reason: 0.01 mg/kg and 1 mg are not the same quantity and never share a median.</p>
        <p><strong>A range contributes its low end only.</strong> "0.3&ndash;0.5 mg" enters a distribution as 0.3. The high end is kept and shown on the agency page, but it never enters a distribution or an outlier check &mdash; counting both ends would let one entry vote twice, and picking the high end would overstate every range in the census.</p>
      </section>

      <section id="sources">
        <h2>Sources and named agencies are two different counts</h2>
        <p>A <strong>source</strong> is one protocol document. A <strong>named agency</strong> is a source whose agency is a public record and is identified on the census. Every distribution is built one value per source &mdash; a document that lists a drug five times gets one vote, its own median, not five &mdash; so a verbose document cannot decide a median for everyone.</p>
        <p>Both counts appear on every published number, in the form "n=&lt;sources&gt; protocols from &lt;agencies&gt; named agencies / &lt;states&gt; states". Sources are always the larger number, and quoting one for the other is the mistake the two-part citation exists to prevent.</p>
        <p>A group publishes a distribution only at <strong>${MIN_SOURCES} or more sources</strong>. Below that the census shows the count and nothing else: five documents is thin, and four is not a distribution.</p>
      </section>

      <section id="outliers">
        <h2>Outlier review</h2>
        <p>Every night, each group's entries are checked against a reference built from all of that group's parsed entries &mdash; one value per source, and the median of those values. An entry more than three times that median, or less than a third of it, is <strong>flagged</strong>, in groups of at least ${MIN_SOURCES} sources. Flagging is one pass with no feedback: clearing or removing an entry changes nothing about the reference or about any other entry's flag, so the same documents produce the same flags every night.</p>
        <p>A flagged entry is suppressed everywhere &mdash; every page, every distribution, every count of published rows &mdash; until a person reviews it and either clears it (it returns) or rejects it (it stays out). It is counted before it is removed, so the size of the review queue is visible: ${num(m.flaggedRows)} of ${num(m.doseRows)} entries (${pct(m.flaggedRows, m.doseRows)}) ${m.flaggedRows === 1 ? 'is' : 'are'} under review right now, ${num(m.rejectedRows)} ${m.rejectedRows === 1 ? 'has' : 'have'} been reviewed and rejected, and ${num(m.publishedRows)} ${m.publishedRows === 1 ? 'is' : 'are'} published.</p>
        <p>The two distributions are named on purpose. Flags are judged against the reference built <em>before</em> any suppression; the numbers this site publishes are computed <em>after</em> it. A flag is a claim about one entry against its peers, not a claim about the published median.</p>
      </section>

      <section id="accuracy">
        <h2>Accuracy: not yet measured</h2>
        <p><strong>We do not publish a dose-level accuracy number, because we have not measured one.</strong> What exists today is a hand-labelled comparison of drug names, indication text, contraindications and adverse effects &mdash; no dose value in it is ever compared against a document. Publishing an extraction-success rate or a model-agreement figure in place of accuracy would be quoting a measurement of a different thing, and it would read as the number this section does not have.</p>
        <p>What is measured, and lives on this page because it comes from the build itself: the share of entries that parse to a number (${pct(m.dosesParsed, m.doseRows)}), the share under outlier review (${pct(m.flaggedRows, m.doseRows)}), and the share of pediatric entries excluded for having no age band (${pct(m.rowsPedsExcluded, m.doseRows)}).</p>
        <p>Every page here carries the same warning, and it is the honest one: this is a training reference compiled from published protocols, not a clinical order. Verify against your own agency's document and your medical director.</p>
      </section>

      <section id="corrections">
        <h2>Corrections and removal</h2>
        <p>If a listing is wrong, send the current document's public URL from the agency page's correction form and the listing is rebuilt from it. If an agency wants its listing removed, it comes down the same day &mdash; no argument about whether the document is a public record.</p>
      </section>

      <section id="freshness">
        <h2>Freshness</h2>
        <p>A document more than 24 months old is flagged as possibly outdated on its agency's page, and a newer version awaiting review is disclosed with its date. The build itself refuses to publish when the number of named agencies drops sharply against the last published build &mdash; a collapse in coverage is a broken build, and shipping it would quietly replace the census with a smaller one.</p>
        <p>The as-of date on every page is the date the data changed, not the date the page was generated. A page that did not change is not rewritten.</p>
      </section>

      <section id="cite">
        <h2>Citation</h2>
        <p class="cite">ProtoQuiz EMS Protocol Census, as of ${esc(m.asOf)}. ${ORIGIN}/census/ &middot; <a href="/census/data-license/">Data license</a></p>
      </section>`;

  return {
    path: '/census/methodology/',
    html: page({
      title: 'How the EMS Protocol Census is built - methodology',
      description: 'Where census documents come from, what is read out of them, what is not captured, how doses are compared, how outliers are reviewed, and why no dose-level accuracy number is published.',
      path: '/census/methodology/',
      trail: [['Home', '/'], ['EMS Census', '/census/'], ['Methodology', '/census/methodology/']],
      body,
    }),
  };
}

// ------------------------------------------------------------- data license
//
// Static: it states a license, and a license that changed with the data would not be
// one. No manifest number appears on it, so nothing here can drift.

function dataLicensePage() {
  const body = `      <span class="badge">License</span>
      <h1>Census data license</h1>
      <p class="lede">What you may do with the numbers on this site, what is not published, and how to have a listing corrected or removed.</p>

      <section id="summaries">
        <h2>Summaries and comparisons: CC BY 4.0</h2>
        <p>The aggregate figures published on this site &mdash; the distributions, counts, route shares, and the <code>compare.json</code> file behind them &mdash; are licensed under the <a href="https://creativecommons.org/licenses/by/4.0/" rel="nofollow noopener">Creative Commons Attribution 4.0 International license</a>. Use them, republish them, build on them commercially. The one condition is attribution.</p>
        <h3>How to cite</h3>
        <p>Every number the census publishes carries its own citation line, and that line is the attribution:</p>
        <p class="cite">ProtoQuiz EMS Census, n=&lt;sources&gt; protocols from &lt;agencies&gt; named agencies / &lt;states&gt; states, updated &lt;month year&gt;</p>
        <p>Quote it as printed on the page you took the number from. The n and the as-of date are part of the number, not decoration: a distribution over 6 protocols and one over 60 are different claims, and a figure from a year ago is a different claim again.</p>
      </section>

      <section id="rows">
        <h2>Row-level data is not published</h2>
        <p>The underlying dose rows &mdash; every entry, per agency, per document, with its source pages and version history &mdash; are <strong>not published</strong> and are not covered by the license above. There is no bulk download and no row-level API on this site. The per-agency tables on agency pages are the public record for that agency, published as pages, not as a dataset.</p>
        <p>Row-level access is available by license request for research, journalism, and commercial use. Terms are not yet set; ask and we will work them out. Write to <a href="mailto:jaden@protoquiz.com">jaden@protoquiz.com</a> with what you need and what it is for.</p>
      </section>

      <section id="documents">
        <h2>The documents themselves</h2>
        <p>The census hosts no protocol PDFs. Each listing links to the agency's own published source where one is known. The documents belong to the agencies that wrote them, and nothing here grants a license to them.</p>
      </section>

      <section id="takedown">
        <h2>Corrections, opt-out, and takedown</h2>
        <p>An agency that wants its listing corrected, or removed from the census entirely, gets it the same day. Send the request from the correction form on the agency's page, or write to <a href="mailto:jaden@protoquiz.com">jaden@protoquiz.com</a>. We do not require a reason and we do not argue about whether a document is a public record &mdash; if an agency asks, it comes down.</p>
        <p>Removal takes the agency's name, its page, and its entries out of the census. Aggregate figures published before the removal are not retracted, but the agency is not named in anything published after it.</p>
      </section>

      <section id="terms">
        <h2>Full terms</h2>
        <p>This page states the license for census data. The site's full <a href="/terms/">Terms of Service</a> govern everything else, including what an agency's protocol document may be used for when it is submitted through the app. See <a href="/census/methodology/">how the census is built</a> for what the numbers mean.</p>
      </section>`;

  return {
    path: '/census/data-license/',
    html: page({
      title: 'EMS Census data license - CC BY 4.0 summaries, licensed rows',
      description: 'Census summaries and compare.json are CC BY 4.0 with attribution. Row-level data is not published and is available by license request. Corrections and removals are handled the same day.',
      path: '/census/data-license/',
      trail: [['Home', '/'], ['EMS Census', '/census/'], ['Data license', '/census/data-license/']],
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

export function buildPages({ documents, agencies, doses, ledger, manifest, compare = null }) {
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
      documents,
    }));
  }

  // --- drug + indication pages, skipped wholesale when the indication map has
  // not been reviewed since it last changed (CONTRACT.md, spec 8). Skipping is
  // not a failure: an unreviewed map means the indication keys are not yet
  // trustworthy enough to headline a page.
  const pageAgencies = new Map(linkableAgencies.map(a => [a.agencyKey, a]));

  let drugKeys = [];
  if (manifest.indicationMapReviewed) {
    // Two passes in both branches: indication pages first, so drug pages only link
    // to ones that exist.
    const indicationPaths = new Map();
    const indicationPages = [];

    if (compare) {
      // --- v3: everything here comes from compare.json. `doses` (the private rows)
      // is deliberately NOT in scope for these pages; a site test asserts no
      // per-agency dose value reaches them.
      // Sorted by the key tuple before grouping: the engine emits sorted, but the
      // generator must not inherit determinism from its writer (the same rule the
      // row path follows with doseOrder).
      const sortedGroups = [...compare.groups].sort((x, y) =>
        `${x.key.drugKey} ${x.key.indicationKey} ${x.key.population} ${x.key.perKg ? 1 : 0} ${x.key.unit}`
          .localeCompare(`${y.key.drugKey} ${y.key.indicationKey} ${y.key.population} ${y.key.perKg ? 1 : 0} ${y.key.unit}`));
      const byDrugGroups = groupBy(sortedGroups, g => g.key.drugKey);
      const summaryByDrug = new Map(compare.drugs.map(d => [d.drugKey, d]));

      for (const [drugKey, gs] of byDrugGroups) {
        for (const [indKey, rs] of groupBy(gs, g => g.key.indicationKey)) {
          // The one threshold: a group publishes a page when any of its (population,
          // per-kg, unit) groups reached MIN_SOURCES. Sub-threshold groups still
          // render on that page, as counts with no distribution.
          if (!rs.some(g => g.n.sources >= MIN_SOURCES)) continue;
          const p = indicationPageV3(drugKey, indKey, rs, { pageAgencies, manifest });
          indicationPaths.set(`${drugKey}/${indKey}`, p.path);
          indicationPages.push(p);
        }
      }
      for (const [drugKey, gs] of byDrugGroups) {
        const summary = summaryByDrug.get(drugKey);
        // A drug with groups but no rollup is a build bug, not something to paper
        // over with a page whose stats are invented.
        if (!summary) continue;
        files.push(drugPageV3(drugKey, { summary, groups: gs, indicationPaths, pageAgencies, manifest }));
        drugKeys.push(drugKey);
      }
    } else {
      const byDrug = groupBy(doses, r => r.drugKey);
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
    }
    files.push(...indicationPages);
  }

  files.push(landingPage({
    manifest, states: statesWithPages, drugs: drugKeys, agencyPageCount: agencyPages.length,
    agencies: linkableAgencies, documents,
  }));
  files.push(methodologyPage(manifest));
  files.push(dataLicensePage());
  files.push({ path: '/census/census.css', html: CSS });

  // Sorted by path: the file list, the sitemap, and the manifest are all
  // order-independent of how the JSON happened to arrive.
  files.sort((a, b) => a.path.localeCompare(b.path));

  const urls = files.filter(f => f.path.endsWith('/')).map(f => f.path).sort();
  const chunks = [];
  for (let i = 0; i < urls.length; i += SITEMAP_SPLIT) chunks.push(urls.slice(i, i + SITEMAP_SPLIT));
  const sitemapNames = chunks.map((_, i) => (chunks.length === 1 ? 'sitemap-census.xml' : `sitemap-census-${i + 1}.xml`));

  const extra = chunks.map((c, i) => ({ path: `/${sitemapNames[i]}`, html: sitemapUrls(c, manifest.asOf) }));
  // The generator ALWAYS writes a sitemap-index naming the census sitemap. The copy
  // committed at the repo root deliberately omits it and says so in a comment — that
  // omission is correct only while the census pages are unpublished, and it ends the
  // night item 9 first rsyncs this file to the repo root under CENSUS_PUBLISH=1.
  // Nothing here changes then; the committed file is simply overwritten by this one.
  // Until then this write lands in --out (a temp dir or pages-out), never the repo.
  extra.push({ path: '/sitemap-index.xml', html: sitemapIndex(['sitemap.xml', ...sitemapNames], manifest.asOf) });

  return { files, sitemaps: extra, urls };
}

// The page manifest census-indexnow.mjs diffs against: path -> content hash.
export function pageManifest(files, manifest) {
  return {
    // The version of the DATA these pages were built from, not a constant — the indexnow diff
    // needs to know which contract produced them, and this reader accepts more than one.
    schemaVersion: manifest.schemaVersion,
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
.five{margin:12px 0 4px}
.five-track{position:relative;height:14px;background:var(--panel);border:1px solid var(--line);border-radius:7px;margin:10px 0 6px}
.five-iqr{position:absolute;top:2px;bottom:2px;background:var(--accent);opacity:.42;border-radius:5px}
.five-med{position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--accent)}
.five-nums{font-size:.82rem}
.five-nums th{font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-size:.68rem}
.five-nums td{font-family:ui-monospace,SFMono-Regular,monospace}
.submit-form{display:flex;flex-direction:column;gap:6px;max-width:520px;margin:14px 0 4px}
.submit-form label{font-size:.78rem;color:var(--muted)}
.submit-form input{background:var(--panel);border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:9px 12px;font:inherit;font-size:.9rem}
.submit-form input:focus{outline:2px solid var(--accent);outline-offset:1px}
.submit-form button{align-self:flex-start;margin-top:6px;background:var(--accent);color:#08111c;border:0;border-radius:8px;padding:9px 18px;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer}
.submit-form button[disabled]{opacity:.55;cursor:default}
.submit-form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.form-msg{font-size:.82rem;color:var(--muted);min-height:1.2em;margin:6px 0 0}
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

export function generate({ dataDir, outDir, rowsDir = null }) {
  const data = readContract(dataDir, rowsDir);
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
  const rowsDir = arg('rows', null);
  const outDir = arg('out', mkdtempSync(join(tmpdir(), 'census-pages-')));
  const quiet = process.argv.includes('--quiet');
  let result;
  try {
    result = generate({ dataDir, outDir, rowsDir });
  } catch (e) {
    // The contract aborts (unknown version, mixed set, missing --rows, a stale
    // dose_latest.json) are all operator-legible SENTENCES. The nightly cards what
    // this prints, and a stack trace is a worse card than the sentence that names
    // what to do — so the message goes to stderr on its own and the stack only
    // follows for a genuinely unexpected failure.
    console.error(`census-pages: ${e.message}`);
    if (!/schemaVersion|share one version|--rows|dose_latest\.json is still/.test(e.message)) console.error(e.stack);
    process.exit(1);
  }
  if (!quiet) {
    console.log(`census-pages: ${result.files.length} files, ${result.urls.length} URLs -> ${outDir}`);
  }
}
