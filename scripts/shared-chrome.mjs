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
  ['EMS Census', '/census/'],
  ['About', '/about/'],
];

// The CTA is the obvious NEXT STEP for whoever is on this page. A provider reading
// /app wants the app, not a sales call; someone on /census wants their agency listed.
const CTA = {
  '/app/':    ['Download app',    'https://apps.apple.com/app/id6753611139'],
  '/census/': ['Add your agency', '/census/#list-your-agency'],
};
const CTA_DEFAULT = ['Contact sales', '/agency/#contact'];

const navLinks = current => SECTIONS.map(([label, href]) => {
  const on = current && current.startsWith(href);
  return `          <a href="${href}"${on ? ' class="nav-link on" aria-current="page"' : ' class="nav-link"'}>${label}</a>`;
}).join('\n');

// `current` is a path like '/agency/'. The active link is DERIVED from it rather than
// passed in as a flag, so a page can never forget to say where it is and two pages in
// the same section can never disagree.
export const navFor = (current = null) => {
  const cta = (current && CTA[current]) || CTA_DEFAULT;
  return `  <!-- shared-chrome:nav -->
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
        <a href="${cta[1]}" class="nav-cta">${cta[0]}</a>
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
        <a href="/" class="brand"><img src="/logo-256.png" alt="" width="24" height="24"><span>ProtoQuiz</span></a>
        <p>Protocol training for EMS. Built by a working paramedic.</p>
      </div>
      <div class="foot-col">
        <h2>Product</h2>
        <a href="/app/">iOS app</a>
        <a href="/app/#faq">Android</a>
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
