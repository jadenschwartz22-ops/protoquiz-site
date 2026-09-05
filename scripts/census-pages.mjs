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
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
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
// Human labels for the indication vocabulary (ems-router lib/census/indications.json keys).
// ONE home: census-report.mjs imports this. A key missing here falls back to title case.
export const INDICATION_LABELS = {
  CARDIAC_ARREST: 'Cardiac arrest', VF_PVT: 'VF / pulseless VT', ASYSTOLE_PEA: 'Asystole / PEA', POST_ROSC: 'Post-ROSC care',
  BRADYCARDIA: 'Bradycardia', TACHYCARDIA_NARROW: 'Narrow-complex tachycardia', TACHYCARDIA_WIDE: 'Wide-complex tachycardia',
  SVT: 'SVT', AFIB_RVR: 'Atrial fibrillation with RVR', ACS_CHEST_PAIN: 'ACS / chest pain', STEMI: 'STEMI',
  CHF_PULMONARY_EDEMA: 'CHF / pulmonary edema', CARDIOGENIC_SHOCK: 'Cardiogenic shock', HYPOTENSION_PUSH_DOSE: 'Hypotension / shock',
  HYPOTENSION_INFUSION: 'Hypotension, infusion', SEPSIS: 'Sepsis', ANAPHYLAXIS: 'Anaphylaxis', ALLERGIC_REACTION: 'Allergic reaction',
  ASTHMA_BRONCHOSPASM: 'Asthma / bronchospasm', COPD: 'COPD', CROUP: 'Croup', STRIDOR: 'Stridor', RESPIRATORY_DISTRESS: 'Respiratory distress',
  RSI_INDUCTION: 'RSI induction', RSI_PARALYSIS: 'RSI paralysis', POST_INTUBATION_SEDATION: 'Post-intubation sedation',
  PROCEDURAL_SEDATION: 'Procedural sedation', AGITATION: 'Agitation', EXCITED_DELIRIUM: 'Hyperactive delirium', SEIZURE: 'Seizure',
  STATUS_EPILEPTICUS: 'Status epilepticus', STROKE: 'Stroke', HYPOGLYCEMIA: 'Hypoglycemia', HYPERGLYCEMIA_DKA: 'Hyperglycemia / DKA',
  HYPERKALEMIA: 'Hyperkalemia', OPIOID_OVERDOSE: 'Opioid overdose', BENZO_OVERDOSE: 'Benzodiazepine overdose',
  ORGANOPHOSPHATE: 'Organophosphate poisoning', CYANIDE: 'Cyanide poisoning', CARBON_MONOXIDE: 'Carbon monoxide poisoning',
  TCA_OVERDOSE: 'Tricyclic overdose', BETA_BLOCKER_CCB_OVERDOSE: 'Beta-blocker / calcium-channel-blocker overdose',
  NAUSEA_VOMITING: 'Nausea / vomiting', PAIN_MILD_MODERATE: 'Mild to moderate pain', PAIN_SEVERE: 'Severe pain',
  TRAUMA_HEMORRHAGE: 'Trauma / hemorrhage', TRAUMATIC_ARREST: 'Traumatic arrest', HEAD_INJURY_TBI: 'Head injury / TBI', BURNS: 'Burns',
  CRUSH_INJURY: 'Crush injury', OBSTETRIC_HEMORRHAGE: 'Obstetric hemorrhage', ECLAMPSIA: 'Eclampsia / pre-eclampsia',
  PRETERM_LABOR: 'Preterm labor', NEONATAL_RESUSCITATION: 'Neonatal resuscitation', FEVER: 'Fever', PEDIATRIC_FEVER: 'Pediatric fever',
  HYPERTHERMIA: 'Hyperthermia', HYPOTHERMIA: 'Hypothermia', DYSTONIC_REACTION: 'Dystonic reaction', ADRENAL_CRISIS: 'Adrenal crisis',
  ALCOHOL_WITHDRAWAL: 'Alcohol withdrawal', NERVE_AGENT: 'Nerve agent exposure', OTHER: 'Other',
};
export const indicationLabel = k => INDICATION_LABELS[k] ?? titleCase(String(k).replace(/_/g, ' '));

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
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
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

// The census product bar: a slim second bar under the shared site header, the way a
// research product names itself below its publisher's chrome. The active section is
// DERIVED from the page's own path rather than passed in, so a new page can never
// forget to say where it is, and two pages in the same section can never disagree.
//
// Every href is a page this build actually writes. Drugs, states and agencies have no
// index page of their own — the landing IS their index — so those three point at it
// and the underline says which one you are inside. A fragment link (/census/#drugs)
// would read better and is deliberately NOT used: the internal-link test resolves
// every /census/ href against the generated path set, and a fragment resolves to
// nothing, so it would be a dead link by that test's definition.
// Overview is first and matches the landing EXACTLY, not by prefix: every census path
// starts with /census/, so a prefix test would light Overview on every page.
const CENSUS_SECTIONS = [
  ['Overview', null, '/census/'],
  ['Drugs', '/census/drugs/', '/census/'],
  ['States', '/census/states/', '/census/'],
  ['Agencies', '/census/agencies/', '/census/'],
  ['Methodology', '/census/methodology/', '/census/methodology/'],
];

export const productBar = path => `  <div class="pbar">
    <div class="wrap">
      <a class="pbar-mark" href="/census/">US EMS Protocol Census</a>
      <nav class="pbar-nav" aria-label="Census sections">${CENSUS_SECTIONS.map(([label, prefix, href]) =>
    `<a href="${href}"${(prefix === null ? path === href : path.startsWith(prefix)) ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    </div>
  </div>`;

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

// ------------------------------------------------- document header + rail parts
//
// The document header bar: kind, title, then a metadata row of chips. It is the one
// loud element on a detail page, and it is loud with a hairline and a red rule rather
// than with colour fills — the red is reserved for the active-section underline and
// the signal pills, so a page that used it for decoration would spend the one place
// the eye is meant to land.

// Status signals. `current` / `review` / `superseded` are the only three, and a page
// that has nothing to signal renders no pill rather than a grey "unknown" one.
const signalPill = (kind, text) => `<span class="pill sig-${kind}">${esc(text)}</span>`;

const chip = text => `<span class="chip">${esc(text)}</span>`;

// kind is the small label above the title (what the old `badge` said). It keeps the
// class name `badge` because it carries the same fact; only its look changed.
const docHeader = ({ kind, title, chips = [], signals = [], lede }) => `      <div class="dochead">
        <span class="badge">${esc(kind)}</span>
        <h1>${title}</h1>
${chips.length || signals.length ? `        <div class="meta">${signals.join('')}${chips.map(chip).join('')}</div>\n` : ''}${lede ? `        <p class="lede">${lede}</p>\n` : ''}      </div>`;

// "Cite this" — the reason a training officer is on the page at all. The citation sits
// in a bordered mono block with a copy button; the button is the only scripted motion
// on the page and it degrades to a plain visible citation with no JS.
//
// The id is derived from the caller, not generated, because a generated one would
// change per build and break the byte-identical rebuild.
const citePanel = (id, lines) => `          <section class="panel" id="${id}">
            <h2>Cite this</h2>
            <div class="citebox" id="${id}-text">${lines.map(l => `<p class="cite">${l}</p>`).join('')}</div>
            <button type="button" class="copybtn" id="${id}-btn">Copy citation</button>
          </section>
          <script>
            (function () {
              var b = document.getElementById('${id}-btn'), t = document.getElementById('${id}-text');
              b.addEventListener('click', function () {
                var s = t.innerText.trim();
                var done = function () { b.textContent = 'Copied'; b.classList.add('ok'); setTimeout(function () { b.textContent = 'Copy citation'; b.classList.remove('ok'); }, 1600); };
                if (navigator.clipboard) { navigator.clipboard.writeText(s).then(done, function () {}); return; }
                var a = document.createElement('textarea');
                a.value = s; document.body.appendChild(a); a.select();
                try { document.execCommand('copy'); done(); } catch (e) {}
                document.body.removeChild(a);
              });
            })();
          </script>`;

// A rail block of related links. Names only, one per line, the way a research record
// points sideways rather than selling a next click.
const railLinks = (heading, items) => (items.length
  ? `          <section class="panel">
            <h2>${esc(heading)}</h2>
            <ul class="railnav">${items.map(([label, href]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`).join('')}</ul>
          </section>`
  : '');

// `rail` is the right-hand column: "Cite this", related links, the submission panel.
// A page that passes none renders one column, so nothing here forces a rail onto a
// page that has nothing to put in it.
// `railLeft` puts the rail first in the source and on the left: the landing page is a
// search-results screen, where the facets belong beside the results they filter, and a
// detail page is a document, where the citation belongs to the right of what it cites.
// `lead` renders ABOVE the layout grid, at the wrap's full width, before the rail
// exists. Only the landing passes one: its hero is an argument, and an argument
// squeezed into the results column beside a facet rail reads as a wide sidebar
// rather than a statement. Detail pages pass nothing and are byte-identical.
const page = ({ title, description, path, trail, jsonLd = [], body, rail = '', railLeft = false, lead = '' }) => {
  const railHtml = rail ? `        <aside class="rail">\n${rail}\n        </aside>` : '';
  const col = `        <div class="col">\n${body}\n        </div>`;
  return `${head({ title, description, path, jsonLd: [breadcrumbs(trail), ...jsonLd] })}
<body>
${nav}
${productBar(path)}
  <main>
    <div class="wrap">
${crumbHtml(trail)}
${lead ? `${lead}\n` : ''}      <div class="layout${rail ? (railLeft ? ' facets' : '') : ' solo'}">
${railLeft ? `${railHtml}\n${col}` : `${col}${railHtml ? `\n${railHtml}` : ''}`}
      </div>
    </div>
  </main>
${footer}`;
};

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

// ------------------------------------------------------------- the tile map
//
// The landing hero's one visual: a fixed-grid tile map of the 50 states plus DC.
// Hand-placed [column, row] coordinates, not a projection and not a library — the
// point is that every state is the same size, so the eye reads COVERAGE rather than
// land area, and Rhode Island is as legible as Texas. The layout is the conventional
// US tile grid: geography survives well enough to orient, and no tile overlaps.
//
// This is a CONSTANT. It never reads the clock, never randomizes, and the render
// walks it in a sorted order, so the SVG is byte-identical across rebuilds — the
// same determinism rule the rest of this file lives under.
export const STATE_TILES = {
  AK: [0, 0], ME: [11, 0],
  WA: [1, 1], ID: [2, 1], MT: [3, 1], ND: [4, 1], MN: [5, 1], WI: [6, 1], MI: [8, 1], NY: [9, 1], VT: [10, 1], NH: [11, 1],
  OR: [1, 2], NV: [2, 2], WY: [3, 2], SD: [4, 2], IA: [5, 2], IL: [6, 2], IN: [7, 2], OH: [8, 2], PA: [9, 2], NJ: [10, 2], MA: [11, 2],
  CA: [1, 3], UT: [2, 3], CO: [3, 3], NE: [4, 3], MO: [5, 3], KY: [6, 3], WV: [7, 3], VA: [8, 3], MD: [9, 3], DE: [10, 3], CT: [11, 3],
  AZ: [2, 4], NM: [3, 4], KS: [4, 4], AR: [5, 4], TN: [6, 4], NC: [7, 4], DC: [9, 4], RI: [11, 4],
  OK: [4, 5], LA: [5, 5], MS: [6, 5], AL: [7, 5], SC: [8, 5],
  HI: [0, 6], TX: [4, 6], GA: [8, 6],
  FL: [9, 7],
};

const TILE_COLS = 12;
const TILE_ROWS = 8;
const TILE_SIZE = 30;
const TILE_GAP = 4;

// Three states a tile can be in, and each is a claim the data can back:
//   named   — the census has a named agency page in that state (the red signal)
//   doc     — at least one document, but no agency page yet (ink)
//   none    — nothing yet (hairline outline)
// Everything comes from documents.json / agencies.json, which the landing already
// holds; no new input, and no number is typed.
function tileMap({ documents, pageStates }) {
  const withDocs = new Set(documents.filter(d => d.state).map(d => String(d.state).toUpperCase()));
  const named = new Set(pageStates.map(s => String(s).toUpperCase()));

  const w = TILE_COLS * (TILE_SIZE + TILE_GAP) - TILE_GAP;
  const h = TILE_ROWS * (TILE_SIZE + TILE_GAP) - TILE_GAP;

  // Sorted by code so the element order never depends on object-key order.
  const tiles = Object.keys(STATE_TILES).sort().map((code, i) => {
    const [c, r] = STATE_TILES[code];
    const cls = named.has(code) ? 'named' : withDocs.has(code) ? 'doc' : 'none';
    const x = c * (TILE_SIZE + TILE_GAP);
    const y = r * (TILE_SIZE + TILE_GAP);
    // The stagger is an index on a sorted list, so it is the same every build. The
    // CSS turns it off wholesale under prefers-reduced-motion.
    return `<g class="tile t-${cls}" style="--i:${i}"><rect x="${x}" y="${y}" width="${TILE_SIZE}" height="${TILE_SIZE}" rx="3"/>`
      + `<text x="${x + TILE_SIZE / 2}" y="${y + TILE_SIZE / 2}" dy="0.35em">${esc(code)}</text></g>`;
  }).join('');

  const nNamed = Object.keys(STATE_TILES).filter(s => named.has(s)).length;
  const nDocs = Object.keys(STATE_TILES).filter(s => withDocs.has(s) && !named.has(s)).length;

  return { svg: `<svg class="tilemap" viewBox="0 0 ${w} ${h}" role="img" aria-label="Map of US states covered by the census: ${num(nNamed)} with a named agency page, ${num(nDocs)} with documents only.">${tiles}</svg>`, nNamed, nDocs };
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

// Report editions are hand-published into the site repo (census/report/<yyyy>-q<n>/,
// scripts/census-report.mjs); the generator never writes them and only links the newest.
const latestReportEdition = () => {
  try { return readdirSync('census/report').filter(d => /^\d{4}-q[1-4]$/.test(d)).sort().at(-1) ?? null; } catch { return null; }
};
export const reportLabel = e => /^\d{4}-q[1-4]$/.test(e) ? `Q${e.slice(6)} ${e.slice(0, 4)}` : String(e);

function landingPage({ manifest, states, drugs, agencyPageCount, agencies = [], documents = [] }) {
  const latestReport = latestReportEdition();
  // Two different numbers, both true: how many agencies the census holds, and
  // how many have a page (the rest are below a thin-page threshold). Printing
  // only the first would promise pages that are deliberately not generated.
  const withheld = manifest.namedAgencies - agencyPageCount;
  // coverage is optional (v2 payloads, or a v3 build before the field lands):
  // the table renders only when at least one agency row carries it, and is
  // omitted entirely otherwise — never a table of blanks, never a throw.
  const coverageRows = agencies.some(a => a.coverage) ? coverageByState(states, agencies, documents) : [];
  // Per-state agency counts for the facet rail. Built from `agencies` (the ones that
  // got a page) so a facet can never promise more rows than the state page lists.
  const facetCounts = new Map(states.map(s => [s, agencies.filter(a => a.state === s).length]));

  // The headline counts, as one dense summary line rather than a row of tiles. Every
  // number still carries its label and its denominator; only the shape changed.
  const summaryLine = `      <p class="summary">${[
    `<span class="n">${num(manifest.namedAgencies)}</span> named agencies`,
    `<span class="n">${num(agencyPageCount)}</span> with a page`,
    `<span class="n">${num(manifest.documents)}</span> documents`,
    `<span class="n">${num(manifest.doseRows)}</span> dose entries`,
    `<span class="n">${esc(pct(manifest.dosesParsed, manifest.doseRows))}</span> machine-parsed of ${num(manifest.doseRows)}`,
    `as of <span class="n">${esc(manifest.asOf)}</span>`,
  ].join('<span class="sep" aria-hidden="true"></span>')}</p>`;

  // The hero is the one place on the census that argues rather than reports: it is
  // the landing, and the landing is the brand. Everything below it, and every detail
  // page, stays in the research register the rest of this file is written in.
  const map = tileMap({ documents, pageStates: states });
  // The map's own caption, in the same honest-counts shape every other number here
  // uses: what is filled, what is outlined, and the n behind each. Derived from the
  // tile classes themselves, so the sentence can never disagree with the picture.
  const mapCounts = [
    `<span class="n">${num(map.nNamed)}</span> states with a named agency page`,
    `<span class="n">${num(map.nDocs)}</span> more with documents and no page yet`,
    `<span class="n">${num(Object.keys(STATE_TILES).length - map.nNamed - map.nDocs)}</span> still blank`,
  ].join(', ');

  const lead = `      <section class="hero">
        <div class="hero-say">
          <span class="badge">Public record</span>
          <h1>Prehospital care varies from agency to agency, and nobody could see how.</h1>
          <p class="dek">Protocols live in thousands of separate PDFs, so the differences between them have never been readable in one place. The United States EMS Protocol Census reads what agencies publish and turns it into a versioned public record of the drugs, doses and routes they carry, so you can compare agencies across the country. It rebuilds itself every night from the agencies' own documents.</p>
        </div>
        <figure class="hero-map">
          ${map.svg}
          <figcaption>${mapCounts}. Filled in red where an agency has a page, in ink where the census holds documents only.</figcaption>
        </figure>
      </section>
      <section class="why">
        <h2>Why it matters</h2>
        <ul class="claims">
          <li><strong>A medic who changes agencies relearns every dose.</strong> The drug is the same and the number is different, and until now there was no way to see which agencies differ or by how much.</li>
          <li><strong>A medical director revising a protocol has no benchmark.</strong> Writing the next version means guessing at what everyone else does. The census shows what the rest of the country actually carries, with the documents behind it.</li>
          <li><strong>Researchers have never had the dataset.</strong> There has been no denominator for prehospital medicine, so questions about how care varies could not be asked, let alone answered.</li>
          <li><strong>Arguing for EMS pay, training and staffing takes evidence.</strong> Anecdote loses those arguments. Numbers that anyone can check and cite do better.</li>
          <li><strong>It updates every night, and agencies decide whether they are in it.</strong> New documents are read and revisions become new versions with the old one kept in the history. Send a public URL to be listed, or ask to be removed and it comes down the same day, no reason needed.</li>
        </ul>
      </section>`;

  const body = `${summaryLine}
      <p class="honest">${num(manifest.dosesParsed)} entries parsed to a number and route, ${num(manifest.dosesPartial)} partially, ${num(manifest.dosesRaw)} kept as written. Raw entries are counted and shown as written, never dropped.${withheldSentence(withheld)}</p>
${drugs.length ? `      <section id="drugs">
        <h2>Drugs<span class="count">${num(drugs.length)}</span></h2>
        <ul class="results">${drugs.map(d => `<li><a href="/census/drugs/${slug(d)}/">${esc(drugLabel(d))}</a><span class="muted">Doses, indications and routes</span></li>`).join('')}</ul>
      </section>` : `      <section id="drugs">
        <h2>Drugs</h2>
        <p>Drug and indication pages are not published for this build: the indication map has not been reviewed since it last changed.</p>
      </section>`}
      <section id="states">
        <h2>States<span class="count">${num(states.length)}</span></h2>
        <ul class="results">${states.map(s => `<li><a href="/census/states/${slug(s)}/">${esc(stateLabel(s))}</a><span class="muted">${num(facetCounts.get(s) ?? 0)} named ${(facetCounts.get(s) ?? 0) === 1 ? 'agency' : 'agencies'}</span></li>`).join('')}</ul>
${coverageRows.length ? `        <h3>Coverage by state</h3>
        <div class="scroll"><table class="coverage">
          <thead><tr><th>State</th><th>With a protocol</th><th>Without</th><th>Statewide baseline</th></tr></thead>
          <tbody>${coverageRows.map(r => `<tr><td><a href="/census/states/${slug(r.state)}/">${esc(stateLabel(r.state))}</a></td><td>${num(r.withProtocol)}</td><td>${num(r.withoutProtocol)}</td><td>${r.statewideBaseline ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody>
        </table></div>` : ''}
      </section>
      <section id="how">
        <h2>How this is built</h2>
        <p><a href="/census/methodology/">Methodology</a>: where documents come from, what is read out of them, what is not captured, and why no dose-level accuracy number is published. <a href="/census/data-license/">Data license</a>: summaries are CC BY 4.0; row-level data is not published.</p>${latestReport ? `
        <p><a href="/census/report/${latestReport}/">State of US EMS Protocols, ${reportLabel(latestReport)}</a>: the quarterly edition, the groups where published protocols disagree most, aggregate only.</p>` : ''}
      </section>`;

  const rail = `          <section class="panel" id="facet-states">
            <h2>States</h2>
            <ul class="facets">${states.map(s => `<li><a href="/census/states/${slug(s)}/">${esc(stateLabel(s))}</a><span class="count">${num(facetCounts.get(s) ?? 0)}</span></li>`).join('')}</ul>
          </section>
${drugs.length ? `          <section class="panel" id="facet-drugs">
            <h2>Drugs A to Z</h2>
            <ul class="facets">${[...drugs].sort((x, y) => drugLabel(x).localeCompare(drugLabel(y))).map(d => `<li><a href="/census/drugs/${slug(d)}/">${esc(drugLabel(d))}</a></li>`).join('')}</ul>
          </section>\n` : ''}${citePanel('cite', [`United States EMS Protocol Census, as of ${esc(manifest.asOf)}. ${ORIGIN}/census/`])}
          <section class="panel" id="list">
            <h2>List your agency</h2>
            <p>If your agency's protocols are a public record and you would like them in the census, or you want an existing listing corrected or removed, send the document's public URL and we will handle it. Removal is same-day, no reason needed.</p>
${submitForm({ id: 'list-form', kind: 'listing', urlLabel: 'Public URL of the protocol document', submitLabel: 'Send it' })}
          </section>`;

  return {
    path: '/census/',
    html: page({
      rail,
      railLeft: true,
      lead,
      title: 'United States EMS Protocol Census - what US EMS agencies actually carry',
      description: `A free, versioned record of United States EMS protocols: ${num(manifest.doseRows)} dose entries from ${num(manifest.namedAgencies)} named agencies, as of ${manifest.asOf}.`,
      path: '/census/',
      trail: [['Home', '/'], ['EMS Census', '/census/']],
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'United States EMS Protocol Census',
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
        <div class="scroll"><table class="dose">
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
  // One signal, from the same two flags the warn lines above state in full. `current`
  // is the claim the page makes when neither flag is set; it is never a guess, because
  // an agency page only exists for an agency with a current listed document.
  const signal = agency.pendingReview
    ? signalPill('review', 'Under review')
    : agency.mayBeOutdated ? signalPill('superseded', 'May be outdated') : signalPill('current', 'Current');
  const body = `${docHeader({
    // Sentence case: the raw value is a lowercase enum ("city", "statewide"), and the
    // kind label reads as a word here, not as a key.
    kind: String(agency.jurisdiction ?? '').replace(/^[a-z]/, c => c.toUpperCase()),
    title: esc(agency.name),
    signals: [signal],
    chips: [
      `${num(doses.length)} dose entries`,
      `${num(drugs.size)} drugs`,
      `${num(agency.documentCount)} ${agency.documentCount === 1 ? 'document' : 'documents'}`,
      ...(where ? [where] : []),
      `effective ${documentDateCell(currentDoc)}`,
      `${pct(parsed, doses.length)} machine-parsed of ${num(doses.length)}`,
    ],
    lede: `${esc(agency.name)}${where ? ` (${esc(where)})` : ''} carries ${num(drugs.size)} drugs across ${num(doses.length)} dose entries in its current published protocol${datePhrase ? `, ${esc(datePhrase)}` : ''}.`,
  })}
${pending}${outdated}      <section id="doses">
        <h2>Drugs and doses<span class="count">${num(drugs.size)}</span></h2>
${rows}
      </section>
${history}`;

  const rail = `${citePanel('cite', [
    esc(`${agency.name}, United States EMS Protocol Census. ${num(doses.length)} dose entries, effective ${documentDateCell(currentDoc)}.`),
    `${ORIGIN}/census/agencies/${esc(agency.agencyKey)}/`,
  ])}
${railLinks('Related', [
    ...(agency.state ? [[`All ${stateLabel(agency.state)} agencies`, `/census/states/${slug(agency.state)}/`]] : []),
    ['All drugs and states', '/census/'],
    ['How this page was built', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
  ])}
          <section class="panel" id="correct">
            <h2>Outdated or wrong?</h2>
            <p>Send the current document's public URL and the listing is rebuilt from it. To have this agency removed from the census entirely, say so and it comes down the same day.</p>
${submitForm({ id: 'correct-form', kind: 'correction', agencyKey: agency.agencyKey, urlLabel: 'Public URL of the current document', submitLabel: 'Send the correction' })}
          </section>`;

  return {
    path: `/census/agencies/${agency.agencyKey}/`,
    html: page({
      rail,
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
  const body = `${docHeader({
    kind: 'State',
    title: `EMS protocols in ${esc(name)}`,
    chips: [
      `${num(listed.length)} named ${listed.length === 1 ? 'agency' : 'agencies'}`,
      `${num(doses.length)} dose entries`,
      `${num(drugs.size)} ${drugs.size === 1 ? 'drug' : 'drugs'}`,
      ...(statewideBaselines.length ? ['statewide baseline'] : []),
    ],
    lede: `${num(listed.length)} named ${listed.length === 1 ? 'agency' : 'agencies'} in ${esc(name)} ${listed.length === 1 ? 'has' : 'have'} published protocols in the census, with ${num(doses.length)} dose entries across ${num(drugs.size)} ${drugs.size === 1 ? 'drug' : 'drugs'}.`,
  })}
${agenciesSection}`;

  const rail = `${citePanel('cite', [
    esc(`United States EMS Protocol Census, ${name}: ${listed.length} named ${listed.length === 1 ? 'agency' : 'agencies'}, ${doses.length} dose entries across ${drugs.size} ${drugs.size === 1 ? 'drug' : 'drugs'}.`),
    `${ORIGIN}/census/states/${slug(state)}/`,
  ])}
${railLinks('Agencies in this state', listed.map(a => [a.name, `/census/agencies/${a.agencyKey}/`]))}
${railLinks('Related', [
    ['All drugs and states', '/census/'],
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
  ])}`;

  return {
    path: `/census/states/${slug(state)}/`,
    html: page({
      rail,
      title: `${name} EMS protocols - agencies, drugs, and doses`,
      description: `${listed.length} named EMS agencies in ${name} with published protocol doses in the United States EMS Protocol Census.`,
      path: `/census/states/${slug(state)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [name, `/census/states/${slug(state)}/`]],
      body,
    }),
  };
}

function drugPage(drugKey, { rows, indicationPaths }) {
  const byInd = groupBy(rows, r => r.indicationKey);
  const agencies = new Set(rows.map(r => r.agencyKey).filter(Boolean));
  const body = `${docHeader({
    kind: 'Drug',
    title: `${esc(drugLabel(drugKey))} in US EMS protocols`,
    chips: [
      `${num(agencies.size)} named agencies`,
      `${num(byInd.size)} ${byInd.size === 1 ? 'indication' : 'indications'}`,
      `${num(rows.length)} dose entries`,
    ],
    lede: `${num(agencies.size)} named ${agencies.size === 1 ? 'agency carries' : 'agencies carry'} ${esc(drugLabel(drugKey))} across ${num(byInd.size)} ${byInd.size === 1 ? 'indication' : 'indications'} and ${num(rows.length)} dose entries.`,
  })}
${stats([
    ['agencies', num(agencies.size)],
    ['indications', num(byInd.size)],
    ['dose entries', num(rows.length)],
    ['machine-parsed', `${pct(rows.filter(r => r.parseStatus === 'parsed').length, rows.length)} of ${num(rows.length)}`],
  ])}
      <section id="indications">
        <h2>Indications<span class="count">${num(byInd.size)}</span></h2>
        <ul class="results">${[...byInd].map(([k, rs]) => {
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

// A five-number range bar: the full min-to-max span as a hairline track, the middle
// half (p25 to p75) as a filled band, the median as a tick, with the two extremes
// labelled in mono beneath their own ends. It is the one drawn element on the site,
// and it earns that because a range is the thing a training officer came to read: a
// median alone hides whether forty agencies agree or split.
//
// The digit table stays underneath, unchanged. It is what a screen reader reads, what
// the digit guard greps, and what someone copies into a citation — the bar is the
// glance, never the source of the number.
function fiveNumberBar(dist, unit) {
  const span = dist.max - dist.min;
  const at = v => (span > 0 ? ((v - dist.min) / span) * 100 : 50);
  // A band of literally zero width (every source agreed on the quartiles) would draw
  // nothing and read as a broken bar, so it gets a visible minimum and is nudged back
  // inside the track. The digits underneath are the exact claim; the bar is the glance.
  const MIN_BAND = 1.5;
  const width = Math.max(at(dist.p75) - at(dist.p25), MIN_BAND);
  const left = Math.min(at(dist.p25), 100 - width);
  return `        <div class="five">
          <div class="five-track" role="img" aria-label="Range ${esc(fmtNum(dist.min))} to ${esc(fmtNum(dist.max))} ${esc(unit)}, middle half ${esc(fmtNum(dist.p25))} to ${esc(fmtNum(dist.p75))}, median ${esc(fmtNum(dist.median))}"><span class="five-iqr" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></span><span class="five-med" style="left:${at(dist.median).toFixed(2)}%"></span></div>
          <div class="five-ends" aria-hidden="true"><span>${esc(fmtNum(dist.min))}</span><span>${esc(fmtNum(dist.max))}</span></div>
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

// The one sentence for "N named agencies exist but have no page of their own" —
// shared so the landing page and any other page stating the same fact (a drug
// page's named-agency count vs its linked list) say it identically rather than
// drifting into two different claims about the same withheld set.
const withheldSentence = n => n > 0
  ? ` ${num(n)} named ${n === 1 ? 'agency has' : 'agencies have'} too little published detail for a page of ${n === 1 ? 'its' : 'their'} own and ${n === 1 ? 'is' : 'are'} counted here only.`
  : '';

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
  const groupAgencies = new Set(groups.flatMap(g => g.agencyKeys ?? []));
  const named = namedAgencyList(groupAgencies, pageAgencies);
  // The withheld count must come from the same population the list above is built
  // from (groupAgencies), not summary.n.agencies: that rollup counts every agency
  // with a row for this drug, raw-only rows included, so an agency whose page
  // exists but whose rows here are all raw would inflate `n.agencies - named.count`
  // even though it has no pageless agency to disclose.
  const pageless = [...groupAgencies].filter(k => !pageAgencies.has(k)).length;
  // An indication can appear in drugs[].indications (every admitted row, raw included)
  // with no entry at all in `groups` (a comparable group needs a parsed value) — every
  // row under it was raw. Its n= then counts "sources with rows", not "sources in a
  // comparable group" like every sibling on this list, so it is labelled distinctly
  // rather than left to read as the same claim.
  const groupIndications = new Set(groups.map(g => g.key.indicationKey));
  const body = `${docHeader({
    kind: 'Drug',
    title: `${esc(drugLabel(drugKey))} in US EMS protocols`,
    signals: [manifest.flaggedRows ? signalPill('review', `${num(manifest.flaggedRows)} under review`) : signalPill('current', 'Current')],
    chips: [
      `${num(summary.n.sources)} sources`,
      `${num(summary.n.agencies)} named agencies`,
      `${num(summary.n.states)} states`,
      `as of ${manifest.asOf}`,
    ],
    lede: `${num(summary.n.sources)} published ${summary.n.sources === 1 ? 'protocol carries' : 'protocols carry'} ${esc(drugLabel(drugKey))} across ${num(indications.length)} ${indications.length === 1 ? 'indication' : 'indications'}, from ${num(summary.n.agencies)} named ${summary.n.agencies === 1 ? 'agency' : 'agencies'} in ${num(summary.n.states)} ${summary.n.states === 1 ? 'state' : 'states'}.`,
  })}
${stats([
    ['protocols', num(summary.n.sources)],
    ['named agencies', num(summary.n.agencies)],
    ['states', num(summary.n.states)],
    ['indications', num(indications.length)],
    ['dose entries', num(summary.n.rows)],
    // n.parsed is the real numerator when the build supplies it. Reconstructing one
    // from parsedShare (a float) fabricates a count that can be off by a row — the
    // fallback below renders the share alone, with no numerator claimed.
    ['machine-parsed', summary.n.parsed != null
      ? `${pct(summary.n.parsed, summary.n.rows)} of ${num(summary.n.rows)}`
      : `${Math.round(summary.parsedShare * 100)}%`],
  ])}
${underReview(manifest)}      <section id="indications">
        <h2>Indications<span class="count">${num(indications.length)}</span></h2>
        <ul class="results">${indications.map(({ indicationKey, sources }) => {
    const p = indicationPaths.get(`${drugKey}/${indicationKey}`);
    const rawOnly = !groupIndications.has(indicationKey);
    const label = `${esc(indicationLabel(indicationKey))} <span class="muted">n=${num(sources)}${rawOnly ? ', raw only' : ''}</span>`;
    return `<li>${p ? `<a href="${p}">${label}</a>` : label}</li>`;
  }).join('')}</ul>
      </section>
${dists.length ? `      <section id="distributions">
        <h2>Published distributions<span class="count">${num(dists.length)}</span></h2>
        <p class="muted">Only groups with at least ${MIN_SOURCES} sources publish a distribution; thinner groups show their count alone.</p>
        <div class="scroll"><table class="dose">
          <thead><tr><th>Indication</th><th>Population</th><th>Sources</th><th>Median</th><th>Middle half</th><th>Unit</th></tr></thead>
          <tbody>${dists.map(g => `<tr><td>${esc(indicationLabel(g.key.indicationKey))}</td><td>${esc(groupLabel(g.key))}</td><td>${num(g.n.sources)}</td><td>${esc(fmtNum(g.dist.median))}</td><td>${esc(fmtNum(g.dist.p25))}&ndash;${esc(fmtNum(g.dist.p75))}</td><td>${esc(unitLabel(g.key))}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>` : ''}
${named.html}${pageless > 0
    ? `      <p class="honest">${withheldSentence(pageless).trim()}</p>\n`
    : ''}`;

  const rail = `${citePanel('cite', [
    esc(`United States EMS Protocol Census, ${drugLabel(drugKey)}: n=${summary.n.sources} protocols from ${summary.n.agencies} named agencies / ${summary.n.states} states, as of ${manifest.asOf}`),
  ])}
          <p class="muted railnote">Each distribution on this page carries its own n. A per-indication figure is narrower than this drug-wide one, and the group's own citation line is the one to quote for it.</p>
${railLinks('Indications', indications
    .filter(({ indicationKey }) => indicationPaths.has(`${drugKey}/${indicationKey}`))
    .map(({ indicationKey }) => [indicationLabel(indicationKey), indicationPaths.get(`${drugKey}/${indicationKey}`)]))}
${railLinks('Related', [
    ['All drugs and states', '/census/'],
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
  ])}`;

  return {
    path: `/census/drugs/${slug(drugKey)}/`,
    html: page({
      rail,
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

  // agencyKeys has always been a build requirement (namedAgencyList above already
  // unions it), so the agency total is always an exact union. sourceKeys/states are
  // newer v3 additions with the same sorted-distinct shape; when a group carries
  // them, union them the same way. When it does not (an older compare.json), fall
  // back to Math.max across groups — but that max UNDERSTATES whenever two groups
  // have disjoint sets (five adult-only and five peds-only sources reads "5", not
  // the true 10), so it is rendered as an explicit floor ("at least N"), never a
  // max labelled as a total.
  const agencyUnion = new Set(ordered.flatMap(g => g.agencyKeys ?? [])).size;
  const sourcesFloor = !ordered.every(g => g.sourceKeys);
  const statesFloor = !ordered.every(g => g.states);
  const totals = {
    sources: sourcesFloor
      ? ordered.reduce((n, g) => Math.max(n, g.n.sources), 0)
      : new Set(ordered.flatMap(g => g.sourceKeys)).size,
    agencies: agencyUnion,
    states: statesFloor
      ? ordered.reduce((n, g) => Math.max(n, g.n.states), 0)
      : new Set(ordered.flatMap(g => g.states)).size,
    rows: ordered.reduce((n, g) => n + g.n.rows, 0),
  };

  const lede = lead
    ? `${groupLabel(lead.key).replace(', weight-based', ' weight-based')} dosing has a median of ${esc(fmtNum(lead.dist.median))} ${esc(unitLabel(lead.key))} across ${num(lead.n.sources)} published ${lead.n.sources === 1 ? 'protocol' : 'protocols'}, with the middle half between ${esc(fmtNum(lead.dist.p25))} and ${esc(fmtNum(lead.dist.p75))}.`
    : `No group under this indication has reached ${MIN_SOURCES} sources, so no distribution is published. The counts below are what the census holds today.`;

  const named = namedAgencyList(new Set(ordered.flatMap(g => g.agencyKeys ?? [])), pageAgencies);

  const distSections = ordered.map(g => {
    // Sorted here rather than trusted from the file (the same rule every other list
    // in this generator follows): share desc, then route name, matching the v2
    // sibling's route sort so file order can never flip which route reads first.
    const routes = g.routes.filter(r => r.route).sort((x, y) => y.share - x.share || x.route.localeCompare(y.route));
    return `      <section id="g-${slug(`${g.key.population}-${g.key.perKg ? 'perkg' : 'flat'}-${g.key.unit}`)}">
        <h2>${esc(groupLabel(g.key))}<span class="unit">${esc(unitLabel(g.key))}</span></h2>
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

  const path = `/census/drugs/${slug(drugKey)}/${slug(indicationKey)}/`;
  const body = `${docHeader({
    kind: 'Indication',
    title: `${esc(drugLabel(drugKey))} for ${esc(indicationLabel(indicationKey))}`,
    signals: [manifest.flaggedRows ? signalPill('review', `${num(manifest.flaggedRows)} under review`) : signalPill('current', 'Current')],
    chips: [
      `${sourcesFloor ? 'at least ' : ''}${num(totals.sources)} sources`,
      `${num(totals.agencies)} named agencies`,
      `${statesFloor ? 'at least ' : ''}${num(totals.states)} states`,
      `as of ${manifest.asOf}`,
    ],
    lede,
  })}
${stats([
    ['sources', sourcesFloor ? `at least ${num(totals.sources)}` : num(totals.sources)],
    ['named agencies', num(totals.agencies)],
    ['states', statesFloor ? `at least ${num(totals.states)}` : num(totals.states)],
    ['entries', num(totals.rows)],
    ['named here', num(named.count)],
  ])}
${underReview(manifest)}${distSections}
${named.html}`;

  // One cite panel per page, carrying the LEAD group's citation line — the one a
  // reader is most likely to be quoting. Each group still prints its own line beside
  // its own numbers, because a per-group n is a different claim from this one.
  const rail = `${citePanel('cite', [esc(lead ? lead.cite : `United States EMS Protocol Census, ${drugLabel(drugKey)} for ${indicationLabel(indicationKey)}, as of ${manifest.asOf}`)])}
${railLinks('Related', [
    [`All ${drugLabel(drugKey)} indications`, `/census/drugs/${slug(drugKey)}/`],
    ['All drugs and states', '/census/'],
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
  ])}`;

  return {
    path,
    html: page({
      rail,
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

  const body = `${docHeader({
    kind: 'Indication',
    title: `${esc(drugLabel(drugKey))} for ${esc(indicationLabel(indicationKey))}`,
    chips: [
      `${num(rows.length)} entries`,
      `${num(parsedCount)} with a number`,
      `${num(new Set(rows.map(r => r.agencyKey).filter(Boolean)).size)} agencies`,
    ],
    lede,
  })}
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

// A sticky in-page contents list for the two long reference pages. The entries are
// written out beside the sections they point at rather than scraped from the body:
// scraping would mean parsing the generator's own output, and a hand-kept pair that
// can drift is worse than one list that is obviously next to what it names. Every
// href is a fragment on this same page, so the internal-link check never sees it.
const contents = items => `          <nav class="panel toc" aria-label="On this page">
            <h2>On this page</h2>
            <ul>${items.map(([label, id]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('')}</ul>
          </nav>`;

function methodologyPage(manifest) {
  const m = manifest;
  const body = `${docHeader({
    kind: 'Methodology',
    title: 'How the EMS Census is built',
    chips: [
      `${num(m.documents)} documents`,
      `${num(m.namedAgencies)} named agencies`,
      `${num(m.doseRows)} dose entries`,
      `as of ${m.asOf}`,
    ],
    lede: `Everything on the census comes from protocol documents agencies themselves published. This page says where each document came from, what was read out of it, what was not, and which numbers are therefore safe to quote. As of ${esc(m.asOf)}.`,
  })}
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
        <p class="cite">United States EMS Protocol Census, as of ${esc(m.asOf)}. ${ORIGIN}/census/ &middot; <a href="/census/data-license/">Data license</a></p>
      </section>`;

  const rail = `${contents([
    ['How a document reaches us', 'origin'],
    ['Document identity is a content hash', 'identity'],
    ['Classification and what stays unpublished', 'classification'],
    ['What is read out of a document', 'extraction'],
    ['Parsed, partial, and raw', 'parse'],
    ['Units, per-kilogram doses, and ranges', 'units'],
    ['Sources and named agencies', 'sources'],
    ['Outlier review', 'outliers'],
    ['Accuracy: not yet measured', 'accuracy'],
    ['Corrections and removal', 'corrections'],
    ['Freshness', 'freshness'],
    ['Citation', 'cite'],
  ])}
${railLinks('Related', [
    ['Data license', '/census/data-license/'],
    ['All drugs and states', '/census/'],
  ])}`;

  return {
    path: '/census/methodology/',
    html: page({
      rail,
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
  const body = `${docHeader({
    kind: 'License',
    title: 'Census data license',
    chips: ['Summaries CC BY 4.0', 'Rows unpublished', 'Same-day takedown'],
    lede: 'What you may do with the numbers on this site, what is not published, and how to have a listing corrected or removed.',
  })}

      <section id="summaries">
        <h2>Summaries and comparisons: CC BY 4.0</h2>
        <p>The aggregate figures published on this site &mdash; the distributions, counts, route shares, and the <code>compare.json</code> file behind them &mdash; are licensed under the <a href="https://creativecommons.org/licenses/by/4.0/" rel="nofollow noopener">Creative Commons Attribution 4.0 International license</a>. Use them, republish them, build on them commercially. The one condition is attribution.</p>
        <h3>How to cite</h3>
        <p>Every number the census publishes carries its own citation line, and that line is the attribution:</p>
        <p class="cite">United States EMS Protocol Census, n=&lt;sources&gt; protocols from &lt;agencies&gt; named agencies / &lt;states&gt; states, updated &lt;month year&gt;</p>
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

  const rail = `${contents([
    ['Summaries and comparisons', 'summaries'],
    ['Row-level data is not published', 'rows'],
    ['The documents themselves', 'documents'],
    ['Corrections, opt-out, and takedown', 'takedown'],
    ['Full terms', 'terms'],
  ])}
${railLinks('Related', [
    ['Methodology', '/census/methodology/'],
    ['All drugs and states', '/census/'],
  ])}`;

  return {
    path: '/census/data-license/',
    html: page({
      rail,
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

  // Two keys that slug identically (CARDIAC-ARREST and CARDIAC_ARREST both slug to
  // "cardiac-arrest") collide on one path, and the second write silently wins — a
  // page vanishes with no build failure to say so. Abort with the same operator-legible
  // sentence the other contract aborts use, rather than publishing a page for one key
  // and calling it done.
  const seenPaths = new Set();
  for (const f of files) {
    if (seenPaths.has(f.path)) {
      throw new Error(`two different keys produced the same page path ${f.path} — one page silently overwrote the other; check for keys that slug identically (e.g. CARDIAC-ARREST vs CARDIAC_ARREST)`);
    }
    seenPaths.add(f.path);
  }

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


const CSS = `:root{
  --ground:oklch(0.99 0.003 250);
  --panel:oklch(0.965 0.006 250);
  --ink:oklch(0.22 0.015 260);
  --muted:oklch(0.47 0.02 260);
  --rule:oklch(0.87 0.008 260);
  --accent:oklch(0.52 0.19 27);
  --link:oklch(0.42 0.11 255);
  --sig-current:oklch(0.52 0.13 150);
  --sig-review:oklch(0.66 0.15 75);
  --r:6px;
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:1rem;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}

/* the shared site header keeps its own dark chrome; only its own rules live here */
header{background:oklch(0.19 0.015 260);border-bottom:1px solid oklch(0.30 0.02 260)}
.navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 0;gap:16px;flex-wrap:wrap}
.brand-link{display:flex;align-items:center;gap:8px;color:oklch(0.97 0.004 250);text-decoration:none;font-weight:600;font-size:1.05rem}
.nav-links{display:flex;gap:4px;flex-wrap:wrap}
.nav-btn{padding:6px 12px;border:1px solid oklch(0.34 0.02 260);border-radius:var(--r);text-decoration:none;font-size:.875rem;font-weight:500;color:oklch(0.90 0.006 250)}
.nav-btn:hover{background:oklch(0.26 0.018 260);text-decoration:none}

/* census product bar: the one loud element besides the document header */
.pbar{background:var(--ground);border-bottom:1px solid var(--rule)}
.pbar .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.pbar-mark{padding:14px 0;font-weight:600;font-size:1.05rem;color:var(--ink);text-decoration:none;letter-spacing:-.01em}
.pbar-mark:hover{color:var(--accent)}
.pbar-nav{display:flex;gap:20px;flex-wrap:wrap;align-self:stretch;align-items:stretch}
.pbar-nav a{display:flex;align-items:center;padding:14px 0;font-size:.875rem;font-weight:500;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-1px}
.pbar-nav a:hover{color:var(--ink)}
.pbar-nav a.on{color:var(--ink);font-weight:600;border-bottom-color:var(--accent)}

main{padding:24px 0 72px}
.crumbs{font-size:.8125rem;color:var(--muted);margin:0 0 20px}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{color:var(--link);text-decoration:underline}
.crumbs .sep{margin:0 6px;opacity:.6}

.layout{display:grid;grid-template-columns:minmax(0,1fr) 316px;gap:56px;align-items:start}
.layout.facets{grid-template-columns:264px minmax(0,1fr)}
.layout.solo{grid-template-columns:minmax(0,1fr)}
.col{min-width:0}
.rail{min-width:0;display:flex;flex-direction:column;gap:16px;position:sticky;top:16px}

/* document header bar */
.dochead{border-bottom:1px solid var(--rule);padding-bottom:20px;margin-bottom:28px}
.badge{display:block;font-size:.8125rem;font-weight:500;color:var(--muted);margin:0 0 4px}
h1{font-size:1.8125rem;line-height:1.25;margin:0 0 8px;font-weight:600;letter-spacing:-.015em}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.chip,.pill{display:inline-block;border:1px solid var(--rule);border-radius:var(--r);padding:2px 8px;font-size:.8125rem;line-height:1.5;color:var(--muted);background:var(--panel);font-variant-numeric:tabular-nums}
.pill{font-weight:500;background:transparent}
.sig-current{color:var(--sig-current);border-color:color-mix(in oklch,var(--sig-current) 40%,var(--rule))}
.sig-review{color:oklch(0.48 0.13 75);border-color:color-mix(in oklch,var(--sig-review) 50%,var(--rule))}
.sig-superseded{color:var(--muted)}

/* ---------------------------------------------------------------- the hero
   The landing is the brand register; every detail page stays in the research
   register above. The scale jump is the whole move: a 700-weight statement at
   ~3.5x the body, tightened, against a 400-weight dek. One family, one accent. */
.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(32px,5vw,72px);align-items:center;margin:4px 0 clamp(40px,6vw,64px);padding-bottom:clamp(36px,5vw,56px);border-bottom:1px solid var(--rule)}
.hero-say{min-width:0}
.hero .badge{margin:0 0 14px}
.hero h1{font-size:clamp(2.125rem,4.4vw,3.9rem);line-height:1.05;letter-spacing:-.035em;font-weight:700;margin:0 0 22px;max-width:15ch;text-wrap:balance}
.hero .dek{font-size:clamp(1rem,1.2vw,1.0625rem);line-height:1.62;color:var(--muted);margin:0;max-width:54ch}

/* the tile map: equal-area states, so the eye reads coverage and not acreage */
.hero-map{margin:0;min-width:0}
.tilemap{display:block;width:100%;height:auto}
.tilemap .tile rect{fill:none;stroke:var(--rule);stroke-width:1}
.tilemap .tile text{font-family:var(--mono);font-size:11px;font-weight:500;text-anchor:middle;fill:var(--muted)}
.tilemap .t-doc rect{fill:var(--ink);stroke:var(--ink)}
.tilemap .t-doc text{fill:var(--ground)}
.tilemap .t-named rect{fill:var(--accent);stroke:var(--accent)}
.tilemap .t-named text{fill:oklch(0.99 0.003 250)}
.hero-map figcaption{margin:16px 0 0;font-size:.8125rem;line-height:1.55;color:var(--muted);max-width:46ch}
.hero-map figcaption .n{font-family:var(--mono);font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}

/* the one orchestrated page-load moment: the tiles arrive, nothing else moves */
@media(prefers-reduced-motion:no-preference){
  .tilemap .tile{opacity:0;animation:tile-in .4s cubic-bezier(.22,1,.36,1) forwards;animation-delay:calc(var(--i)*8ms)}
}
@keyframes tile-in{from{opacity:0}to{opacity:1}}

/* why it matters: a flowing list of statements, not a grid of cards */
.why{margin:0 0 clamp(36px,5vw,52px)}
.why h2{margin-top:0}
ul.claims{list-style:none;padding:0;margin:0;max-width:68ch}
ul.claims li{padding:14px 0;border-bottom:1px solid var(--rule);font-size:1rem;line-height:1.6;color:var(--muted)}
ul.claims li:first-child{border-top:1px solid var(--rule)}
ul.claims strong{font-weight:600;color:var(--ink)}

h2{font-size:1.25rem;line-height:1.35;margin:44px 0 12px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
h3{font-size:1.05rem;margin:28px 0 8px;font-weight:600;color:var(--ink)}
h2 .count{font-family:var(--mono);font-size:.8125rem;font-weight:400;color:var(--muted);background:var(--panel);border:1px solid var(--rule);border-radius:999px;padding:0 8px;font-variant-numeric:tabular-nums}
h2 .unit{font-family:var(--mono);font-size:.875rem;font-weight:400;color:var(--muted)}
p{margin:0 0 12px;max-width:72ch}
.lede{font-size:1.05rem;color:var(--muted);margin:8px 0 0;max-width:72ch}
.honest,.cite{font-size:.875rem;color:var(--muted)}

/* the headline counts, as one dense line rather than tiles */
.summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:0 0 16px;font-size:.9375rem;color:var(--muted);max-width:none}
.summary .n{font-family:var(--mono);font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.summary .sep{width:1px;align-self:stretch;background:var(--rule);margin:2px 4px}

/* stats keep their markup (asserted by the page tests); only the look changed */
.stats{display:flex;flex-wrap:wrap;gap:0;margin:0 0 20px;border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);overflow:hidden}
.stat{flex:1 1 132px;padding:10px 14px;border-right:1px solid var(--rule)}
.stat:last-child{border-right:0}
.stat .v{display:block;font-family:var(--mono);font-size:1.05rem;font-weight:500;font-variant-numeric:tabular-nums;line-height:1.4}
.stat .l{display:block;font-size:.8125rem;color:var(--muted);line-height:1.4}

.warn{background:oklch(0.975 0.035 85);border:1px solid oklch(0.86 0.075 80);border-radius:var(--r);padding:10px 14px;font-size:.9375rem;margin:0 0 16px;max-width:72ch}

/* dense hairline tables, mono numerals, no zebra, hover a panel tint */
.scroll{overflow-x:auto;overscroll-behavior-x:contain;border:1px solid var(--rule);border-radius:var(--r);margin:0 0 16px}
/* min-width:100% rather than width:100%: a table with more columns than fit takes its
   natural width and scrolls inside .scroll, instead of crushing its last column to one
   character per line. A table that does fit still fills the panel. */
table{min-width:100%;border-collapse:collapse;font-size:.875rem;font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:600;color:var(--muted);background:var(--panel);border-bottom:1px solid var(--rule);padding:8px 12px;white-space:nowrap;font-size:.8125rem}
td{padding:8px 12px;border-bottom:1px solid var(--rule);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:var(--panel)}
table.dose td:nth-child(n+3),table.coverage td:nth-child(n+2){font-family:var(--mono)}
table.dose td:nth-child(3){white-space:nowrap}
/* the source cell is prose, not a number: it wraps inside its own column instead of
   forcing the table wider than the panel it sits in */
td.src{font-family:var(--sans);white-space:nowrap}
.src,.muted{color:var(--muted);font-size:.8125rem}
.raw{font-family:var(--mono);font-size:.8125rem}

/* landing results rows and facet rail */
ul.results{list-style:none;padding:0;margin:0;border-top:1px solid var(--rule)}
ul.results li{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:9px 4px;border-bottom:1px solid var(--rule)}
ul.results li:hover{background:var(--panel)}
ul.results li>a{font-weight:500}
ul.facets{list-style:none;padding:0;margin:0;font-size:.875rem}
ul.facets li{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:4px 0}
ul.facets a{text-decoration:none;color:var(--link)}
ul.facets a:hover{text-decoration:underline}
ul.facets .count{font-family:var(--mono);font-size:.8125rem;color:var(--muted);font-variant-numeric:tabular-nums}
ul.cols{list-style:none;padding:0;margin:0 0 12px;columns:3;column-gap:24px}
ul.cols li{break-inside:avoid;padding:3px 0;font-size:.9375rem}
ul.inline{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-wrap:wrap;gap:6px}
ul.inline li{background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);padding:3px 10px;font-size:.875rem;font-variant-numeric:tabular-nums}

/* rail panels */
.panel{border:1px solid var(--rule);border-radius:var(--r);padding:14px 16px;background:var(--ground)}
.panel h2{font-size:.9375rem;margin:0 0 10px;font-weight:600}
.panel p{font-size:.875rem;margin:0 0 10px;max-width:none}
.railnote{font-size:.8125rem;margin:0;padding:0 2px}
ul.railnav{list-style:none;padding:0;margin:0;font-size:.875rem}
ul.railnav li{padding:4px 0;border-bottom:1px solid var(--rule)}
ul.railnav li:last-child{border-bottom:0}
ul.railnav a{text-decoration:none}
ul.railnav a:hover{text-decoration:underline}
.toc{position:sticky;top:16px}
.toc ul{list-style:none;padding:0;margin:0;font-size:.875rem}
.toc li{padding:3px 0}
.toc a{text-decoration:none;color:var(--muted)}
.toc a:hover{color:var(--link);text-decoration:underline}

/* cite this */
.citebox{border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);padding:10px 12px;margin:0 0 10px}
.citebox .cite{font-family:var(--mono);font-size:.8125rem;line-height:1.55;color:var(--ink);margin:0;word-break:break-word}
.citebox .cite+.cite{margin-top:6px}
.copybtn{font:inherit;font-size:.875rem;font-weight:500;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);padding:5px 12px;cursor:pointer}
.copybtn:hover{background:oklch(0.94 0.008 250)}
.copybtn.ok{color:var(--sig-current);border-color:color-mix(in oklch,var(--sig-current) 45%,var(--rule))}

/* the five-number range bar: min to max track, middle half filled, median tick */
.five{margin:0 0 16px}
.five-track{position:relative;height:10px;background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);margin:14px 0 4px}
.five-iqr{position:absolute;top:-1px;bottom:-1px;background:color-mix(in oklch,var(--accent) 22%,var(--ground));border:1px solid color-mix(in oklch,var(--accent) 55%,var(--rule));border-radius:3px}
.five-med{position:absolute;top:-5px;bottom:-5px;width:2px;background:var(--accent);border-radius:1px}
.five-ends{display:flex;justify-content:space-between;font-family:var(--mono);font-size:.75rem;color:var(--muted);font-variant-numeric:tabular-nums;margin:0 0 10px}
.five-nums{min-width:0;width:auto;font-size:.8125rem}
.five-nums th{background:transparent;border-bottom:1px solid var(--rule);padding:4px 16px 4px 0;font-weight:500}
.five-nums td{font-family:var(--mono);padding:4px 16px 4px 0;border-bottom:0}
.five-nums tbody tr:hover{background:transparent}
.hist{min-width:0}
.hist th{width:160px;font-family:var(--mono);color:var(--ink);background:transparent;border:0;padding:4px 12px 4px 0;font-weight:400}
.hist td{border:0;padding:4px 0}
.hist .n{width:56px;text-align:right;color:var(--muted);font-family:var(--mono)}
.hist tbody tr:hover{background:transparent}
.bar{display:block;height:10px;background:var(--accent);border-radius:2px;min-width:2px}

/* forms, as a compact rail panel */
.submit-form{display:flex;flex-direction:column;gap:4px;margin:0}
.submit-form label{font-size:.8125rem;color:var(--muted)}
.submit-form input{background:var(--ground);border:1px solid var(--rule);border-radius:var(--r);color:var(--ink);padding:6px 10px;font:inherit;font-size:.875rem;width:100%}
.submit-form input:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.submit-form button{align-self:flex-start;margin-top:8px;background:var(--accent);color:oklch(0.99 0.003 250);border:1px solid var(--accent);border-radius:var(--r);padding:6px 14px;font:inherit;font-weight:500;font-size:.875rem;cursor:pointer}
.submit-form button:hover{background:oklch(0.46 0.19 27)}
.submit-form button[disabled]{opacity:.5;cursor:default}
.submit-form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.form-msg{font-size:.8125rem;color:var(--muted);min-height:1.2em;margin:8px 0 0}

footer{border-top:1px solid var(--rule);padding:24px 0 32px;color:var(--muted);font-size:.8125rem;background:var(--panel);margin-top:24px}
footer p{max-width:none}
.disclaimer{border:1px solid var(--rule);border-radius:var(--r);background:var(--ground);padding:10px 14px;margin:0 0 12px;max-width:72ch}

@media(max-width:960px){
  .layout,.layout.facets{grid-template-columns:minmax(0,1fr);gap:32px}
  .rail,.toc{position:static}
  ul.cols{columns:2}
  /* hero and map stack; the map keeps its aspect via viewBox and simply gets wider */
  .hero{grid-template-columns:minmax(0,1fr);gap:32px}
  .hero h1{max-width:20ch}
  .hero-map figcaption{max-width:none}
}
@media(max-width:640px){
  ul.cols{columns:1}
  h1{font-size:1.5rem}
  .hero h1{font-size:2rem;letter-spacing:-.028em;max-width:none}
  .stat{flex:1 1 100%;border-right:0;border-bottom:1px solid var(--rule)}
  .stat:last-child{border-bottom:0}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
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
    // dose_latest.json, a slug collision) are all operator-legible SENTENCES. The
    // nightly cards what this prints, and a stack trace is a worse card than the
    // sentence that names what to do — so the message goes to stderr on its own and
    // the stack only follows for a genuinely unexpected failure.
    console.error(`census-pages: ${e.message}`);
    if (!/schemaVersion|share one version|--rows|dose_latest\.json is still|same page path/.test(e.message)) console.error(e.stack);
    process.exit(1);
  }
  if (!quiet) {
    console.log(`census-pages: ${result.files.length} files, ${result.urls.length} URLs -> ${outDir}`);
  }
}
