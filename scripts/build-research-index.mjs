#!/usr/bin/env node
// Builds /research/findings/: the index of the four findings pages (doses, carry, changes,
// practice), so each has a front door in the Research sub-nav. Titles and descriptions are
// read from the built pages themselves, so a rebuilt page's numbers reach this index.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD, seoHead, assetHash } from './shared-chrome.mjs';

const FINDINGS = [
  ['/research/doses/', 'Same call, different dose'],
  ['/research/carry/', 'Where agencies split'],
  ['/research/changes/', 'What changed between editions'],
  ['/research/practice/', 'Who decides: standing order or physician call'],
];
const meta = p => {
  const h = readFileSync(`${p.slice(1)}index.html`, 'utf8');
  return h.match(/name="description" content="([^"]*)"/)?.[1] ?? '';
};
const TITLE = 'Findings - ProtoQuiz Research';
const DESC = 'Four comparisons drawn from the US EMS Protocol Census: doses, what agencies carry, what changed between editions, and who decides.';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${TITLE}</title>
  <meta name="description" content="${DESC}">
  <link rel="canonical" href="https://protoquiz.com/research/findings/">
${seoHead({ path: '/research/findings/', name: 'Findings', title: TITLE, desc: DESC })}
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css?v=${assetHash('assets/research.css')}">
  <style>
    .fx{max-width:1080px;margin:0 auto;padding:20px 24px 56px;box-sizing:border-box}
    .fx h1{font-size:clamp(2rem,5vw,3rem);letter-spacing:-.03em;margin:0 0 8px;line-height:1.05}
    .fx .lede{margin:0 0 26px;max-width:640px}
    .fx ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .fx a.card{display:block;height:100%;box-sizing:border-box;padding:18px 20px;border:1px solid var(--rule);border-radius:10px;background:#fff;color:inherit;text-decoration:none}
    .fx a.card:hover,.fx a.card:focus-visible{border-color:var(--ink)}
    .fx .card b{display:block;font-size:1.125rem;letter-spacing:-.01em;margin-bottom:6px}
    .fx .card span{display:block;font-size:.9rem;line-height:1.5;color:var(--muted)}
    .fx .card em{display:block;margin-top:10px;font-style:normal;font-size:.85rem;font-weight:600;color:var(--link)}
    .fx a:not(.card){color:var(--link)}
    .fx .more{margin:26px 0 0;font-size:.9rem;color:var(--muted)}
    @media (max-width:700px){.fx ul{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${navFor('/research/')}
${researchBar('/research/findings/')}
  <main id="main" class="fx">
    <h1>Findings</h1>
    <p class="lede">What the protocol census shows when you put agencies side by side. Each page is drawn from published protocols, and the method is on <a href="/census/methodology/">the methodology page</a>.</p>
    <ul>
${FINDINGS.map(([p, t]) => `      <li><a class="card" href="${p}"><b>${t}</b><span>${meta(p)}</span><em>Open &rarr;</em></a></li>`).join('\n')}
    </ul>
    <p class="more">Looking for a place instead? <a href="/research/atlas/">911 coverage by county</a> or <a href="/census/#states">the census by state</a>.</p>
  </main>
${FOOTER_HTML}
</body>
</html>
`;
mkdirSync('research/findings', { recursive: true });
writeFileSync('research/findings/index.html', html);
console.log(`wrote research/findings/index.html, ${html.length} bytes`);
