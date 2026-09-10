// scripts/apply-chrome.mjs — swaps a hand-written page's private nav/footer for the
// shared chrome. Run once per page; idempotent (re-running replaces the shared block).
//
//   node scripts/apply-chrome.mjs <file> [current-section-path]
//
// It replaces the FIRST <header>...</header> and the LAST <footer>...</footer>, injects
// CHROME_HEAD before the page's own stylesheet, and leaves the body alone. Bodies are
// deliberately not redesigned: /agency keeps its cream editorial look.
import { readFileSync, writeFileSync } from 'node:fs';
import { navFor, FOOTER_HTML, CHROME_HEAD, assetHash } from './shared-chrome.mjs';

const [file, section = null] = process.argv.slice(2);
if (!file) { console.error('usage: apply-chrome.mjs <file> [section]'); process.exit(1); }

let html = readFileSync(file, 'utf8');
const before = html;
const NAV = navFor(section);

// 1. head: chrome.css must load BEFORE the page's own stylesheet so the page still
//    wins the cascade for its own body.
// An existing chrome.css link is re-stamped with the current content hash. Without this
// a token change ships to returning visitors as a stale file, and tokens failing to
// resolve is not a degraded page, it is an unusable one.
html = html.replace(/href="\/assets\/chrome\.css(\?v=[a-f0-9]+)?"/g,
  `href="/assets/chrome.css?v=${assetHash('assets/chrome.css')}"`);

if (!html.includes('/assets/chrome.css')) {
  const firstCss = html.search(/<link[^>]+rel="stylesheet"/);
  const styleTag = html.search(/<style[\s>]/);
  const at = firstCss > -1 ? firstCss : (styleTag > -1 ? styleTag : html.indexOf('</head>'));
  if (at < 0) { console.error(`${file}: no <head> anchor found`); process.exit(1); }
  const lineStart = html.lastIndexOf('\n', at) + 1;
  html = html.slice(0, lineStart) + CHROME_HEAD + '\n' + html.slice(lineStart);
}

// 2. nav: replace an existing shared block, else the first <header>...</header>.
if (html.includes('<!-- shared-chrome:nav -->')) {
  html = html.replace(/  <!-- shared-chrome:nav -->[\s\S]*?<!-- \/shared-chrome:nav -->/, NAV);
} else {
  const m = html.match(/[ \t]*<header[\s>][\s\S]*?<\/header>/);
  if (!m) { console.error(`${file}: no <header> to replace`); process.exit(1); }
  html = html.replace(m[0], NAV);
}

// 3. footer: replace an existing shared block, else the LAST <footer>...</footer>.
if (html.includes('<!-- shared-chrome:footer -->')) {
  html = html.replace(/  <!-- shared-chrome:footer -->[\s\S]*?<!-- \/shared-chrome:footer -->/, FOOTER_HTML);
} else {
  const all = [...html.matchAll(/[ \t]*<footer[\s>][\s\S]*?<\/footer>/g)];
  if (all.length) {
    const last = all[all.length - 1];
    html = html.slice(0, last.index) + FOOTER_HTML + html.slice(last.index + last[0].length);
  } else {
    html = html.replace(/([ \t]*)<\/body>/, `${FOOTER_HTML}\n$1</body>`);
  }
}

if (html === before) { console.log(`  unchanged  ${file}`); process.exit(0); }
writeFileSync(file, html);
console.log(`  chromed    ${file}${section ? ` (${section})` : ''}`);
