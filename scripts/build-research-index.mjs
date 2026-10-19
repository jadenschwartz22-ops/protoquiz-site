#!/usr/bin/env node
// Builds /research/findings/: the index of the four findings pages (doses, carry, changes,
// practice), so each has a front door in the Research sub-nav. Titles and descriptions are
// read from the built pages themselves, so a rebuilt page's numbers reach this index.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD, seoHead, assetHash } from './shared-chrome.mjs';

const FINDINGS = [
  ['/research/doses/', 'Same call, different dose', 'Doses'],
  ['/research/carry/', 'Where agencies split', 'What agencies carry'],
  ['/research/changes/', 'What changed between editions', 'Over time'],
  ['/research/practice/', 'Who decides: standing order or physician call', 'Authority'],
];
const meta = p => {
  const h = readFileSync(`${p.slice(1)}index.html`, 'utf8');
  return h.match(/name="description" content="([^"]*)"/)?.[1] ?? '';
};
// Advocacy articles are read from the blog index so a new monthly piece appears here on
// the next run of this script, with no list to keep in step.
const advocacy = readFileSync('blog/index.html', 'utf8').split('<div class="post-card ').slice(1)
  .filter(b => b.includes('data-category="advocacy"')).map(b => ({
    href: b.match(/href="(posts\/[^"]+)"/)[1],
    title: b.match(/<h3><a[^>]*>([^<]+)</)[1],
    img: b.match(/<img src="([^"]+)" alt="([^"]*)"/).slice(1, 3),
    excerpt: b.match(/class="excerpt">([^<]+)</)[1],
    meta: [...b.match(/class="meta-right">\s*<span>([^<]+)<\/span>[\s\S]*?<span>([^<]+)<\/span>/).slice(1, 3)],
  }));
const TITLE = 'Findings - ProtoQuiz Research';
const DESC = 'Four comparisons drawn from the US EMS Protocol Census, plus the long-form advocacy articles that put the data to work.';

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
    .fx h2{font-size:1.25rem;letter-spacing:-.01em;margin:40px 0 4px}
    .fx .sub{margin:0 0 16px;max-width:640px;font-size:.95rem;color:var(--muted)}
    .fx .tag{display:block;margin-bottom:8px;font:600 .7rem/1 var(--mono,ui-monospace,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    .fx .adv a.card{display:grid;grid-template-columns:240px 1fr;gap:20px;padding:0;overflow:hidden}
    .fx .adv img{width:100%;height:100%;min-height:170px;object-fit:cover;display:block}
    .fx .adv .txt{padding:18px 20px 18px 0}
    .fx .adv ul{grid-template-columns:1fr}
    .fx .read{margin:36px 0 0;padding:16px 20px;border-left:3px solid var(--rule);font-size:.9rem;line-height:1.55;color:var(--muted);max-width:720px}
    @media (max-width:700px){.fx ul{grid-template-columns:1fr}.fx .adv a.card{grid-template-columns:1fr}.fx .adv .txt{padding:0 20px 18px}.fx .adv img{min-height:0;aspect-ratio:16/9}}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${navFor('/research/')}
${researchBar('/research/findings/')}
  <main id="main" class="fx">
    <h1>Findings</h1>
    <p class="lede">What the protocol census shows when you put agencies side by side, and the articles that use it. Every page is drawn from published protocols; the method is on <a href="/census/methodology/">the methodology page</a>.</p>

    <h2>From the census</h2>
    <p class="sub">Four comparisons, each rebuilt from source and quoted from the page it was found on.</p>
    <ul>
${FINDINGS.map(([p, t, tag]) => `      <li><a class="card" href="${p}"><span class="tag">${tag}</span><b>${t}</b><span>${meta(p)}</span><em>Open &rarr;</em></a></li>`).join('\n')}
    </ul>
${advocacy.length ? `
    <h2>Advocacy</h2>
    <p class="sub">Long-form articles, one a month, where the census and public sources become an argument. Every claim is footnoted to a source we opened.</p>
    <div class="adv"><ul>
${advocacy.map(a => `      <li><a class="card" href="/blog/${a.href}"><img src="/blog/${a.img[0]}" alt="${a.img[1]}" loading="lazy"><span class="txt"><span class="tag">${a.meta.join(' &middot; ')}</span><b>${a.title}</b><span>${a.excerpt}</span><em>Read the article &rarr;</em></span></a></li>`).join('\n')}
    </ul></div>
    <p class="more"><a href="/blog/">All blog articles</a></p>` : ''}

    <p class="read"><strong>How to read these.</strong> Every count is &ldquo;of the protocol books we have read&rdquo;, not of the country. Agencies in the census are the ones that publish readable protocols, which is not a random sample of American EMS.</p>
    <p class="more">Looking for a place instead? <a href="/research/atlas/">911 coverage by county</a> or <a href="/census/#states">the census by state</a>.</p>
  </main>
${FOOTER_HTML}
</body>
</html>
`;
mkdirSync('research/findings', { recursive: true });
writeFileSync('research/findings/index.html', html);
console.log(`wrote research/findings/index.html, ${html.length} bytes`);
