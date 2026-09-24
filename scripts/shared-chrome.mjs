// scripts/shared-chrome.mjs — ONE home for the site's nav and footer.
//
// Before this existed the site had four different navs on four pages and read as four
// different companies: the homepage sold an app, /agency called itself the "consumer
// app"'s sibling, /census never linked to either, and nothing anywhere reached Android.
// Every page now renders this exact markup. Generated census pages import it;
// hand-written pages paste it between the marker comments, and test-shared-chrome.mjs
// fails the build if one drifts.

// chrome.css carries the design tokens, so a stale copy does not degrade a page, it
// breaks it: every colour on the homepage resolves through --lane-*, and an old cached
// file leaves them undefined (invisible icons, transparent buttons). The query string is
// derived from the file's own bytes, so it changes exactly when the file does.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const assetHash = rel => {
  try {
    return createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex').slice(0, 8);
  } catch {
    return '0';
  }
};

export const CHROME_HEAD = `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">
  <link rel="stylesheet" href="/assets/chrome.css?v=${assetHash('assets/chrome.css')}">`;

const SECTIONS = [
  ['App', '/app/'],
  ['For agencies', '/agency/'],
  ['Research', '/research/'],
  ['Blog', '/blog/'],
  ['About', '/about/'],
];

// The CTA is the obvious NEXT STEP for whoever is on this page. A provider reading
// /app wants the app, not a sales call; a chief on a census page wants their protocol
// added or taken down; a medic on the atlas wants to fix their county. None of them are
// sales leads, so "Contact sales" is only the fallback for the pages that do sell.
// Census and research CTAs open the one request form (/research/request/), preset to add.
const CTA = {
  '/app/':              ['Download app',       'https://apps.apple.com/app/id6753611139'],
  '/census/':           ['Add your protocol',  '/research/request/?type=add'],
  '/research/':         ['Add your protocol',  '/research/request/?type=add'],
  '/research/practice/':['Add your protocol',  '/research/request/?type=add'],
  '/research/changes/': ['Add your protocol',  '/research/request/?type=add'],
  '/research/atlas/':   ['Correct this county','/research/atlas/#correct'],
};
const CTA_DEFAULT = ['Contact sales', '/agency/#contact'];

// A section can own more than one path. Research is the umbrella over two lines of work,
// and the census keeps its own /census/ URLs -- 769 of them are indexed and a move
// would need meta-refresh stubs, which GitHub Pages makes the only option and which
// pass less signal than a real redirect. So the nav maps the extra prefix instead of
// moving the pages.
const ALSO = { '/research/': ['/census/'] };

// The census is research, not a sales page: an agency reading its own listing should
// not find the sales pitch one click away in the header, or read the census as a
// product we sell. The footer still reaches /agency/.
const hiddenOn = { '/agency/': ['/census/'] };

const navLinks = current => SECTIONS.filter(([, href]) =>
  !(current && (hiddenOn[href] || []).some(p => current.startsWith(p)))).map(([label, href]) => {
  const on = !!current && (current.startsWith(href)
    || (ALSO[href] || []).some(p => current.startsWith(p)));
  return `          <a href="${href}"${on ? ' class="nav-link on" aria-current="page"' : ' class="nav-link"'}>${label}</a>`;
}).join('\n');

// The Research arm's own bar: which AREA you are in, always visible inside any of
// them. The census keeps its own section bar below this one -- that answers "where in
// the census", this answers "which area", and collapsing them would make a census
// section look like a sibling of the whole 911 atlas.
// UNLINKED 2026-09-22: /research/practice (standing orders) and /research/changes
// (protocol changes) are built from procedures_corpus_full.json, an artifact that no
// longer exists, was never promoted into the nightly pipeline, and came from an
// extractor living on three divergent unmerged branches. Its numbers did not survive a
// clinical read: supraglottic airway showed 73 agencies requiring a physician call, and
// needle decompression 60 -- the latter contradicting the page's own headline, which
// cites chest decompression as the example of a medic acting on their own authority.
// scratch/ONE_READ_MANY_USES.md in ems-router documents the mechanism (stale cert
// headings inherited across table-of-contents and equipment rows) and measures auth
// attribution at 59.3%. The pages stay on disk; they are not presented as findings
// until the corpus is rebuilt and audited. Restore these two lines to relink.
// Labels say what the page HOLDS, in the words a medic already uses. "Who decides" and
// "What changed" were the old labels and neither survived contact with a reader: the
// first page is about STANDING ORDERS vs base contact (it says "standing order" eight
// times), the second is diffs between dated EDITIONS ("edition", 121 times). The nav was
// hiding each page's own vocabulary behind a question. "Protocol census" stays because it
// is the cite string on 769 indexed pages and a name worth owning.
const RESEARCH_AREAS = [
  ['Overview', '/research/', p => p === '/research/'],
  ['Protocol census', '/census/', p => p.startsWith('/census/')],
  ['911 coverage', '/research/atlas/', p => p.startsWith('/research/atlas/')],
];

// No "ProtoQuiz Research" mark on this bar: the main nav directly above already shows
// Research as the active section, so the mark restated it and was most of the bar's
// visual weight. The links are the part that earns the row.
export const researchBar = (current = null) => `  <div class="rbar">
    <div class="rbar-in">
      <nav class="rbar-nav" aria-label="Research areas">${RESEARCH_AREAS.map(([label, href, on]) =>
    `<a href="${href}"${current && on(current) ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    </div>
  </div>`;

// The listing strip. The census names real agencies from records they published
// themselves, so the way OUT has to be as visible as the way in -- the policy already is
// "same day, no reason needed, we do not argue" (see /census/data-license/#takedown), but
// the page used to bury it: the form sat 57% down under a heading that only said "List
// your agency", and the takedown terms were section 4 of 5 on a page three clicks away.
// Read as "submit your agency, exit unadvertised", which is a worse offer than the real one.
//
// Wording differs by page because the thing being controlled differs. The census holds a
// PROTOCOL DOCUMENT an agency sends; the atlas holds county coverage read from state
// licensing rosters, where nobody submitted anything and the only useful action is fixing
// a wrong answer.
export const listingStrip = (kind = 'census') => kind === 'atlas' ? `  <div class="lstrip">
    <div class="lstrip-in">
      <div class="lstrip-t">
        <p class="lstrip-lbl">See a mistake?</p>
        <p class="lstrip-sub">Tell us and we will fix it.</p>
      </div>
      <a class="lstrip-btn lstrip-btn-p" href="/research/request/?type=county">Fix a county</a>
    </div>
  </div>` : `  <div class="lstrip">
    <div class="lstrip-in">
      <div class="lstrip-t">
        <p class="lstrip-lbl">Is your agency&rsquo;s protocol in the census?</p>
        <p class="lstrip-sub">Add it, correct it, or have it removed &mdash; same day, no reason needed.</p>
      </div>
      <a class="lstrip-btn lstrip-btn-p" href="/research/request/?type=add">Add your protocol</a>
      <a class="lstrip-btn lstrip-btn-g" href="/research/request/?type=remove">Remove your protocol</a>
    </div>
  </div>`;

// `current` is a path like '/agency/'. The active link is DERIVED from it rather than
// passed in as a flag, so a page can never forget to say where it is and two pages in
// the same section can never disagree.
// CTA lookup is by PREFIX, not exact path: /census/drugs/adenosine/ is a census page and
// wants the census CTA, not the sales one. Longest prefix wins so /research/atlas/ keeps
// its own county-correction CTA rather than inheriting /research/'s.
const ctaFor = current => {
  if (!current) return CTA_DEFAULT;
  if (CTA[current]) return CTA[current];
  const hit = Object.keys(CTA)
    .filter(p => current.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? CTA[hit] : CTA_DEFAULT;
};

export const navFor = (current = null) => {
  const cta = ctaFor(current);
  return `  <!-- shared-chrome:nav -->
  <header class="site-header">
    <nav class="site-nav" aria-label="Primary">
      <div class="nav-left">
        <a href="/" class="brand"><img src="/logo-256.png" alt="" width="30" height="30"><span>Proto<b>Quiz</b><sup>&trade;</sup></span></a>
        <div class="nav-links">
${navLinks(current)}
        </div>
      </div>
      <!-- NO "SIGN IN" HERE, DELIBERATELY. There is nothing on protoquiz.com to sign
           into: every agency gets its own subdomain (youragency.protoquiz.com) and its
           crews arrive by a link the agency gives them. The nav used to point "Sign in"
           at demo.protoquiz.com -- the DEMO org, which /agency itself labels "Try the
           demo" -- so the link promised a door that does not exist and landed a provider
           on someone else's tenant. If a real web login is ever built, it goes here. -->
      <!-- id="openContact" is what /agency's contact <dialog> binds to. The nav used to
           carry that id; the move into shared-chrome dropped it, so the JS bound nothing
           and "Contact sales" silently did nothing on the one page with the form. On every
           other page there is no dialog and the href is the whole behaviour: a normal link
           to /agency/#contact. -->
      <div class="nav-right">
        <a href="${cta[1]}" class="nav-cta"${cta[1] === CTA_DEFAULT[1] ? ' id="openContact"' : ''}>${cta[0]}</a>
      </div>
    </nav>
  </header>
  <!-- /shared-chrome:nav -->`;
};

export const NAV_HTML = navFor(null);

export const FOOTER_HTML = `  <!-- shared-chrome:footer -->
  <footer class="site-footer">
    <div class="foot-cols">
      <div class="foot-brand">
        <a href="/" class="brand"><img src="/logo-256.png" alt="" width="24" height="24"><span>Proto<b>Quiz</b><sup>&trade;</sup></span></a>
        <p>Protocol training for EMS. Built by a working paramedic.</p>
      </div>
      <div class="foot-col">
        <h2>Product</h2>
        <a href="/app/">iOS app</a>
        <a href="https://play.google.com/store/apps/details?id=com.tmtl.emsprotoquiz">Android</a>
        <a href="/agency/">For agencies</a>
        <a href="/agency/#pricing-section">Pricing</a>
      </div>
      <div class="foot-col">
        <h2>Research</h2>
        <a href="/research/">Overview</a>
        <a href="/census/">Protocol census</a>
        <a href="/census/#states">By state</a>
        <a href="/census/#drugs">By medication</a>
        <a href="/research/atlas/">911 coverage</a>
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
    </div>
  </footer>
  <!-- /shared-chrome:footer -->`;
