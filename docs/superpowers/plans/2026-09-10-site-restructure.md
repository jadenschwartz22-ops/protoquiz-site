# protoquiz.com Site Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn protoquiz.com from a B2C download funnel into a company site: a hub homepage routing to three products, one shared nav and footer on every page, and today's homepage content moved to `/app`.

**Architecture:** Static site, no framework, no build step for hand-written pages. One new shared chrome partial is defined twice — once as a JS template literal in `scripts/census-pages.mjs` (which generates ~400 census pages) and once as literal HTML pasted into each static page. The two must stay byte-identical in rendered output; Task 2 adds a test that enforces this. Homepage and `/app` are new hand-written files built on iOS Day Shift tokens expressed in OKLCH.

**Tech Stack:** Plain HTML/CSS, Node 20 ESM for generators, `node:test`-style assertion scripts (no test framework), GitHub Pages deploy on push to `main`.

**Spec:** `docs/superpowers/specs/2026-09-10-site-restructure-design.md`

## Global Constraints

- **Copy, verbatim:** homepage headline is exactly `Welcome to ProtoQuiz.` and the subline is exactly `Protocol training for EMS.` Nothing else in the welcome block.
- **Nav items, in this order, on every page:** `App` · `For agencies` · `EMS Census` · `About`, then `Sign in`, then a `Contact sales` button.
- **No emojis anywhere.** No em dashes in prose copy (spec + user global rule).
- **Never `#000` or `#fff`.** All color in OKLCH from the token table below.
- **No census data on the homepage.** No map, no agency counts, no drug tables.
- **Delete every `← Consumer app` / `back-to-consumer` link** (4 occurrences in `agency/index.html`).
- **Any live number that ships is read from `data/census/manifest.json` or `data/firestore-stats.json` at build time**, never copied from a mockup or a doc.
- **One push to `main` for the whole batch** (CI spend rule). Work on branch `site-restructure`.
- **Fonts:** Sora (display/UI), Source Serif 4 (welcome subline only), IBM Plex Mono (eyebrows, labels, numerals). Loaded from `fonts.googleapis.com`.
- **Logo:** `/logo-256.png` (transparent PNG). Never `bimi-logo.svg` (has a baked black square).

### Design tokens (copy this block verbatim into every new CSS file)

```css
:root {
  --ground: oklch(97.6% 0.004 265);
  --paper:  oklch(99.4% 0.002 265);
  --ink:    oklch(21% 0.017 265);
  --ink-2:  oklch(44% 0.014 265);
  --ink-3:  oklch(60% 0.011 265);
  --line:   oklch(91.5% 0.007 265);
  --accent: oklch(50% 0.196 265);
  --accent-soft: oklch(95.5% 0.024 265);
  --census-red:  oklch(50% 0.15 27);
  --census-soft: oklch(95.5% 0.02 27);
  --night:     oklch(13% 0.012 280);
  --night-2:   oklch(17% 0.014 280);
  --night-line: oklch(28% 0.016 280);
  --amber:     oklch(79% 0.16 78);
  --night-ink: oklch(95% 0.006 80);
  --night-ink-2: oklch(70% 0.012 80);
}
```

---

## File Structure

| File | Responsibility |
|---|---|
| `assets/chrome.css` | NEW. Design tokens + shared nav/footer styles. The single home for chrome CSS; every page links it. |
| `assets/chrome.html` | NEW. Reference copy of the canonical nav + footer markup. Not served; it is the source of truth Task 2's test compares against. |
| `scripts/shared-chrome.mjs` | NEW. Exports `NAV_HTML`, `FOOTER_HTML`, `CHROME_HEAD`. Imported by `census-pages.mjs` and by the Task 2 test. |
| `scripts/test-shared-chrome.mjs` | NEW. Asserts every static page's chrome matches `shared-chrome.mjs` exactly. |
| `scripts/census-pages.mjs:286-306` | MODIFY. Replace local `nav`/`footer` consts with imports from `shared-chrome.mjs`. |
| `index.html` | REPLACE. New hub homepage (direction C3). |
| `app/index.html` | NEW. Today's homepage content, re-skinned light, with platform/theme toggle. |
| `assets/app-toggle.js` | NEW. The iOS/Android x Night/Day toggle behavior. |
| `about/`, `trust/`, `blog/`, `privacy/`, `terms/`, `delete-account/`, `legal/*`, `b2b/*`, `agency/*` | MODIFY. Swap each page's private nav/footer for the shared chrome. |
| `sitemap.xml`, `llms.txt`, `404.html` | MODIFY. Add `/app/`, keep `/` canonical. |

---

## Task 1: Shared chrome module and stylesheet

**Files:**
- Create: `scripts/shared-chrome.mjs`
- Create: `assets/chrome.css`
- Create: `assets/chrome.html`
- Test: `scripts/test-shared-chrome.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `NAV_HTML` (string), `FOOTER_HTML` (string), `CHROME_HEAD` (string), and `navFor(path)` -> string. `navFor` returns `NAV_HTML` with `aria-current="page"` and a `.on` class on the link whose section contains `path`. Sections match by prefix: `/app/`, `/agency/`, `/census/`, `/about/`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-shared-chrome.mjs`:

```javascript
// scripts/test-shared-chrome.mjs — the shared chrome is identical everywhere.
// Run: node scripts/test-shared-chrome.mjs (also npm run test:shared-chrome).
//
// Load-bearing: nav and footer are defined once in shared-chrome.mjs but pasted
// literally into hand-written pages. If a page drifts, the site goes back to
// looking like four different companies, which is the whole problem this fixes.
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAV_HTML, FOOTER_HTML, CHROME_HEAD, navFor } from './shared-chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`  FAIL ${name}: ${e.message}`); process.exitCode = 1; }
};

// Every page that must carry the shared chrome.
const PAGES = [
  'index.html', 'app/index.html', 'about/index.html', 'trust/index.html',
  'agency/index.html', 'blog/index.html', 'privacy/index.html', 'terms/index.html',
  'delete-account/index.html',
];

const NAV_LABELS = ['App', 'For agencies', 'EMS Census', 'About'];

test('nav lists the four sections in order', () => {
  const idx = NAV_LABELS.map(l => NAV_HTML.indexOf(`>${l}<`));
  assert.ok(idx.every(i => i > -1), `missing label: ${NAV_LABELS.filter((l, i) => idx[i] < 0)}`);
  assert.deepStrictEqual(idx, [...idx].sort((a, b) => a - b), 'nav labels out of order');
});

test('nav has no back-to-consumer exit', () => {
  assert.ok(!/back-to-consumer|Consumer app/i.test(NAV_HTML + FOOTER_HTML));
});

test('footer reaches both app stores', () => {
  assert.match(FOOTER_HTML, /iOS app/);
  assert.match(FOOTER_HTML, /Android app/);
});

test('navFor marks exactly one link current', () => {
  for (const p of ['/app/', '/agency/', '/census/', '/about/']) {
    const html = navFor(p);
    assert.strictEqual((html.match(/aria-current="page"/g) || []).length, 1, `${p} did not mark one link`);
  }
  assert.strictEqual((navFor('/').match(/aria-current="page"/g) || []).length, 0, 'home marks none');
});

test('no page keeps a private nav', () => {
  for (const rel of PAGES) {
    const f = join(root, rel);
    if (!existsSync(f)) { assert.fail(`missing page: ${rel}`); }
    const html = readFileSync(f, 'utf8');
    assert.ok(html.includes('<!-- shared-chrome:nav -->'), `${rel} has no shared nav marker`);
    assert.ok(html.includes('<!-- shared-chrome:footer -->'), `${rel} has no shared footer marker`);
    assert.ok(html.includes('/assets/chrome.css'), `${rel} does not link chrome.css`);
    assert.ok(!/back-to-consumer/.test(html), `${rel} still has a back-to-consumer link`);
  }
});

test('chrome head declares the three fonts', () => {
  for (const f of ['Sora', 'Source+Serif+4', 'IBM+Plex+Mono']) {
    assert.ok(CHROME_HEAD.includes(f), `CHROME_HEAD missing ${f}`);
  }
});

test('no hardcoded pure black or white in chrome.css', () => {
  const css = readFileSync(join(root, 'assets/chrome.css'), 'utf8');
  assert.ok(!/#fff\b|#ffffff\b|#000\b|#000000\b/i.test(css), 'chrome.css uses pure black or white');
});

console.log(`\n${passed} passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-shared-chrome.mjs`
Expected: FAIL — `Cannot find module './shared-chrome.mjs'`

- [ ] **Step 3: Write `scripts/shared-chrome.mjs`**

```javascript
// scripts/shared-chrome.mjs — ONE home for the site's nav and footer.
//
// Before this existed the site had four different navs on four pages and read as
// four different companies. Every page now renders this exact markup: generated
// census pages import it, hand-written pages paste it between the marker comments
// and test-shared-chrome.mjs fails the build if one drifts.

export const CHROME_HEAD = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">
  <link rel="stylesheet" href="/assets/chrome.css">`;

const SECTIONS = [
  ['App', '/app/'],
  ['For agencies', '/agency/'],
  ['EMS Census', '/census/'],
  ['About', '/about/'],
];

const navLinks = current => SECTIONS.map(([label, href]) => {
  const on = current && current.startsWith(href);
  return `          <a href="${href}"${on ? ' class="nav-link on" aria-current="page"' : ' class="nav-link"'}>${label}</a>`;
}).join('\n');

export const navFor = (current = null) => `  <!-- shared-chrome:nav -->
  <header class="site-header">
    <nav class="site-nav" aria-label="Primary">
      <div class="nav-left">
        <a href="/" class="brand"><img src="/logo-256.png" alt="" width="30" height="30"><span>ProtoQuiz</span></a>
        <div class="nav-links">
${navLinks(current)}
        </div>
      </div>
      <div class="nav-right">
        <a href="https://demo.protoquiz.com" class="nav-link">Sign in</a>
        <a href="/agency/#contact" class="nav-cta">Contact sales</a>
      </div>
    </nav>
  </header>
  <!-- /shared-chrome:nav -->`;

export const NAV_HTML = navFor(null);

export const FOOTER_HTML = `  <!-- shared-chrome:footer -->
  <footer class="site-footer">
    <div class="foot-cols">
      <div class="foot-brand">
        <a href="/" class="brand"><img src="/logo-256.png" alt="" width="24" height="24"><span>ProtoQuiz</span></a>
        <p>Protocol training for EMS. Built by a working paramedic.</p>
      </div>
      <div class="foot-col">
        <h2>Product</h2>
        <a href="/app/">iOS app</a>
        <a href="/app/">Android app</a>
        <a href="/agency/">For agencies</a>
        <a href="/agency/#pricing-section">Pricing</a>
      </div>
      <div class="foot-col">
        <h2>Census</h2>
        <a href="/census/">Overview</a>
        <a href="/census/#states">By state</a>
        <a href="/census/#drugs">By drug</a>
        <a href="/census/methodology/">Methodology</a>
      </div>
      <div class="foot-col">
        <h2>Company</h2>
        <a href="/about/">About</a>
        <a href="/blog/">Blog</a>
        <a href="/trust/">Trust</a>
        <a href="https://status.protoquiz.com">Status</a>
      </div>
      <div class="foot-col">
        <h2>Legal</h2>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/trust/">Security</a>
        <a href="/census/data-license/">Data license</a>
      </div>
    </div>
    <div class="foot-base">
      <span>&copy; 2026 Teach Me To Live LLC, d/b/a ProtoQuiz&trade;.</span>
      <span>Denver, CO &middot; Atlanta, GA</span>
    </div>
  </footer>
  <!-- /shared-chrome:footer -->`;
```

- [ ] **Step 4: Write `assets/chrome.css`**

Paste the Global Constraints token block at the top, then:

```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: 'Sora', system-ui, -apple-system, sans-serif;
       background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: oklch(43% 0.19 265); }
.mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.serif { font-family: 'Source Serif 4', Georgia, serif; }

/* nav */
.site-header { border-bottom: 1px solid var(--line); background: var(--paper); }
.site-nav { display: flex; align-items: center; justify-content: space-between;
            gap: 24px; padding: 0 clamp(16px, 5vw, 72px); height: 72px; }
.nav-left, .nav-right { display: flex; align-items: center; gap: 44px; }
.nav-right { gap: 20px; }
.brand { display: flex; align-items: center; gap: 11px; color: var(--ink);
         font-weight: 600; font-size: 17px; letter-spacing: -0.02em; }
.brand img { display: block; }
.nav-links { display: flex; gap: 30px; }
.nav-link { font-size: 14px; color: var(--ink-2); }
.nav-link.on { color: var(--ink); font-weight: 500;
               border-bottom: 2px solid var(--accent); padding-bottom: 3px; }
.nav-cta { background: var(--accent); color: var(--paper); font-size: 14px;
           font-weight: 500; padding: 10px 18px; border-radius: 6px; }
.nav-cta:hover { background: oklch(43% 0.19 265); color: var(--paper); }

/* footer */
.site-footer { background: var(--ground); border-top: 1px solid var(--line);
               padding: 52px clamp(16px, 5vw, 72px) 36px; }
.foot-cols { display: grid; grid-template-columns: 2fr repeat(4, minmax(0, 1fr)); gap: 36px; }
.foot-brand p { font-size: 13px; line-height: 1.65; color: var(--ink-3);
                margin: 12px 0 0; max-width: 250px; }
.foot-col { display: flex; flex-direction: column; gap: 10px; }
.foot-col h2 { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10px;
               letter-spacing: 1.6px; text-transform: uppercase; color: var(--ink);
               margin: 0 0 3px; font-weight: 500; }
.foot-col a { font-size: 13px; color: var(--ink-3); }
.foot-col a:hover { color: var(--ink); }
.foot-base { margin-top: 40px; padding-top: 22px; border-top: 1px solid var(--line);
             display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap;
             font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px;
             letter-spacing: 0.8px; color: var(--ink-3); }

@media (max-width: 900px) {
  .foot-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .nav-links { display: none; }
}
@media (max-width: 560px) {
  .foot-cols { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Write `assets/chrome.html`**

Write the rendered output of `NAV_HTML` followed by a blank line and `FOOTER_HTML`, so a human can copy-paste it into a static page. Generate it rather than hand-typing:

```bash
node -e "import('./scripts/shared-chrome.mjs').then(m => process.stdout.write(m.NAV_HTML + '\n\n' + m.FOOTER_HTML + '\n'))" > assets/chrome.html
```

- [ ] **Step 6: Run test to verify chrome asserts pass**

Run: `node scripts/test-shared-chrome.mjs`
Expected: The nav/footer/navFor/CHROME_HEAD/css tests PASS. The `no page keeps a private nav` test FAILS listing every page — that is correct; Tasks 3 through 6 fix those pages one at a time.

- [ ] **Step 7: Register the test in package.json**

In `package.json` `scripts`, add `"test:shared-chrome": "node scripts/test-shared-chrome.mjs"` and append ` && npm run test:shared-chrome` to the existing `"test"` script.

- [ ] **Step 8: Commit**

```bash
git checkout -b site-restructure
git add scripts/shared-chrome.mjs scripts/test-shared-chrome.mjs assets/chrome.css assets/chrome.html package.json
git commit -m "chore: one home for site nav and footer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Census generator uses the shared chrome

**Files:**
- Modify: `scripts/census-pages.mjs:286-306`
- Test: `scripts/test-census-pages.mjs` (existing; must keep passing)

**Interfaces:**
- Consumes: `NAV_HTML`, `FOOTER_HTML`, `navFor` from Task 1.
- Produces: nothing new. ~400 generated census pages now carry the shared chrome.

The existing test enforces byte-for-byte determinism on rebuild, which is the safety net here.

- [ ] **Step 1: Run the existing census tests to get a green baseline**

Run: `npm run test:census-pages`
Expected: PASS. If it fails before you touch anything, stop and report — do not proceed.

- [ ] **Step 2: Replace the local nav and footer consts**

In `scripts/census-pages.mjs`, add to the imports at the top of the file:

```javascript
import { NAV_HTML, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';
```

Delete the `const nav = ...` block (currently lines 286-297) and replace with:

```javascript
// Nav and footer live in scripts/shared-chrome.mjs so every page on the site renders
// the same chrome. Census pages are always in the census section.
const nav = NAV_HTML.replace('href="/census/" class="nav-link"',
                             'href="/census/" class="nav-link on" aria-current="page"');
```

Replace the `const footer = ...` block (currently lines 299-306) with:

```javascript
const footer = FOOTER_HTML + `
</body>
</html>
`;
```

Note: the old `footer` const closed `</body></html>`; the new one must too. The old footer's `DISCLAIMER` paragraph moves into the census product bar area rather than being lost — find where `DISCLAIMER` is otherwise referenced and keep it rendering on census pages.

- [ ] **Step 3: Add the chrome stylesheet to generated pages**

Find where generated pages emit their `<head>` (search for `census.css`). Add `CHROME_HEAD` immediately before the existing `census.css` link so page-specific CSS still wins the cascade.

- [ ] **Step 4: Regenerate and run tests**

Run: `npm run census:pages && npm run test:census-pages && node scripts/test-shared-chrome.mjs`
Expected: census tests PASS (determinism holds). Shared-chrome test still fails only on the static-page assertions.

- [ ] **Step 5: Eyeball one generated page**

Run: `open census/index.html` (or read it). Confirm the nav shows App / For agencies / EMS Census / About with EMS Census marked current, and that the census product sub-bar still renders beneath it.

- [ ] **Step 6: Commit**

```bash
git add scripts/census-pages.mjs census/
git commit -m "census: render the shared site chrome

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: New homepage

**Files:**
- Create: `assets/home.css`
- Replace: `index.html`
- Test: `scripts/test-shared-chrome.mjs` (existing from Task 1)

**Interfaces:**
- Consumes: `NAV_HTML`, `FOOTER_HTML`, `CHROME_HEAD` markup from Task 1 (pasted literally, between the marker comments).
- Produces: `/` as the hub. Three lanes linking to `/app/`, `/agency/`, `/census/`.

Design reference: artboard `DirectionC.dc.html` in the mockup canvas. Full source is at `~/dev/Sites/pq-homepage-directions/DirectionC.dc.html` — port its markup, replacing `var(--x)` names that differ and swapping the inline `<style>` for `assets/home.css`.

- [ ] **Step 1: Save the current homepage for the /app task**

```bash
cp index.html /tmp/old-homepage.html
```

Task 4 needs its content. Do not skip this.

- [ ] **Step 2: Write `assets/home.css`**

Paste the Global Constraints token block, then the lane styles:

```css
.hero { background: var(--ground); border-bottom: 1px solid var(--line);
        padding: clamp(56px, 8vw, 96px) clamp(16px, 5vw, 72px) clamp(52px, 7vw, 88px);
        display: flex; flex-direction: column; align-items: center; text-align: center; }
.hero img { width: clamp(88px, 12vw, 132px); height: auto; display: block; margin-bottom: 32px; }
.hero h1 { font-size: clamp(38px, 6vw, 82px); line-height: 0.96; letter-spacing: -0.052em;
           font-weight: 800; margin: 0 0 24px; text-wrap: balance; }
.hero p { font-family: 'Source Serif 4', Georgia, serif; font-size: clamp(17px, 2vw, 23px);
          line-height: 1.45; color: var(--ink-2); margin: 0; max-width: 600px; }

.lanes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lane { padding: 52px clamp(20px, 3vw, 44px) 48px; display: flex; flex-direction: column;
        border-right: 1px solid var(--line); }
.lane:last-child { border-right: 0; }
.lane-icon { width: 48px; height: 48px; border-radius: 10px; display: flex;
             align-items: center; justify-content: center; margin-bottom: 26px;
             background: var(--accent-soft); }
.lane-census .lane-icon { background: var(--census-soft); }
.lane-num { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px;
            letter-spacing: 2px; color: var(--ink-3); margin-bottom: 12px; }
.lane h2 { font-size: clamp(22px, 2.4vw, 30px); font-weight: 600; letter-spacing: -0.03em;
           line-height: 1.1; margin: 0 0 16px; }
.lane > p { font-size: 15.5px; line-height: 1.68; color: var(--ink-2); margin: 0 0 26px; }
.lane ul { list-style: none; padding: 0; margin: 0 0 26px;
           display: flex; flex-direction: column; gap: 11px; }
.lane li { display: flex; align-items: center; gap: 11px; font-size: 14.5px; color: var(--ink-2); }
.lane-spacer { flex-grow: 1; }
.lane-note { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px;
             letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-3);
             margin-bottom: 16px; }
.lane-cta { font-size: 15px; font-weight: 500; padding: 13px 20px; border-radius: 7px;
            text-align: center; background: var(--accent); color: var(--paper); }
.lane-cta.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }

@media (max-width: 900px) {
  .lanes { grid-template-columns: 1fr; }
  .lane { border-right: 0; border-bottom: 1px solid var(--line); }
  .lane:last-child { border-bottom: 0; }
}
```

- [ ] **Step 3: Write the new `index.html`**

Structure, in order:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProtoQuiz - Protocol training for EMS</title>
  <meta name="description" content="Protocol training for EMS. An app for individual providers, a platform for agencies, and a public record of what American EMS agencies carry.">
  <link rel="canonical" href="https://protoquiz.com/">
  <!-- keep every favicon, og:, twitter: and apple-itunes-app tag from /tmp/old-homepage.html -->
  <!-- paste CHROME_HEAD here -->
  <link rel="stylesheet" href="/assets/home.css">
</head>
<body>
  <!-- paste NAV_HTML here, verbatim, including both marker comments -->

  <main>
    <section class="hero">
      <img src="/logo-256.png" alt="" width="132" height="132">
      <h1>Welcome to ProtoQuiz.</h1>
      <p>Protocol training for EMS.</p>
    </section>

    <section class="lanes">
      <!-- lane 01 For providers  -> /app/    accent blue, cta solid "Get the app" -->
      <!-- lane 02 For agencies   -> /agency/ accent blue, cta solid "See how it works" -->
      <!-- lane 03 EMS Census     -> /census/ census red, cta ghost "Explore the data" -->
    </section>
  </main>

  <!-- paste FOOTER_HTML here, verbatim, including both marker comments -->
</body>
</html>
```

Lane copy, verbatim:

| # | Heading | Body | Bullets | Note | CTA |
|---|---|---|---|---|---|
| 01 | For providers | Upload your agency's protocol PDF and study what you'll actually be held to on shift, not a national average. | Page-cited answers / Scoped to your cert level / Free to start | iOS & Android | Get the app |
| 02 | For agencies | Load your protocols once. Every crew member trains on the current version, and you see who's behind before QA does. | Medical-director sign-off / Compliance dashboard / Your own subdomain | $100 / provider / yr | See how it works |
| 03 | EMS Census | A public, versioned record of what American EMS agencies carry, rebuilt nightly from the documents they publish themselves. | Compare agencies side by side / Sourced to the original PDF / Open for research and press | Free & open | Explore the data |

Icons: inline SVG, stroke-based, 24x24 viewBox, `stroke-width="1.7"`. Phone outline for 01, building for 02, globe for 03. Checkmarks in bullets are 15x15 inline SVG, `stroke-width="2.6"`, colored `var(--accent)` in lanes 01/02 and `var(--census-red)` in lane 03.

- [ ] **Step 4: Run the shared-chrome test**

Run: `node scripts/test-shared-chrome.mjs`
Expected: the `index.html` entry in `no page keeps a private nav` now passes. `app/index.html` and the rest still fail.

- [ ] **Step 5: Check it at phone width**

Open `index.html` in a browser at 400px wide. Confirm: lanes stack to one column, no horizontal scroll, at least 16px gutter on both sides, headline does not overflow.

- [ ] **Step 6: Commit**

```bash
git add index.html assets/home.css
git commit -m "home: company hub replacing the consumer funnel

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: /app product page

**Files:**
- Create: `app/index.html`
- Create: `assets/app.css`
- Create: `assets/app-toggle.js`
- Read: `/tmp/old-homepage.html` (saved in Task 3)

**Interfaces:**
- Consumes: chrome from Task 1; old homepage content from `/tmp/old-homepage.html`.
- Produces: `/app/`, the B2C product page. Linked from homepage lane 01 and both footer app links.

- [ ] **Step 1: Extract the keepable sections from the old homepage**

From `/tmp/old-homepage.html`, carry over the CONTENT (not the dark styling) of these sections: `#how` (3-step), `#app` (feature list), `#faq`, and the reach numbers from `#reach`. Drop `#compete` and the `#download` band; the hero CTAs replace them.

- [ ] **Step 2: Write `assets/app.css`**

Token block, then hero/steps/reviews styles matching the mockup at `~/dev/Sites/pq-homepage-directions/AppPage.dc.html`. Reuse `.lane`-style rules where they fit rather than inventing parallel ones.

- [ ] **Step 3: Write `assets/app-toggle.js`**

```javascript
// assets/app-toggle.js — the store-screenshot switcher.
// Two independent axes: platform (ios|android) and theme (night|day). The app really
// ships two identities per BrandKit, so the page shows them rather than describing them.
(() => {
  const shot = document.querySelector('[data-shot]');
  const caption = document.querySelector('[data-shot-caption]');
  if (!shot) return;
  const state = { platform: 'ios', theme: 'night' };
  const label = { ios: 'iPhone', android: 'Android', night: 'Night Shift', day: 'Day Shift' };

  const sync = () => {
    shot.src = `/app-shots/${state.theme}-${state.platform}.png`;
    shot.alt = `ProtoQuiz on ${label[state.platform]} in ${label[state.theme]}`;
    if (caption) caption.textContent = `${label[state.platform]} · ${label[state.theme]}`;
    document.querySelectorAll('[data-set]').forEach(b => {
      const [axis, value] = b.dataset.set.split(':');
      b.classList.toggle('on', state[axis] === value);
      b.setAttribute('aria-pressed', String(state[axis] === value));
    });
  };

  document.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const [axis, value] = b.dataset.set.split(':');
    state[axis] = value;
    sync();
  }));
  sync();
})();
```

- [ ] **Step 4: Confirm the screenshot set exists**

The toggle expects `/app-shots/{theme}-{platform}.png`. All four files were created 2026-09-10 and are already in the repo:

```bash
cd "$HOME/dev/Sites/PQ site"
ls -la app-shots/night-ios.png app-shots/night-android.png app-shots/day-ios.png app-shots/day-android.png
```

Expected: four files, each 600px wide. If any is missing, stop and report.

Provenance: Night Shift is `app-2.png` (Learn hub, Pharmacology). Day Shift is Jaden's 2026-09-10 capture of the Study hub, resized to 600px. Four more Day Shift screens are in the repo unused and available if the page wants a gallery later: `day-algorithm-quiz.png`, `day-quiz-question.png`, `day-dispatch.png`, `day-scenario.png`.

Known limitation, do not silently "fix": `night-android.png` and `day-android.png` are currently the iOS captures. Android parity screenshots have not been taken. The toggle is honest about theme but not yet about platform chrome. Leave as is and flag it in the completion report.

- [ ] **Step 5: Write `app/index.html`**

Head: title `ProtoQuiz for EMTs and Paramedics - Protocol Study App`, description carried from the old homepage, `<link rel="canonical" href="https://protoquiz.com/app/">`, the `apple-itunes-app` smart-banner meta from the old homepage, CHROME_HEAD, then `/assets/app.css`.

Body order: NAV_HTML (App marked current) / hero with both store buttons and the toggle / how-it-works 3 steps / reviews (iOS real 4.8 from `data/firestore-stats.json`, Play "Reviews coming soon" in a dashed panel) / FAQ / FOOTER_HTML / `<script src="/assets/app-toggle.js" defer></script>`.

Store button hrefs, verbatim:
- App Store: `https://apps.apple.com/app/id6753611139`
- Google Play: `https://play.google.com/store/apps/details?id=com.tmtl.emsprotoquiz`

(The Play id is `applicationId` from `~/dev/PQ-Android/app/build.gradle.kts`, verified 2026-09-10. Per memory, the Play listing was submitted then withdrawn — if the link 404s, that is why; keep the button and let Jaden decide whether to gate it.)

- [ ] **Step 6: Run the tests**

Run: `node scripts/test-shared-chrome.mjs`
Expected: `app/index.html` now passes its chrome assertions.

- [ ] **Step 7: Verify the toggle works**

Open `app/index.html` in a browser. Click all four combinations. Confirm the image src changes, the caption updates, and the pressed button state moves. Confirm no console errors.

- [ ] **Step 8: Commit**

```bash
git add app/ assets/app.css assets/app-toggle.js app-shots/night-*.png app-shots/day-*.png
git commit -m "app: B2C product page with platform and theme toggle

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Shared chrome on the remaining static pages

**Files:**
- Modify: `agency/index.html`, `agency/compare/index.html`, `agency/faq/index.html`, `agency/tour/index.html`
- Modify: `about/index.html`, `trust/index.html`, `blog/index.html`
- Modify: `privacy/index.html`, `terms/index.html`, `delete-account/index.html`
- Modify: `b2b/privacy/index.html`, `b2b/terms/index.html`, `legal/*.html`

**Interfaces:**
- Consumes: chrome from Task 1.
- Produces: nothing new. Every page now carries identical chrome.

**Bodies are not redesigned.** `/agency` keeps its cream editorial body and `/census` keeps its look. Only the header and footer are swapped.

- [ ] **Step 1: Swap chrome on `agency/index.html`**

Replace the existing `<header>`/nav block with NAV_HTML (For agencies marked current) between the marker comments. Replace the footer with FOOTER_HTML. Add CHROME_HEAD to `<head>` BEFORE the page's own stylesheet so the page's cream styling still wins.

Delete all 4 `back-to-consumer` links and the mobile drawer's `drawer-exit` "ProtoQuiz consumer app" link.

- [ ] **Step 2: Verify the agency page still looks right**

Open `agency/index.html`. The body must be visually unchanged (cream, serif). Only the top bar and footer differ. If the cream body broke, the CHROME_HEAD link is in the wrong place in `<head>`.

- [ ] **Step 3: Repeat for each remaining page**

For each of: `agency/compare/`, `agency/faq/`, `agency/tour/`, `about/`, `trust/`, `blog/`, `privacy/`, `terms/`, `delete-account/`, `b2b/privacy/`, `b2b/terms/`, and each file in `legal/` — same swap. Mark the nav item current only where one applies (`/agency/*` -> For agencies, `/about/` -> About; legal and privacy pages mark none).

- [ ] **Step 4: Run the tests**

Run: `node scripts/test-shared-chrome.mjs`
Expected: ALL tests PASS, including `no page keeps a private nav`.

- [ ] **Step 5: Grep for stragglers**

```bash
grep -rl "back-to-consumer\|Consumer app" --include="*.html" . | grep -v node_modules | grep -v tmp/
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add agency/ about/ trust/ blog/ privacy/ terms/ delete-account/ b2b/ legal/
git commit -m "site: one nav and footer on every page

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: SEO, redirects and sitemap

**Files:**
- Modify: `sitemap.xml`, `llms.txt`, `404.html`
- Create: `app/index.html` head tags (done in Task 4; verify here)

**Interfaces:**
- Consumes: `/app/` from Task 4.
- Produces: search engines keep finding the B2C content at its new URL.

GitHub Pages serves no server-side redirects, so the old homepage content moving to `/app/` is handled by keeping `/` indexable with its new hub content and adding `/app/` as a new indexed URL. No redirect is needed because `/` still exists; it changed content.

- [ ] **Step 1: Add `/app/` to `sitemap.xml`**

Add a `<url>` entry for `https://protoquiz.com/app/` with `<priority>0.9</priority>` and today's `<lastmod>`. Update `/`'s `<lastmod>` to today.

- [ ] **Step 2: Update `llms.txt`**

Add a line describing `/app/` as the consumer app page. Update the site description at the top to say ProtoQuiz has three products rather than describing a single app.

- [ ] **Step 3: Verify canonical tags**

Run:
```bash
grep -h 'rel="canonical"' index.html app/index.html
```
Expected: `/` canonicals to `https://protoquiz.com/` and `/app/` to `https://protoquiz.com/app/`. Neither points at the other.

- [ ] **Step 4: Confirm the App Store smart banner moved**

Run: `grep -c apple-itunes-app index.html app/index.html`
Expected: `index.html:0` and `app/index.html:1`. The banner belongs on the product page, not the hub.

- [ ] **Step 5: Commit**

```bash
git add sitemap.xml llms.txt 404.html
git commit -m "seo: index /app and refresh the site description

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Full verification and single push

**Files:** none modified; this task verifies.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every suite PASSES, including the new `test:shared-chrome`.

- [ ] **Step 2: Confirm census determinism after all changes**

```bash
npm run census:pages && git status --short census/ | head
```
Expected: no unexpected diff beyond the chrome change already committed in Task 2.

- [ ] **Step 3: Walk the site locally**

```bash
python3 -m http.server 8080
```
Visit `/`, `/app/`, `/agency/`, `/census/`, `/about/`, `/trust/`. For each confirm: identical nav, identical footer, correct item marked current, no console errors, no horizontal scroll at 400px.

- [ ] **Step 4: Confirm every product is reachable**

From `/` alone, confirm a visitor can reach the iOS app, the Android app, `/agency/` and `/census/`. From any deep page, confirm the nav reaches all four sections.

- [ ] **Step 5: Push once**

```bash
git push -u origin site-restructure
```

Branch push only. Do NOT push to `main` and do NOT open a PR without Jaden's go-ahead; the CI spend rule requires a declared batch. Report what shipped and let him merge.

---

## Self-Review

**Spec coverage:** Problem/four-navs -> Tasks 1, 2, 5. Homepage hub C3 -> Task 3. Day Shift tokens -> Global Constraints + every CSS task. `/app` light with toggle, both stores, Play reviews pending -> Task 4. Shared chrome three edit sites -> Tasks 1, 2, 5. Redirects/SEO -> Task 6. Out-of-scope items (`/agency` body, `/census` body, EMS Research) are explicitly untouched and Task 5 Step 2 verifies the agency body is unchanged. Verification list -> Task 7.

**Placeholder scan:** No placeholders remain. The spec's open question about missing Day Shift screenshots was closed 2026-09-10 when Jaden supplied real captures; Task 4 Step 4 now verifies files rather than faking them. The one honest gap left, Android platform captures, is called out explicitly rather than papered over.

**Type consistency:** `NAV_HTML`, `FOOTER_HTML`, `CHROME_HEAD`, `navFor(path)` are defined in Task 1 and used with those exact names in Tasks 2 through 5. Screenshot filenames `{theme}-{platform}.png` match between `app-toggle.js` (Task 4 Step 3) and the copy commands (Task 4 Step 4). Marker comments `<!-- shared-chrome:nav -->` / `<!-- shared-chrome:footer -->` are asserted in Task 1's test and pasted in Tasks 3, 4, 5.
