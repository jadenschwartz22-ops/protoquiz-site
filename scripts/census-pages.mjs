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
import { pathToFileURL } from 'node:url';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD, assetHash } from './shared-chrome.mjs';
import { loadThumbs, censusSlides, slideshow, SLIDES_JS } from './research-slides.mjs';

// The census is UNPUBLISHED until the new research site launches (2026-09-20, Jaden).
// Pages still build and still resolve, but they must not be indexed. Set
// CENSUS_ROBOTS=index,follow to re-publish; the DEFAULT is the safe state, so a
// forgotten env var leaves the census hidden rather than silently public.
const ROBOTS = process.env.CENSUS_ROBOTS || "noindex,nofollow";

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

// The findings carousel the /research hub shows, reused on the landing. Empty when
// assets/research-thumbs.json was never built (the Pi nightly): the landing skips it.
const SLIDES = censusSlides(loadThumbs());

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
// The census focuses on the US. Agencies outside it are real listings and are still
// published, but counted and listed apart, never inside the US totals. The agency's own
// `country` (ISO-2) is the truth for where it is, never a guess from its region code:
// region codes are only unique within a country (WA is Washington and Western Australia).
// A new country needs only a line here; an unknown ISO code renders as the code.
export const COUNTRIES = {
  US: 'United States', CA: 'Canada', AU: 'Australia', ZA: 'South Africa', TR: 'Türkiye',
  GB: 'United Kingdom', NZ: 'New Zealand', IE: 'Ireland',
};
const REGIONS = {
  US: STATE_NAMES,
  AU: { QLD: 'Queensland', NSW: 'New South Wales', VIC: 'Victoria', WA: 'Western Australia', SA: 'South Australia', TAS: 'Tasmania', NT: 'Northern Territory', ACT: 'Australian Capital Territory' },
  CA: { ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec', MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick' },
};
const countryOf = a => a?.country || 'US';
const countryName = c => COUNTRIES[c] ?? String(c);
// A US code renders as its state name; a region elsewhere as "Region, Country"; an
// unrecognized code as itself rather than being dropped.
const stateLabel = (code, country = 'US') => {
  const name = REGIONS[country]?.[String(code).toUpperCase()] ?? String(code);
  return country === 'US' ? name : `${name}, ${countryName(country)}`;
};
// "Includes N agencies outside the US." -- the comparisons pool every agency, so a page
// whose numbers include non-US agencies says so in one line. Empty when all are US.
const abroadCount = (keys, agencyByKey) => [...keys].filter(k => countryOf(agencyByKey.get(k)) !== 'US').length;
const abroadNote = n => (n ? `      <p class="muted">Includes ${num(n)} ${n === 1 ? 'agency' : 'agencies'} outside the US.</p>\n` : '');
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
    guidelines: readGuidelines(dataDir),
  };
}

// Curated national-guideline doses (reference/guidelines.json), hand-kept and quoted from
// the primary source. A subdirectory, because the nightly build deletes stray top-level
// *.json in --data. Absent means no guideline tags, never an invented one.
function readGuidelines(dataDir) {
  try { return JSON.parse(readFileSync(join(dataDir, 'reference', 'guidelines.json'), 'utf8')).entries; } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
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
  <meta name="robots" content="${ROBOTS}" />
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
${CHROME_HEAD}
${path === '/census/' && SLIDES.length ? `  <link rel="stylesheet" href="/assets/research.css?v=${assetHash('assets/research.css')}">\n` : ''}  <link rel="stylesheet" href="/census/census.css?v=${CSS_V}">
</head>`;

// Nav and footer live in scripts/shared-chrome.mjs so every page on the site renders
// the same chrome. Census pages are always in the census section.
const nav = navFor('/census/');

// Said on the landing and every agency page so an agency never reads the census as
// ProtoQuiz selling its data: it is not sold, licensed, or shared, and hosts nothing.
const NOT_FOR_SALE = 'The census is free and not for sale. Only public agencies are named.';

// The disclaimer rides above the shared footer rather than inside it: it is specific
// to published-protocol data and would be a false promise on /app or /agency.
// The script opens any <details> a #fragment points into, so a link to #list or to
// one drug on an agency page lands on an open panel rather than a closed one.
const footer = `  <div class="census-disclaimer">
    <div class="wrap"><p class="disclaimer">${DISCLAIMER}</p></div>
  </div>
  <script>
    (function () {
      var open = function () { for (var e = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1))); e; e = e.parentElement) if (e.tagName === 'DETAILS') e.open = true; };
      open(); addEventListener('hashchange', open);
    })();
  </script>
${FOOTER_HTML}
</body>
</html>
`;

const breadcrumbs = trail => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + item })),
});

// Every href here is built from data (an agencyKey, a drugKey), so it is escaped
// like any other value that lands in an attribute. The same rule as jsonLdText:
// JSON and slugs are not HTML, and "the producer already sanitized it" is
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
const citePanel = (id, lines) => `<details class="fold" id="${id}"><summary>Cite this</summary>
            <div class="citebox" id="${id}-text">${lines.map(l => `<p class="cite">${l}</p>`).join('')}</div>
            <button type="button" class="copybtn" id="${id}-btn">Copy citation</button>
          </details>
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

// `rail` is the right-hand column (methodology and license contents, indication cites).
// A page that passes none renders one column. The research bar shows on the census
// landing only: detail pages already carry the census bar, and three stacked bars
// pushed the data below the fold.
const page = ({ title, description, path, trail, jsonLd = [], body, rail = '' }) => `${head({ title, description, path, jsonLd: [breadcrumbs(trail), ...jsonLd] })}
<body>
${nav}
${researchBar(path)}
  <main>
    <div class="wrap">
${trail.length > 2 ? crumbHtml(trail.slice(1)) : ''}
      <div class="layout${rail ? '' : ' solo'}">
        <div class="col">
${body}
        </div>${rail ? `\n        <aside class="rail">\n${rail}\n        </aside>` : ''}
      </div>
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

// ------------------------------------------------------------- requests
//
// One form serves the whole site: /research/request/ (scripts/build-research-request.mjs).
// Census pages only link to it, preset by ?type= and &agency=, so there is one form to keep.
const CONTACT = 'support@protoquiz.com';
const requestUrl = (type, agency = '', link = '') => `/research/request/?type=${type}${agency ? `&agency=${encodeURIComponent(agency)}` : ''}${link ? `&link=${encodeURIComponent(link)}` : ''}`;

function doseCell(r) {
  if (r.value == null) return `<span class="raw">${esc(r.doseRaw)}</span>`;
  const range = r.valueMax != null ? `${fmtNum(r.value)}&ndash;${fmtNum(r.valueMax)}` : fmtNum(r.value);
  const max = r.maxValue != null ? ` <span class="muted">(max ${fmtNum(r.maxValue)} ${esc(r.maxUnit ?? '')})</span>` : '';
  return `${range} ${esc(r.unit ?? '')}${r.perKg ? '/kg' : ''}${max}`;
}

// ------------------------------------------------------------ compact parts
//
// Every census page is a tool first: a summary line, the data, and a row of small
// links at the bottom. Long panels (cite, forms, named lists) fold into <details> so
// they cost one line until someone opens them. The script in the footer opens any
// fold a #fragment points into, so /census/#list and /agencies/x/#midazolam still land.

const fold = (id, label, inner) => `<details class="fold"${id ? ` id="${id}"` : ''}><summary>${label}</summary>
${inner}
</details>`;

// The bottom row: folds first (they open full-width), then plain links.
const footRow = (folds, links) => `      <div class="actions">${folds.join('')}${links.map(([l, h]) => `<a href="${esc(h)}">${esc(l)}</a>`).join('')}</div>`;

// A filter box for the lists on a page. Without JS it is inert and every list is
// already fully visible, so nothing is lost.
const filterBox = (id, label) => `<input type="search" class="filter" id="${id}" placeholder="${esc(label)}" aria-label="${esc(label)}" autocomplete="off" />`;

// One home for the drug, state and agency link lists: the landing tabs and the
// drugs index render the same <li>s.
// Keys spelled with non-English letters (ADENOZİN, AMİODARON) are extraction variants of
// drugs already listed; their pages stay, the browse lists skip them.
const browseDrugs = drugs => drugs.filter(d => !/[^\x00-\x7F]/.test(d));
const drugLis = drugs => browseDrugs([...drugs]).sort((x, y) => drugLabel(x).localeCompare(drugLabel(y)))
  .map(d => `<li><a href="/census/drugs/${slug(d)}/">${esc(drugLabel(d))}</a></li>`).join('');
const stateLis = (states, counts, label = stateLabel) => states.map(s => `<li><a href="/census/states/${slug(s)}/">${esc(label(s))}</a><span class="count">${num(counts.get(s) ?? 0)}</span></li>`).join('');

// Filters every <li> under `root` by the box; groups (sections or details) with no
// hit hide, and Enter follows the first visible link.
const filterScript = (boxId, root, group) => `        <script>
          (function () {
            var q = document.getElementById('${boxId}'), root = document.querySelector('${root}');
            q.addEventListener('input', function () {
              var s = q.value.trim().toLowerCase();
              root.classList.toggle('searching', !!s);
              root.querySelectorAll('${group}').forEach(function (g) {
                var n = 0;
                g.querySelectorAll('li, .drug').forEach(function (li) { var hit = !s || li.textContent.toLowerCase().indexOf(s) > -1; li.hidden = !hit; n += hit; });
                g.hidden = !!s && !n;
                if (g.tagName === 'DETAILS') g.open = !!s && n > 0;
              });
            });
            q.addEventListener('keydown', function (e) {
              var a = q.value.trim() && root.querySelector('li:not([hidden]) a');
              if (e.key === 'Enter' && a) location.href = a.href;
            });
          })();
        </script>`;

// The US map on the States tab: states shaded by how many CURRENT protocols the census
// holds there (one per agency), outlined and linked where the state has a page. Geometry
// is a committed, pre-projected file (Albers USA), so the SVG needs no library and is
// byte-identical across rebuilds.
const US_STATES = JSON.parse(readFileSync(new URL('./data/us-states-paths.json', import.meta.url), 'utf8'));
const MAP_BANDS = [[0, 'none'], [1, '1'], [2, '2 to 4'], [5, '5 to 9'], [10, '10 or more']];
const bandOf = n => MAP_BANDS.reduce((b, [min], i) => (n >= min ? i : b), 0);

function usMap({ documents, pageStates }) {
  const docsIn = {};
  for (const d of documents) if (d.state && d.status === 'current') { const c = String(d.state).toUpperCase(); docsIn[c] = (docsIn[c] || 0) + 1; }
  const named = new Set(pageStates.map(s => String(s).toUpperCase()));
  // Linked states draw last so their outline sits on top of every neighbour's edge.
  const codes = Object.keys(US_STATES.states).sort((a, b) => named.has(a) - named.has(b) || a.localeCompare(b));
  const shapes = codes.map(c => {
    const n = docsIn[c] || 0;
    const path = `<path class="s r${bandOf(n)}${named.has(c) ? ' named' : ''}" d="${US_STATES.states[c].d}"><title>${esc(stateLabel(c))}: ${num(n)} current protocol${n === 1 ? '' : 's'}</title></path>`;
    return named.has(c) ? `<a href="/census/states/${slug(c)}/">${path}</a>` : path;
  }).join('');
  return `<figure class="usmap-fig"><svg class="usmap" viewBox="${esc(US_STATES.viewBox)}" role="img" aria-label="Map of US states shaded by current protocols in the census; outlined states have a page.">${shapes}</svg>
          <figcaption class="legend">${MAP_BANDS.map(([, label], i) => `<span><i class="r${i}"></i>${label}</span>`).join('')}<span><i class="named"></i>has a page</span></figcaption></figure>`;
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

function landingPage({ manifest, states, drugs, agencyPageCount, agencies = [], allAgencies = agencies, documents = [], popular = [] }) {
  const drugCount = browseDrugs(drugs).length;
  const latestReport = latestReportEdition();
  // Two different numbers, both true: how many agencies the census holds, and
  // how many have a page (the rest are below a thin-page threshold). Printing
  // only the first would promise pages that are deliberately not generated.
  const withheld = manifest.namedAgencies - agencyPageCount;
  // coverage is optional (v2 payloads, or a v3 build before the field lands):
  // the table renders only when at least one agency row carries it, and is
  // omitted entirely otherwise — never a table of blanks, never a throw.
  const coverageRows = agencies.some(a => a.coverage) ? coverageByState(states, agencies, documents) : [];
  // The US figures on this page count US jurisdictions only. Agencies outside the US are
  // real and still listed, by country, so a reader is never told that a US census covers
  // a number of states that includes Queensland.
  const stateCountry = new Map(agencies.map(a => [a.state, countryOf(a)]));
  const inUS = s => (stateCountry.get(s) ?? 'US') === 'US';
  const usStates = states.filter(inUS);
  const usCoverageRows = coverageRows.filter(r => inUS(r.state));
  // Every named agency outside the US, page or not, grouped by country, most first.
  const abroad = [...groupBy(allAgencies.filter(a => countryOf(a) !== 'US'), countryOf)]
    .sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
  const abroadTotal = abroad.reduce((n, [, as]) => n + as.length, 0);
  const splitLine = abroadTotal
    ? `        <p class="muted">${num(allAgencies.length)} named agencies: ${num(allAgencies.length - abroadTotal)} in the US, plus ${num(abroadTotal)} outside it (${abroad.map(([c]) => esc(countryName(c))).join(', ')}).</p>\n`
    : '';
  // Per-state agency counts. Built from `agencies` (the ones that got a page) so a
  // count can never promise more rows than the state page lists.
  const facetCounts = new Map(states.map(s => [s, agencies.filter(a => a.state === s).length]));

  // The scale line: how much the census holds, in one row. Every number carries its label.
  const currentProtocols = documents.filter(d => d.status === 'current').length;
  const scaleLine = `      <p class="summary">${[
    currentProtocols ? `<span class="n">${num(currentProtocols)}</span> protocols` : null,
    `<span class="n">${num(manifest.namedAgencies)}</span> agencies`,
    `<span class="n">${num(agencyPageCount)}</span> agency pages`,
    `<span class="n">${num(manifest.documents)}</span> documents`,
    `<span class="n">${num(manifest.doseRows)}</span> doses`,
    `as of <span class="n">${esc(manifest.asOf)}</span>`,
  ].filter(Boolean).join('<span class="sep" aria-hidden="true"></span>')}</p>`;

  // Tabs are anchors: without JS, :target shows the section a link names (Drugs by
  // default), so /census/#states from any other page still opens States. The script
  // only stops the jump-scroll and marks the active tab.
  const tabs = [['drugs', 'Drugs', drugCount], ['states', 'States', usStates.length], ['agencies', 'Agencies', agencies.length]];
  // A long list shows its first rows and a "Show all" button; without JS it shows all.
  const more = (n, shown) => (n > shown ? `<button type="button" class="more">Show all ${num(n)}</button>` : '');
  const body = `      <div class="tool${SLIDES.length ? ' has-slides' : ''}">
        <div class="tool-say">
        <h1>US EMS Protocol Census</h1>
${scaleLine}
${splitLine}        ${filterBox('q', 'Search a drug, state or agency')}
        <p class="request" id="list"><a class="bigbtn" href="${requestUrl('add')}">Add, fix, or remove a listing</a> <span class="muted">Handled the same day.</span></p>
${popular.length ? `        <p class="chips"><span class="muted">Most carried</span>${popular.map(d => `<a href="/census/drugs/${slug(d)}/">${esc(drugLabel(d))}</a>`).join('')}</p>` : ''}
        </div>
${SLIDES.length ? slideshow(SLIDES) : ''}
      </div>
      <div class="tabs">
        <nav class="tabnav" aria-label="Browse">${tabs.map(([id, label, n]) => `<a href="#${id}">${label}<span class="count">${num(n)}</span></a>`).join('')}</nav>
${drugs.length ? `      <section id="drugs">
        <h2>Drugs<span class="count">${num(drugCount)}</span></h2>
        <ul class="cols six clip">${drugLis(drugs)}</ul>
        ${more(drugCount, 60)}
      </section>` : `      <section id="drugs">
        <h2>Drugs</h2>
        <p>Drug and indication pages are not published for this build: the indication map has not been reviewed since it last changed.</p>
      </section>`}
      <section id="states">
        <h2>States<span class="count">${num(usStates.length)}</span></h2>
        <div class="statemap">
          ${usMap({ documents, pageStates: states })}
          <div>
        <ul class="cols stategrid">${stateLis(usStates, facetCounts)}</ul>
${abroad.length ? `        <!-- Listed, but never inside the US counts above. -->
        <h3 id="international">Outside the US</h3>
${abroad.map(([c, as]) => {
    const regions = states.filter(s => stateCountry.get(s) === c);
    return `        <h4>${esc(countryName(c))}<span class="count">${num(as.length)}</span></h4>
        ${regions.length ? `<ul class="cols stategrid">${stateLis(regions, facetCounts, s => REGIONS[c]?.[s] ?? s)}</ul>` : '<p class="muted">No agency page yet.</p>'}`;
  }).join('\n')}` : ''}
          </div>
        </div>
${usCoverageRows.length ? `        ${fold('', 'Coverage by state', `        <div class="scroll"><table class="coverage">
          <thead><tr><th>State</th><th>Agencies with a protocol</th><th>Agencies without</th><th>Statewide protocol</th></tr></thead>
          <tbody>${usCoverageRows.map(r => `<tr><td><a href="/census/states/${slug(r.state)}/">${esc(stateLabel(r.state))}</a></td><td>${num(r.withProtocol)}</td><td>${num(r.withoutProtocol)}</td><td>${r.statewideBaseline ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody>
        </table></div>`)}` : ''}
      </section>
      <section id="agencies">
        <h2>Agencies<span class="count">${num(agencies.length)}</span></h2>
        <ul class="cols four clip">${[...agencies].sort((x, y) => x.name.localeCompare(y.name)).map(a => `<li><a href="/census/agencies/${esc(a.agencyKey)}/" title="${esc(a.name)}">${esc(a.name)}</a> <span class="muted">${esc(a.state)}</span></li>`).join('')}</ul>
        ${more(agencies.length, 40)}
${withheld > 0 ? `        <p class="muted">${withheldSentence(withheld).trim()}</p>` : ''}
      </section>
      </div>
        <script>
          (function () {
            var t = document.querySelector('.tabs'), links = t.querySelectorAll('.tabnav a');
            var show = function (id) { t.dataset.tab = id; links.forEach(function (a) { a.setAttribute('aria-selected', a.hash === '#' + id); }); };
            t.classList.add('js');
            var fromHash = function () { show(/^#(drugs|states|agencies)$/.test(location.hash) ? location.hash.slice(1) : 'drugs'); };
            fromHash(); addEventListener('hashchange', fromHash);
            links.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show(a.hash.slice(1)); history.replaceState(null, '', a.hash); }); });
            t.querySelectorAll('.more').forEach(function (b) { b.addEventListener('click', function () { b.previousElementSibling.classList.add('all'); b.remove(); }); });
          })();
        </script>
${SLIDES.length ? SLIDES_JS : ''}
${filterScript('q', '.tabs', 'section')}
${footRow([
    citePanel('cite', [`United States EMS Protocol Census, as of ${esc(manifest.asOf)}. ${ORIGIN}/census/`]),
  ], [
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
    ...(latestReport ? [[`${reportLabel(latestReport)} report`, `/census/report/${latestReport}/`]] : []),
  ])}
      <p class="muted">${NOT_FOR_SALE}</p>`;

  return {
    path: '/census/',
    html: page({
      title: 'United States EMS Protocol Census - open research on US EMS',
      description: `A free reference comparing United States EMS protocols: ${num(manifest.doseRows)} dose entries from ${num(manifest.namedAgencies)} named agencies, as of ${manifest.asOf}.`,
      path: '/census/',
      trail: [['Home', '/'], ['EMS Census', '/census/']],
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'United States EMS Protocol Census',
        description: 'Dose, route, and indication information from the protocols of public United States EMS agencies.',
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

// The drugs index: the landing's Drugs tab as its own page, so /census/drugs/ is a
// page rather than a 404.
function drugsIndexPage(drugs) {
  const body = `      <div class="tool">
        <h1>Drugs in US EMS protocols</h1>
        <p class="summary"><span class="n">${num(drugs.length)}</span> drugs, each with its doses across every agency that carries it.</p>
        ${filterBox('q', 'Filter drugs')}
      </div>
      <section id="drugs" class="list">
        <ul class="cols six">${drugLis(drugs)}</ul>
      </section>
${filterScript('q', '.list', 'ul')}`;
  return {
    path: '/census/drugs/',
    html: page({
      title: 'Drugs in US EMS protocols - EMS Protocol Census',
      description: `${num(drugs.length)} drugs in published US EMS protocols, each with its doses, indications and routes across agencies.`,
      path: '/census/drugs/',
      trail: [['Home', '/'], ['EMS Census', '/census/'], ['Drugs', '/census/drugs/']],
      body,
    }),
  };
}

// First-letter folds for an agency's drug list (see agencyPage).
const LETTER_GROUPS = ['ABC', 'DEF', 'GHIJKL', 'MNO', 'PQR', 'STUVWXYZ'];

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

  const drugBlock = ([drugKey, rs]) => {
    const inner = [...rs].sort(doseOrder).map(r => `<tr>
              <td>${esc(indicationLabel(r.indicationKey))}</td>
              <td>${esc(r.population)}</td>
              <td>${doseCell(r)}</td>
              <td>${esc(r.route ?? NOT_CAPTURED)}</td>
              <td>${esc(r.repeatRaw ?? NOT_CAPTURED)}</td>
              <td>${esc(standingLabel(r.standing))}</td>
              <td class="src">${sourceLine(r, docByHash)}</td>
            </tr>`).join('\n');
    return `        <div class="drug"><h3 id="${slug(drugKey)}">${esc(drugLabel(drugKey))}</h3>
        <div class="scroll"><table class="dose">
          <thead><tr><th>Indication</th><th>Population</th><th>Dose</th><th>Route</th><th>Repeat</th><th>Standing</th><th>Source</th></tr></thead>
          <tbody>
${inner}
          </tbody>
        </table></div></div>`;
  };
  // No drug-class field exists in the data, so drugs fold by first letter: the one
  // grouping that is honest about what it is and lets a reader find a name fast.
  const groups = groupBy([...drugs], ([k]) => LETTER_GROUPS.find(g => drugLabel(k)[0].toUpperCase() <= g.at(-1)) ?? LETTER_GROUPS.at(-1));
  const rows = [...groups].map(([g, ds]) => fold('', `<b>${g[0]}&ndash;${g.at(-1)}</b> <span class="names">${ds.map(([k]) => esc(drugLabel(k))).join(', ')}</span><span class="count">${num(ds.length)}</span>`, ds.map(drugBlock).join('\n'))).join('\n');

  const history = ledger.length
    ? fold('ledger', `Change history<span class="count">${num(ledger.length)}</span>`, `        <div class="scroll"><table>
          <thead><tr><th>Recorded</th><th>Change</th><th>From</th><th>To</th></tr></thead>
          <tbody>${ledger.map(e => `<tr><td>${esc(String(e.at).slice(0, 10))}</td><td>${esc(e.change)}</td><td>${esc(e.from ?? NOT_CAPTURED)}</td><td>${esc(e.to ?? NOT_CAPTURED)}</td></tr>`).join('')}</tbody>
        </table></div>`)
    : '';

  const place = agency.state ? stateLabel(agency.state, countryOf(agency)) : countryOf(agency) === 'US' ? null : countryName(countryOf(agency));
  const where = [agency.city, countryOf(agency) === 'US' ? agency.state : place].filter(Boolean).join(', ');
  const title = `${agency.name} EMS protocols - drugs, doses, and routes`;
  // The date and its provenance both come from the CURRENT document, not the agency row —
  // agencies.json carries only currentEffectiveDate, which by design is null for a document
  // whose only date is a capture.
  const currentDoc = docByHash.get(agency.currentHash);
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
  })}
${pending}${outdated}      <section id="doses">
        <h2>Drugs and doses<span class="count">${num(drugs.size)}</span></h2>
        ${filterBox('f', 'Filter drugs or indications')}
${rows}
      </section>
${filterScript('f', '#doses', 'details')}
${footRow([
    history,
    citePanel('cite', [
      esc(`${agency.name}, United States EMS Protocol Census. ${num(doses.length)} dose entries, effective ${documentDateCell(currentDoc)}.`),
      `${ORIGIN}/census/agencies/${esc(agency.agencyKey)}/`,
    ]),
  ], [
    ['Outdated or wrong? Fix or remove it', requestUrl('fix', agency.name, `${ORIGIN}/census/agencies/${agency.agencyKey}/`)],
    ...(agency.state ? [[`All ${place} agencies`, `/census/states/${slug(agency.state)}/`]] : []),
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
    ['Study these protocols in the app', '/app/'],
  ])}
      <p class="muted">${NOT_FOR_SALE}</p>`;

  return {
    path: `/census/agencies/${agency.agencyKey}/`,
    html: page({
      title,
      description: `Medications, doses, routes, and revision history published by ${agency.name}${where ? ` (${where})` : ''}, from its own protocol document.`,
      path: `/census/agencies/${agency.agencyKey}/`,
      // Each agency page IS a dataset -- one agency's dose facts, sourced to one
      // document -- so it says so, the same way the census landing page does. The
      // landing page's Dataset covers the whole census; this covers this slice.
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${agency.name} EMS protocol doses`,
        description: `Medication, dose, route and indication information from the EMS protocol document published by ${agency.name}.`,
        url: `${ORIGIN}/census/agencies/${agency.agencyKey}/`,
        license: `${ORIGIN}/census/data-license/`,
        creator: { '@type': 'Organization', name: 'ProtoQuiz', url: ORIGIN },
        isAccessibleForFree: true,
        isPartOf: { '@type': 'Dataset', name: 'United States EMS Protocol Census', url: `${ORIGIN}/census/` },
        ...(agency.state ? { spatialCoverage: place } : {}),
      }],
      trail: [['Home', '/'], ['EMS Census', '/census/'], ...(agency.state ? [[place, `/census/states/${slug(agency.state)}/`]] : []), [agency.name, `/census/agencies/${agency.agencyKey}/`]],
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
  const name = stateLabel(state, countryOf(listed[0]));
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
        <h3>With a protocol</h3>
        ${withProtocol.length
        ? `<ul class="cols">${withProtocol.map(agencyLi).join('')}</ul>`
        : '<p class="muted">None yet.</p>'}
        <h3>Without a protocol</h3>
        ${withoutProtocol.length
        ? `<ul class="cols">${withoutProtocol.map(agencyLi).join('')}</ul>`
        : '<p class="muted">None.</p>'}
${unknown.length ? `        <h3>Not yet assessed</h3>
        <ul class="cols">${unknown.map(agencyLi).join('')}</ul>` : ''}
      </section>
${statewideBaselines.length ? `      <section id="statewide-baseline">
        <h2>Statewide protocol</h2>
        <p class="muted">A protocol published by the state itself. Every agency in ${esc(name)} follows it unless the agency publishes its own, so it is listed once here rather than under each agency.</p>
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
      ...(statewideBaselines.length ? ['statewide protocol'] : []),
    ],
  })}
${agenciesSection}
${footRow([citePanel('cite', [
    esc(`United States EMS Protocol Census, ${name}: ${listed.length} named ${listed.length === 1 ? 'agency' : 'agencies'}, ${doses.length} dose entries across ${drugs.size} ${drugs.size === 1 ? 'drug' : 'drugs'}.`),
    `${ORIGIN}/census/states/${slug(state)}/`,
  ])], [
    ['All states', '/census/#states'],
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
  ])}`;

  return {
    path: `/census/states/${slug(state)}/`,
    html: page({
      title: `${name} EMS protocols - agencies, drugs, and doses`,
      description: `${listed.length} named EMS agencies in ${name} with published protocol doses in the United States EMS Protocol Census.`,
      path: `/census/states/${slug(state)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [name, `/census/states/${slug(state)}/`]],
      body,
    }),
  };
}

function drugPage(drugKey, { rows, indicationPaths, agencyByKey = new Map() }) {
  const byInd = groupBy(rows, r => r.indicationKey);
  const agencies = new Set(rows.map(r => r.agencyKey).filter(Boolean));
  const abroad = abroadCount(agencies, agencyByKey);
  const body = `${docHeader({
    kind: 'Medication',
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
${abroadNote(abroad)}      <section id="indications">
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
      description: `How ${num(agencies.size)} ${abroad ? '' : 'US '}EMS agencies dose ${drugLabel(drugKey)}: indications, routes, and adult vs pediatric entries from published protocols.`,
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
          <p class="muted">Values in ${esc(unit)}. One value per source (that source's median), so a document listing a medication five times still gets one vote.</p>
        </div>`;
}

// One row's spread, the same mark /research draws: whiskers min to max with end caps,
// the box p25 to p75 and the median as a dark line; when the middle half is one value, a dot marks the dose most protocols agree on. Each row on its own scale; the digits
// beside it are the claim, the box is the glance.
const boxSvg = (d, unit) => {
  const at = v => (d.max === d.min ? 50 : +(3 + ((v - d.min) / (d.max - d.min)) * 94).toFixed(1));
  return `<svg viewBox="0 0 100 14" class="box" role="img" aria-label="min ${esc(fmtNum(d.min))}, p25 ${esc(fmtNum(d.p25))}, median ${esc(fmtNum(d.median))}, p75 ${esc(fmtNum(d.p75))}, max ${esc(fmtNum(d.max))} ${esc(unit)}"><path d="M${at(d.min)} 7H${at(d.max)}M${at(d.min)} 3v8M${at(d.max)} 3v8" class="w"/>${d.p75 === d.p25
    ? `<circle cx="${at(d.p25)}" cy="7" r="5" class="agree"/>`
    : `<rect x="${at(d.p25)}" y="2.5" width="${(at(d.p75) - at(d.p25)).toFixed(1)}" height="9"/><path d="M${at(d.median)} 1.5v11" class="m"/>`}</svg>`;
};
const rangeText = (d, unit) => `${d.min === d.max ? fmtNum(d.min) : `${fmtNum(d.min)} to ${fmtNum(d.max)}`} ${unit}`;
// The cell beside the box: when the middle half agrees on one value, that agreement is the headline.
// `gls` is the group's guideline entries (reference/guidelines.json, NASEMSO first). The agreed
// value, else the median, gets a "matches" link when it equals an entry's dose or sits in its
// [dose, max] range. The link names the first matching body; the tooltip names every one.
// A value that differs gets nothing: the census reports, it does not grade protocols.
const groupKeyOf = k => `${k.drugKey}|${k.indicationKey}|${k.population}|${k.perKg ? 1 : 0}|${k.unit}`;
const glTag = (gls = [], v, what) => {
  const hit = gls.filter(gl => v >= gl.dose * (1 - 1e-9) && v <= (gl.max ?? gl.dose) * (1 + 1e-9));
  return hit.length ? ` <a class="gl" href="${esc(hit[0].url)}" rel="noopener" title="${esc([...new Map(hit.map(gl => [gl.body, `${gl.body}, ${gl.title}`])).values()].join('; '))}">${what}matches ${esc(hit[0].body)}</a>` : '';
};
const rangeCell = (d, unit, n, gls) => d.p25 === d.p75
  ? `<strong>${d.min === d.max ? 'All' : 'Most'} use ${esc(fmtNum(d.p25))} ${esc(unit)}</strong>${glTag(gls, d.p25, '')} <span class="muted">${d.min === d.max ? '' : `range ${esc(rangeText(d, unit))}, `}n=${num(n)}</span>`
  : `${esc(rangeText(d, unit))} <span class="muted">median ${esc(fmtNum(d.median))}, n=${num(n)}</span>${glTag(gls, d.median, 'median ')}`;

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
    html: fold('agencies', `Named agencies with a page<span class="count">${num(named.length)}</span>`, `        <p class="muted">Agencies whose protocols are a public record are named here. Their own doses are on their own pages; this list carries no values.</p>
        <ul class="cols">${named.map(k => `<li><a href="/census/agencies/${esc(k)}/">${esc(pageAgencies.get(k).name)}</a></li>`).join('')}</ul>`),
  };
}

// The one sentence for "N named agencies exist but have no page of their own" —
// shared so the landing page and any other page stating the same fact (a drug
// page's named-agency count vs its linked list) say it identically rather than
// drifting into two different claims about the same withheld set.
const withheldSentence = n => n > 0
  ? ` ${num(n)} more ${n === 1 ? 'agency is' : 'agencies are'} counted but ${n === 1 ? 'has' : 'have'} too little published detail for a page yet.`
  : '';

// "n rows under review" — the count of suppressed rows, build-wide, from the manifest.
// It is deliberately NOT per-group: the build counts flags before removal and publishes
// one number, so a page cannot imply a per-group figure it does not have.
const underReview = manifest => (manifest.flaggedRows
  ? `      <p class="honest">Doses far off from what other protocols give are likely misreads, so they are left out until checked. <a href="/census/methodology/#outliers">How that works</a>.</p>\n`
  : '');

function drugPageV3(drugKey, { summary, groups, indicationPaths, pageAgencies, manifest, guidelineByKey = new Map(), agencyByKey = new Map() }) {
  const dists = groups.filter(g => g.dist);
  // Sorted here rather than trusted from the file, for the same reason every other
  // list in this generator is: determinism must not depend on the writer's ordering.
  const indications = [...summary.indications].sort((a, b) => a.indicationKey.localeCompare(b.indicationKey));
  const groupAgencies = new Set(groups.flatMap(g => g.agencyKeys ?? []));
  const named = namedAgencyList(groupAgencies, pageAgencies);
  const abroad = abroadCount(groupAgencies, agencyByKey);
  // An indication can appear in drugs[].indications (every admitted row, raw included)
  // with no entry at all in `groups` (a comparable group needs a parsed value) — every
  // row under it was raw. Its n= then counts "sources with rows", not "sources in a
  // comparable group" like every sibling on this list, so it is labelled distinctly
  // rather than left to read as the same claim.
  const groupIndications = new Set(groups.map(g => g.key.indicationKey));
  // One row per published distribution, grouped under its indication. Indications
  // with no distribution (under MIN_SOURCES, or raw only) share one line below, so the
  // page stays one screen of rows rather than a list plus a table saying it twice.
  const distInd = new Set(dists.map(g => g.key.indicationKey));
  const indLink = k => {
    const p = indicationPaths.get(`${drugKey}/${k}`);
    return p ? `<a href="${p}">${esc(indicationLabel(k))}</a>` : esc(indicationLabel(k));
  };
  const rowsHtml = [...groupBy(dists, g => g.key.indicationKey)].map(([k, gs]) => gs.map((g, i) => `<tr${i ? ' class="cont"' : ''}><th scope="row">${i ? '' : indLink(k)} <span class="muted">${esc(groupLabel(g.key))}</span></th><td>${boxSvg(g.dist, unitLabel(g.key))}</td><td class="rng">${rangeCell(g.dist, unitLabel(g.key), g.n.sources, guidelineByKey.get(groupKeyOf(g.key)))}</td></tr>`).join('')).join('');
  const rest = indications.filter(({ indicationKey }) => !distInd.has(indicationKey));
  const body = `${docHeader({
    kind: 'Medication',
    title: `${esc(drugLabel(drugKey))} in US EMS protocols`,
  })}
${stats([
    ['protocols', num(summary.n.sources)],
    ['named agencies', num(summary.n.agencies)],
    [abroad ? 'states and regions' : 'states', num(summary.n.states)],
    ['indications', num(indications.length)],
    ['dose entries', num(summary.n.rows)],
    // n.parsed is the real numerator when the build supplies it. Reconstructing one
    // from parsedShare (a float) fabricates a count that can be off by a row — the
    // fallback below renders the share alone, with no numerator claimed.
    ['machine-parsed', summary.n.parsed != null
      ? `${pct(summary.n.parsed, summary.n.rows)} of ${num(summary.n.rows)}`
      : `${Math.round(summary.parsedShare * 100)}%`],
  ])}
${abroadNote(abroad)}${dists.length ? `      <section id="distributions">
        <table class="spread">
          <thead><tr><th>Indication</th><th>Spread: box is the middle half, dot means most agree</th><th>Range</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>` : ''}
${rest.length ? `      <p class="also" id="indications">${dists.length ? `Too few protocols to chart yet (protocols in brackets): ` : ''}${rest.map(({ indicationKey, sources }) =>
    `${indLink(indicationKey)} <span class="muted">(${num(sources)}${groupIndications.has(indicationKey) ? '' : ', no numbers'})</span>`).join(', ')}</p>` : ''}
${underReview(manifest)}${footRow([
    named.html,
    citePanel('cite', [
      esc(`United States EMS Protocol Census, ${drugLabel(drugKey)}: n=${summary.n.sources} protocols from ${summary.n.agencies} named agencies / ${summary.n.states} states, as of ${manifest.asOf}`),
    ]),
  ], [
    ['Methodology', '/census/methodology/'],
    ['Data license', '/census/data-license/'],
    ['Study your own protocol in the app', '/app/'],
  ])}`;

  return {
    path: `/census/drugs/${slug(drugKey)}/`,
    html: page({
      title: `${drugLabel(drugKey)} EMS dose by protocol - indications and routes`,
      description: `How ${num(summary.n.sources)} ${abroad ? '' : 'US '}EMS protocols dose ${drugLabel(drugKey)}: indications, routes, and adult vs pediatric distributions from published protocols.`,
      path: `/census/drugs/${slug(drugKey)}/`,
      trail: [['Home', '/'], ['EMS Census', '/census/'], [drugLabel(drugKey), `/census/drugs/${slug(drugKey)}/`]],
      body,
    }),
  };
}

function indicationPageV3(drugKey, indicationKey, groups, { pageAgencies, manifest, agencyByKey = new Map() }) {
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
${abroadNote(abroadCount(new Set(ordered.flatMap(g => g.agencyKeys ?? [])), agencyByKey))}${underReview(manifest)}${distSections}
${named.html}`;

  // One cite panel per page, carrying the LEAD group's citation line — the one a
  // reader is most likely to be quoting. Each group still prints its own line beside
  // its own numbers, because a per-group n is a different claim from this one.
  const rail = `${citePanel('cite', [esc(lead ? lead.cite : `United States EMS Protocol Census, ${drugLabel(drugKey)} for ${indicationLabel(indicationKey)}, as of ${manifest.asOf}`)])}
${railLinks('Related', [
    [`All ${drugLabel(drugKey)} indications`, `/census/drugs/${slug(drugKey)}/`],
    ['All medications and states', '/census/'],
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
  const s = (n, one, many) => (n === 1 ? one : many);
  const body = `${docHeader({
    kind: 'Methodology',
    title: 'How the EMS Census is built',
    chips: [],
    lede: `Every number here comes from protocols agencies publish and protocols app users upload. As of ${esc(m.asOf)}.`,
  })}
${stats([
    ['documents', num(m.documents)],
    ['named agencies', num(m.namedAgencies)],
    ['dose entries', num(m.doseRows)],
    ['machine-parsed', shareOf(m.dosesParsed, m.doseRows)],
  ])}

      <section id="origin">
        <h2>Where documents come from</h2>
        <p>Medics upload their own agency's protocol, or we add a published one. Each document keeps its <strong>origin</strong> and is identified by the hash of its contents, so a re-post is the same document and a revision is a new one. We host no PDFs; we link to the agency's own copy.</p>
        <p>Only public agencies (state, regional, county, city, fire district) are named. Others count toward totals, unnamed. A document whose agency or date is unsettled waits in pending review: ${num(m.pendingReview)} of ${num(m.documents)} right now.</p>
      </section>

      <section id="doses">
        <h2>How doses are compared</h2>
        <ul>
          <li>Mass units are canonicalized to mg (300 mcg = 0.3 mg). Nothing else converts; mL, units and joules stay separate.</li>
          <li>Weight-based and flat doses never share a median.</li>
          <li>A range contributes its low end only: 0.3&ndash;0.5 mg counts as 0.3.</li>
          <li>A raw entry never enters a distribution (for example "per medical control"). ${shareOf(m.dosesRaw, m.doseRows)} are raw.</li>
          <li>One vote per protocol, and a distribution needs ${MIN_SOURCES} or more protocols.</li>
          <li>When the agreed dose, or the median, equals the dose a national guideline states for that drug, indication and population, or falls inside the range it states, the row says so and links the guideline: NASEMSO's National Model EMS Clinical Guidelines, American Heart Association algorithms, or a national society's guidance. A dose that differs gets no tag.</li>
        </ul>
      </section>

      <section id="sources">
        <h2>Sources and named agencies are two different counts</h2>
        <p>A source is one protocol document; a named agency is a public one we identify. Sources are always the larger number.</p>
      </section>

      <section id="outliers">
        <h2>Outlier review</h2>
        <p>Nightly, any dose over 3 times or under a third of its group's median is likely a misread, so it is left out of every number until checked. It is one pass with no feedback, so the same documents give the same flags. ${num(m.flaggedRows)} of ${num(m.doseRows)} entries (${pct(m.flaggedRows, m.doseRows)}) ${s(m.flaggedRows, 'is', 'are')} left out right now.</p>
      </section>

      <section id="accuracy">
        <h2>Accuracy</h2>
        <p>We do not publish a dose-level accuracy number, because we have not measured one. This is a training reference, not a clinical order. Check your own protocol and medical director.</p>
      </section>

      <section id="corrections">
        <h2>Corrections and freshness</h2>
        <p>Send a newer public link and the listing is rebuilt. If an agency wants its listing removed, it comes down the same day. Documents over 24 months old are marked as possibly outdated, and the build refuses to publish when the number of named agencies drops sharply.</p>
      </section>

      <section id="cite">
        <h2>Citation</h2>
        <p class="cite">United States EMS Protocol Census, as of ${esc(m.asOf)}. ${ORIGIN}/census/ &middot; <a href="/census/data-license/">Data license</a></p>
      </section>`;

  const rail = `${contents([
    ['Where documents come from', 'origin'],
    ['How doses are compared', 'doses'],
    ['Sources and named agencies', 'sources'],
    ['Outlier review', 'outliers'],
    ['Accuracy', 'accuracy'],
    ['Corrections and freshness', 'corrections'],
    ['Citation', 'cite'],
  ])}
${railLinks('Related', [
    ['Data license', '/census/data-license/'],
    ['All medications and states', '/census/'],
  ])}`;

  return {
    path: '/census/methodology/',
    html: page({
      rail,
      title: 'How the EMS Protocol Census is built - methodology',
      description: 'Where census documents come from, what is included and what is not, how doses are compared, how outliers are reviewed, and why no dose-level accuracy number is published.',
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
    chips: ['Summaries CC BY 4.0', 'Not for sale', 'Same-day takedown'],
  })}

      <section id="takedown" class="contact">
        <h2>Take it down or fix it</h2>
        <p>Any agency can have its listing added, corrected or removed, the same day. No reason needed. Or email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
        <p><a class="bigbtn" href="${requestUrl('fix')}">Add, fix, or remove a listing</a></p>
      </section>

      <section id="sources">
        <h2>Where the documents come from</h2>
        <p>Protocols reach the census two ways: documents public agencies post, and protocols ProtoQuiz app users upload to study. Only public agencies are named. Some documents from private services, hospitals or training programs count toward anonymous totals; others, and any we cannot identify, are left out of the figures.</p>
        <p>Uploaded files are never published, sold, or shared outside our service providers; census records do not store who uploaded a document, and uploaders are never named. Content from our agency platform is never used. The documents belong to the agencies that wrote them; nothing here licenses them. Figures are informational only, not clinical guidance, and provided without warranty.</p>
      </section>

      <section id="summaries">
        <h2>Summaries: CC BY 4.0</h2>
        <p>The figures on this site, and the <code>compare.json</code> behind them, are licensed <a href="https://creativecommons.org/licenses/by/4.0/" rel="nofollow noopener">Creative Commons Attribution 4.0</a> (CC BY 4.0). Reuse them with attribution: quote the citation line printed beside the number, n and date included.</p>
        <p class="cite">United States EMS Protocol Census, n=&lt;sources&gt; protocols from &lt;agencies&gt; named agencies / &lt;states&gt; states, updated &lt;month year&gt;</p>
      </section>

      <section id="rows">
        <h2>Not for sale</h2>
        <p>Row-level data is not published, and is never sold, licensed, or shared. No bulk download, no API. Agency pages are for reading, not a dataset.</p>
        <p>Full <a href="/terms/">Terms of Service</a> &middot; <a href="/census/methodology/">Methodology</a></p>
      </section>`;

  return {
    path: '/census/data-license/',
    html: page({
      title: 'EMS Census data license - CC BY 4.0 summaries, data not for sale',
      description: 'Census summaries and compare.json are CC BY 4.0 with attribution. Row-level data is not published, sold, licensed, or shared. Corrections and removals are handled the same day.',
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

export function buildPages({ documents, agencies, doses, ledger, manifest, compare = null, guidelines = [] }) {
  const guidelineByKey = new Map();
  for (const g of [...guidelines].sort((a, b) => (b.body === 'NASEMSO') - (a.body === 'NASEMSO'))) {
    const k = groupKeyOf(g.key);
    guidelineByKey.set(k, [...(guidelineByKey.get(k) ?? []), g]);
  }
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
  const skipped = { thin: 0, noState: [] };
  for (const a of [...agencies].sort((x, y) => x.agencyKey.localeCompare(y.agencyKey))) {
    const rows = dosesByAgency.get(a.agencyKey) || [];
    const drugCount = new Set(rows.map(r => r.drugKey)).size;
    // Two different reasons to skip, and they are not the same kind of thing.
    // Too few drugs is an EDITORIAL rule: a two-drug page is thin and should not
    // exist. A missing state is a DATA GAP: the agency qualifies on content and
    // loses its page over one empty field. The second is counted and reported so
    // it stops being invisible.
    if (drugCount < MIN_AGENCY_DRUGS) { skipped.thin++; continue; }
    if (!a.state) { skipped.noState.push({ key: a.agencyKey, name: a.name, drugs: drugCount }); continue; }
    agencyPages.push(agencyPage(a, {
      doses: rows,
      docByHash,
      ledger: [...(ledgerByAgency.get(a.agencyKey) || [])].sort((p, q) => String(p.at).localeCompare(String(q.at)) || p.hash.localeCompare(q.hash)),
    }));
  }
  files.push(...agencyPages);
  // Reported, not swallowed: an agency that clears the drug bar and loses its page to
  // an empty state field is a page you already paid to extract and are not publishing.
  if (skipped.noState.length) {
    const names = skipped.noState.map(a => `${a.name} (${a.drugs} drugs)`).join(', ');
    console.warn(`census-pages: ${skipped.noState.length} agencies qualify on content but have NO STATE, so no page: ${names}`);
  }
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
  // The landing's chips: the drugs the most named agencies carry, from the engine rollup.
  let popular = [];
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
          const p = indicationPageV3(drugKey, indKey, rs, { pageAgencies, manifest, agencyByKey });
          indicationPaths.set(`${drugKey}/${indKey}`, p.path);
          indicationPages.push(p);
        }
      }
      for (const [drugKey, gs] of byDrugGroups) {
        const summary = summaryByDrug.get(drugKey);
        // A drug with groups but no rollup is a build bug, not something to paper
        // over with a page whose stats are invented.
        if (!summary) continue;
        // The same bar as an indication page: under MIN_SOURCES protocols (or a
        // non-English name from a foreign book) a drug page is one row and says nothing.
        if (summary.n.sources < MIN_SOURCES || !browseDrugs([drugKey]).length) continue;
        files.push(drugPageV3(drugKey, { summary, groups: gs, indicationPaths, pageAgencies, manifest, guidelineByKey, agencyByKey }));
        drugKeys.push(drugKey);
      }
      popular = compare.drugs.filter(d => drugKeys.includes(d.drugKey) && browseDrugs([d.drugKey]).length)
        .sort((a, b) => b.n.agencies - a.n.agencies || a.drugKey.localeCompare(b.drugKey)).slice(0, 6).map(d => d.drugKey);
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
        files.push(drugPage(drugKey, { rows, indicationPaths, agencyByKey }));
        drugKeys.push(drugKey);
      }
    }
    files.push(...indicationPages);
  }

  if (drugKeys.length) files.push(drugsIndexPage(drugKeys));
  files.push(landingPage({
    manifest, states: statesWithPages, drugs: drugKeys, agencyPageCount: agencyPages.length,
    agencies: linkableAgencies, allAgencies: agencies, documents, popular,
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
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:1rem;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--link);text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
[hidden]{display:none!important}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}

/* The site header is shared chrome (assets/chrome.css). Census owns everything BELOW
   the header, starting at the research bar. */

main{padding:14px 0 32px}
.crumbs{font-size:.8125rem;color:var(--muted);margin:0 0 12px}
.crumbs a{color:var(--muted);text-decoration:none}
.crumbs a:hover{color:var(--link);text-decoration:underline}
.crumbs .sep{margin:0 6px;opacity:.6}

.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:start}
.layout.solo{grid-template-columns:minmax(0,1fr)}
.col{min-width:0}
.rail{min-width:0;display:flex;flex-direction:column;gap:16px;position:sticky;top:16px}

/* document header */
.dochead{border-bottom:1px solid var(--rule);padding-bottom:12px;margin-bottom:14px}
.badge{display:block;font-size:.8125rem;font-weight:500;color:var(--muted);margin:0 0 2px}
h1{font-size:1.625rem;line-height:1.25;margin:0 0 6px;font-weight:600;letter-spacing:-.015em}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.chip,.pill{display:inline-block;border:1px solid var(--rule);border-radius:var(--r);padding:1px 8px;font-size:.8125rem;line-height:1.5;color:var(--muted);background:var(--panel);font-variant-numeric:tabular-nums}
.pill{font-weight:500;background:transparent}
.sig-current{color:var(--sig-current);border-color:color-mix(in oklch,var(--sig-current) 40%,var(--rule))}
.sig-review{color:oklch(0.48 0.13 75);border-color:color-mix(in oklch,var(--sig-review) 50%,var(--rule))}
.sig-superseded{color:var(--muted)}

h2{font-size:1.125rem;line-height:1.35;margin:24px 0 10px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
h3{font-size:1rem;margin:18px 0 6px;font-weight:600;color:var(--ink)}
h4{font-size:.875rem;margin:12px 0 4px;font-weight:600;color:var(--ink)}
.count{font-family:var(--mono);font-size:.75rem;font-weight:400;color:var(--muted);background:var(--panel);border:1px solid var(--rule);border-radius:999px;padding:0 7px;margin-left:6px;font-variant-numeric:tabular-nums}
h2 .unit{font-family:var(--mono);font-size:.875rem;font-weight:400;color:var(--muted)}
p{margin:0 0 10px;max-width:72ch}
.lede{font-size:1rem;color:var(--muted);margin:6px 0 0;max-width:72ch}
.honest,.cite{font-size:.875rem;color:var(--muted)}

/* one dense line of counts: the landing scale line and the page stats */
.summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin:0 0 12px;font-size:.9375rem;color:var(--muted);max-width:none}
.summary .n{font-family:var(--mono);font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums}
.summary .sep{width:1px;align-self:stretch;background:var(--rule);margin:2px 2px}
.stats{display:flex;flex-wrap:wrap;gap:2px 16px;margin:0 0 14px;font-size:.875rem;color:var(--muted)}
.stat .v{font-family:var(--mono);font-weight:500;color:var(--ink);font-variant-numeric:tabular-nums;margin-right:4px}

.warn{background:oklch(0.975 0.035 85);border:1px solid oklch(0.86 0.075 80);border-radius:var(--r);padding:8px 12px;font-size:.9375rem;margin:0 0 12px;max-width:72ch}

/* the landing tool: title, counts, one search box beside the findings carousel */
.tool{margin:0 0 14px}
.tool.has-slides{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:16px 48px;align-items:start}
.tool .slides{margin:0}
.tool .filter{margin-top:16px}
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px}
.chips .muted{margin-right:4px}
.chips a{font-size:.8125rem;padding:4px 10px;border:1px solid var(--rule);border-radius:999px;background:var(--ground);color:var(--ink);text-decoration:none}
.chips a:hover{border-color:var(--muted)}
/* the States tab: the map beside the list */
.statemap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:12px 32px;align-items:start}
.statemap ul.stategrid{columns:2}
.usmap-fig{margin:0}
.usmap{display:block;width:100%;height:auto}
.usmap .s{stroke:var(--ground);stroke-width:.9}
.usmap a .s{cursor:pointer}
.usmap a:hover .s{fill:var(--link)}
.usmap .r0,.legend .r0{fill:var(--panel);background:var(--panel)}
.usmap .r1,.legend .r1{fill:oklch(0.92 0.03 27);background:oklch(0.92 0.03 27)}
.usmap .r2,.legend .r2{fill:oklch(0.83 0.07 27);background:oklch(0.83 0.07 27)}
.usmap .r3,.legend .r3{fill:oklch(0.66 0.15 27);background:oklch(0.66 0.15 27)}
.usmap .r4,.legend .r4{fill:oklch(0.48 0.17 27);background:oklch(0.48 0.17 27)}
.usmap .named{stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0 0;font-size:.75rem;color:var(--muted)}
.legend i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px;border:1px solid var(--rule)}
.legend .named{background:none;border:2px solid var(--ink)}
.tool h1{margin:0 0 4px}
.filter{display:block;width:100%;max-width:560px;font:inherit;font-size:1rem;padding:9px 12px;border:1px solid var(--rule);border-radius:var(--r);background:var(--ground);color:var(--ink);margin:0 0 12px}
.filter:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}
.tabnav{display:flex;gap:20px;border-bottom:1px solid var(--rule);margin:0 0 12px;overflow-x:auto}
.tabnav a{padding:6px 0;font-weight:500;font-size:.9375rem;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.tabnav a[aria-selected=true]{color:var(--ink);border-bottom-color:var(--accent)}
/* No JS: :target picks the tab, Drugs by default. JS: data-tab picks it, and a
   search shows every tab that has a hit. */
.tabs:not(.js) section{display:none}
.tabs:not(.js) section:target,.tabs:not(.js):not(:has(section:target)) section:first-of-type{display:block}
.tabs.js section{display:none}
.tabs.js[data-tab=drugs] #drugs,.tabs.js[data-tab=states] #states,.tabs.js[data-tab=agencies] #agencies,.tabs.js.searching section{display:block}
.tabs.js:not(.searching) section>h2{display:none}
.tabs section>h2{margin-top:8px}
.tabs.searching .tabnav{display:none}

/* compact link columns; long names clip to one line and keep their title */
ul.cols{list-style:none;padding:0;margin:0 0 10px;columns:3;column-gap:20px}
ul.cols li{break-inside:avoid;padding:1px 0;font-size:.875rem;line-height:1.5}
ul.cols.four{columns:4}
ul.cols.six{columns:6}
ul.cols.four li,ul.cols.six li{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
ul.cols a{text-decoration:none}
ul.cols a:hover{text-decoration:underline}
/* long landing lists show their first rows; "Show all" (JS only) opens the rest */
.more{display:none;font:inherit;font-size:.875rem;font-weight:500;color:var(--link);background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);padding:4px 12px;cursor:pointer;margin:2px 0 8px}
.tabs.js:not(.searching) .more{display:inline-block}
.tabs.js:not(.searching) ul.six.clip:not(.all)>li:nth-child(n+61),.tabs.js:not(.searching) ul.four.clip:not(.all)>li:nth-child(n+41){display:none}
ul.stategrid{columns:5}
ul.stategrid li{display:flex;justify-content:space-between;gap:8px}
ul.stategrid .count{margin:0;border:0;background:none;padding:0}
ul.inline{list-style:none;padding:0;margin:0 0 12px;display:flex;flex-wrap:wrap;gap:6px}
ul.inline li{background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);padding:2px 10px;font-size:.875rem;font-variant-numeric:tabular-nums}
ul.results{list-style:none;padding:0;margin:0;border-top:1px solid var(--rule)}
ul.results li{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:6px 4px;border-bottom:1px solid var(--rule)}

/* folds: one line until opened */
details.fold{border-top:1px solid var(--rule)}
details.fold>summary{cursor:pointer;padding:7px 2px;font-size:.9375rem;font-weight:500;display:flex;align-items:baseline;gap:8px;min-width:0}
details.fold>summary{list-style:none}
details.fold>summary::-webkit-details-marker{display:none}
details.fold>summary::before{content:"\\25B8";color:var(--muted);transition:transform .15s}
details.fold[open]>summary::before{transform:rotate(90deg)}
.actions details.fold>summary::before{content:none}
details.fold>summary .names{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400;font-size:.8125rem;color:var(--muted)}
details.fold[open]>summary{margin-bottom:6px}
#doses details.fold:last-of-type{border-bottom:1px solid var(--rule)}
.drug h3{margin:12px 0 4px}

/* the bottom row: small links, plus folds that open to full width */
.actions{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 20px;margin:20px 0 8px;padding-top:10px;border-top:1px solid var(--rule);font-size:.875rem}
.actions details.fold{border:0}
.actions details.fold>summary{padding:0;font-size:.875rem;color:var(--link);font-weight:400}
.actions details.fold[open]{flex-basis:100%;padding:8px 0}
.actions details.fold[open]>summary{margin-bottom:8px}
.actions>a{white-space:nowrap}

/* the drug page: one row per distribution, a /research box plot beside the digits */
table.spread{min-width:0;width:100%}
table.spread th{white-space:normal}
table.spread th[scope=row]{font-weight:500;background:none;white-space:normal;color:var(--ink);font-size:.875rem}
table.spread tr.cont th,table.spread tr.cont td{border-top:0}
table.spread th[scope=row],table.spread td{vertical-align:middle;padding:3px 10px;line-height:1.4}
table.spread td:nth-child(2){width:140px}
.rng{white-space:nowrap;font-family:var(--mono);font-size:.8125rem}
.rng .muted{font-family:var(--sans);margin-left:6px}
.rng .gl{font-family:var(--sans);font-size:.75rem;color:var(--muted);margin-left:6px;white-space:nowrap}
.rng .gl:hover{color:var(--link)}
.box{display:block;width:120px;height:15px;overflow:visible}
.box .w{stroke:#0072B2;stroke-width:1.5;fill:none}
.box rect{fill:#E69F00;stroke:#0072B2;stroke-width:1.5}
.box .m{stroke:#0b2a4a;stroke-width:2.5}
.box .agree{fill:#E69F00;stroke:#0b2a4a;stroke-width:1.5}
.also{font-size:.875rem;color:var(--muted);max-width:none;margin:10px 0}

/* dense hairline tables, mono numerals */
.scroll{overflow-x:auto;overscroll-behavior-x:contain;border:1px solid var(--rule);border-radius:var(--r);margin:0 0 10px}
table{min-width:100%;border-collapse:collapse;font-size:.875rem;font-variant-numeric:tabular-nums}
th{text-align:left;font-weight:600;color:var(--muted);background:var(--panel);border-bottom:1px solid var(--rule);padding:6px 10px;white-space:nowrap;font-size:.8125rem}
td{padding:5px 10px;border-bottom:1px solid var(--rule);vertical-align:top}
tbody th{border-bottom:1px solid var(--rule)}
tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}
tbody tr:hover{background:var(--panel)}
table.dose td:nth-child(n+3),table.coverage td:nth-child(n+2){font-family:var(--mono)}
table.dose td:nth-child(3){white-space:nowrap}
td.src{font-family:var(--sans);white-space:nowrap}
.src,.muted{color:var(--muted);font-size:.8125rem}
.raw{font-family:var(--mono);font-size:.8125rem}

/* rail panels (methodology, license, indication pages) */
.panel{border:1px solid var(--rule);border-radius:var(--r);padding:12px 14px;background:var(--ground)}
.panel h2{font-size:.9375rem;margin:0 0 8px;font-weight:600}
.panel p{font-size:.875rem;margin:0 0 10px;max-width:none}
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
.rail details.fold{border:1px solid var(--rule);border-radius:var(--r);padding:0 12px}

/* cite this */
.citebox{border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);padding:8px 12px;margin:0 0 8px;max-width:72ch}
.citebox .cite{font-family:var(--mono);font-size:.8125rem;line-height:1.55;color:var(--ink);margin:0;word-break:break-word}
.citebox .cite+.cite{margin-top:6px}
.copybtn{font:inherit;font-size:.875rem;font-weight:500;color:var(--ink);background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);padding:4px 12px;cursor:pointer}
.copybtn:hover{background:oklch(0.94 0.008 250)}
.copybtn.ok{color:var(--sig-current);border-color:color-mix(in oklch,var(--sig-current) 45%,var(--rule))}

/* the five-number range bar on indication pages */
.five{margin:0 0 14px}
.five-track{position:relative;height:10px;background:var(--panel);border:1px solid var(--rule);border-radius:var(--r);margin:12px 0 4px}
.five-iqr{position:absolute;top:-1px;bottom:-1px;background:color-mix(in oklch,var(--accent) 22%,var(--ground));border:1px solid color-mix(in oklch,var(--accent) 55%,var(--rule));border-radius:3px}
.five-med{position:absolute;top:-5px;bottom:-5px;width:2px;background:var(--accent);border-radius:1px}
.five-ends{display:flex;justify-content:space-between;font-family:var(--mono);font-size:.75rem;color:var(--muted);font-variant-numeric:tabular-nums;margin:0 0 8px}
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

/* the one request link: a button to /research/request/ */
.bigbtn{display:inline-block;font-weight:600;font-size:.9375rem;padding:8px 16px;border-radius:var(--r);background:#0072B2;color:#fff;text-decoration:none}
.bigbtn:hover{background:#005f94;text-decoration:none}
.request{margin:0 0 10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.contact{border:1px solid var(--rule);border-radius:var(--r);padding:12px 16px;background:var(--panel);margin:0 0 8px}
.contact h2{margin-top:0}

/* The site footer is shared chrome (assets/chrome.css); census only styles the
   one-line disclaimer that sits above it. */
.census-disclaimer{border-top:1px solid var(--rule);padding:10px 0;background:var(--panel)}
.census-disclaimer p{max-width:none}
.disclaimer{margin:0;color:var(--muted);font-size:.8125rem}

@media(max-width:960px){
  .layout{grid-template-columns:minmax(0,1fr);gap:24px}
  .rail,.toc{position:static}
  ul.cols{columns:2}
  ul.cols.four{columns:2}
  ul.cols.six,ul.stategrid{columns:3}
  .tool.has-slides,.statemap{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:640px){
  .wrap{padding:0 16px}
  ul.cols,ul.cols.four{columns:1}
  ul.cols.six,ul.stategrid,.statemap ul.stategrid{columns:2}
  .tabs.js:not(.searching) ul.six.clip:not(.all)>li:nth-child(n+31),.tabs.js:not(.searching) ul.four.clip:not(.all)>li:nth-child(n+21){display:none}
  h1{font-size:1.375rem}
  table.spread td:nth-child(2){width:84px}
  table.spread th[scope=row],table.spread td{padding:3px 6px;overflow-wrap:anywhere}
  .box{width:76px}
  .rng{white-space:normal}
  .rng .muted{display:block;margin:0}
  .rng .muted+.gl{display:block;margin:0}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

// A content hash on the stylesheet link: browsers cache census.css for four hours
// (GitHub Pages max-age), and a CSS-only change must never show as an unstyled page.
const CSS_V = createHash('sha256').update(CSS).digest('hex').slice(0, 8);

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

// pathToFileURL, not `file://${argv[1]}`: the repo path contains a space, which
// import.meta.url percent-encodes and a naive concat does not. That mismatch made
// this script a silent no-op when run directly (exit 0, zero files written).
const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
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
