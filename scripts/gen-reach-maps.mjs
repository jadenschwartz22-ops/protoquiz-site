#!/usr/bin/env node
// Map directions for the reach graphic -- fixing the map instead of avoiding it.
//
// Two things were actually wrong before, and neither was "maps are dated":
//
//  1. The long tail. 78 of 98 cities have fewer than 5 uploads, so the canvas
//     filled with tiny dots that carry no signal and read as noise. The fix is
//     hierarchy: the top cities get named and sized, the tail becomes quiet
//     ambient texture rather than competing for the same attention.
//  2. The logo was a 52px afterthought in a corner. At 200px the mark actually
//     holds up -- the spectacled snake reading a book has real character. It is
//     the brand, so it gets to be present.
//
//   node scripts/gen-reach-maps.mjs          # all + contact sheet
//   node scripts/gen-reach-maps.mjs --only glow
//
// Out: share/maps/<name>.png and share/maps/index.html
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUTDIR = path.join(ROOT, 'share/maps');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = {
  bg: '#06050a', panel: '#100d08', ink: '#f4f1ea', soft: '#a8a399',
  muted: '#6f6a60', line: '#1c1a14', amber: '#ffb000',
};
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const SANS = `'Inter',system-ui,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,Menlo,monospace`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nf = n => Number(n || 0).toLocaleString('en-US');
const kfmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n ?? 0));

const grainCSS = `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");background-size:180px`;

const page = (css, body) => `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}
.stage{position:relative;width:1080px;height:1080px;background:${C.bg};overflow:hidden;
 font-family:${SANS};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.grain{position:absolute;inset:0;z-index:30;pointer-events:none;opacity:.05;mix-blend-mode:overlay;${grainCSS}}
.dots{mix-blend-mode:plus-lighter}
${css}</style><div class="stage">${body}<div class="grain"></div></div>`;

async function loadMark(size) {
  const raw = await fs.readFile(path.join(ROOT, 'logo-mark.svg'), 'utf8');
  return raw.replace('<svg ', '<svg style="display:block" ')
            .replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`);
}
async function loadStates() {
  const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const s = idx.indexOf('<svg class="reach-svg"');
  const b = idx.slice(s, idx.indexOf('</svg>', s));
  return [...b.matchAll(/<path class="(state[^"]*)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => ({ st: (m[1].match(/\bs-([a-z]{2})\b/) || [])[1]?.toUpperCase() || null, d: m[2] }));
}

// Hierarchy, not uniformity: only the top cities earn a name. Everything else
// stays on the map as texture so the footprint is honest, but it stops shouting.
function placeLabels(locales, { top = 10, zones = [], chw = 6.6, lh = 15 } = {}) {
  const ranked = [...locales].sort((a, b) => b.count - a.count).slice(0, top);
  const placed = [], boxes = [];
  for (const l of ranked) {
    if (zones.some(z => l.x >= z.x0 && l.x <= z.x1 && l.y >= z.y0 && l.y <= z.y1)) continue;
    const w = `${l.city} ${l.count}`.length * chw;
    const right = l.x < 520;
    const gap = 7 + Math.sqrt(l.count) * 1.35;
    const tx = right ? l.x + gap : l.x - gap;
    const y = l.y + 3.4;
    const box = {
      x0: (right ? tx : tx - w) - 3, x1: (right ? tx + w : tx) + 3,
      y0: y - lh * .72, y1: y + lh * .28,
    };
    if (box.x0 < -50 || box.x1 > 1010) continue;
    if (boxes.some(b => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
    boxes.push(box);
    placed.push({ ...l, tx, ty: y, right });
  }
  return placed;
}

// Shared map body. `tail` renders the sub-threshold cities as ambient texture.
function mapSVG({ stats, states, labels, opts = {} }) {
  const { stateFill = true, tailOpacity = .38, nameSize = 12.5 } = opts;
  const counts = stats.byState || {};
  const paths = states.map(({ st, d }) => {
    const n = counts[st] || 0;
    const fill = !stateFill ? 'transparent'
      : n >= 18 ? 'rgba(255,176,0,.085)' : n >= 6 ? 'rgba(255,176,0,.052)'
      : n > 0 ? 'rgba(255,176,0,.026)' : '#0a0906';
    const stroke = n > 0 ? 'rgba(255,176,0,.16)' : '#191712';
    return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join('');

  const named = new Set(labels.map(l => l.city));
  const tail = stats.locales.filter(l => !named.has(l.city)).map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${1.3 + Math.sqrt(l.count) * .8}"
      fill="${C.amber}" opacity="${tailOpacity}"/>`).join('');
  const lead = labels.map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${2.6 + Math.sqrt(l.count) * 1.25}" fill="${C.amber}"/>`).join('');
  const names = labels.map(l =>
    `<text x="${l.tx}" y="${l.ty}" text-anchor="${l.right ? 'start' : 'end'}"
      style="font-family:${MONO};font-size:${nameSize}px;font-weight:500;
      paint-order:stroke fill;stroke:${C.bg};stroke-width:4px;stroke-linejoin:round"
      fill="${C.ink}">${esc(l.city)}<tspan fill="${C.amber}" dx="6">${l.count}</tspan></text>`).join('');

  return `<svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${paths}</g><g class="dots">${tail}${lead}</g><g>${names}</g></svg>`;
}

// ============================================================ looks

// BRANDED -- the map done right, with the logo at real scale as a co-lead.
// Mark and wordmark sit top-left as a proper lockup, not a footer credit.
function branded({ stats, states, markLg }) {
  const labels = placeLabels(stats.locales, { top: 11, zones: [{ x0: -50, x1: 560, y0: -50, y1: 60 }] });
  const css = `
  .top{position:absolute;top:64px;left:64px;right:64px;display:flex;align-items:center;gap:20px}
  .wm{font-size:44px;font-weight:700;letter-spacing:-.028em;color:${C.ink};line-height:1}
  .tag{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:${C.muted};padding-top:7px}
  .hl{position:absolute;top:210px;left:64px;right:64px;font-size:46px;font-weight:600;
    letter-spacing:-.03em;line-height:1.14;color:${C.ink}}
  .hl b{color:${C.amber};font-weight:600}
  .map{position:absolute;top:330px;left:14px;right:14px;height:590px}
  .foot{position:absolute;left:64px;right:64px;bottom:52px;display:flex;align-items:flex-end}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}`;
  const body = `
  <div class="top">${markLg}<div><div class="wm">ProtoQuiz</div>
    <div class="tag">study your own protocols</div></div></div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics are studying their own<br>EMS protocols in <b>${stats.statesRepresented}</b> states.</div>
  <div class="map">${mapSVG({ stats, states, labels })}</div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// EMBLEM -- the mark is the hero. Big logo up top, map below as the evidence.
// Closest to "this is our brand, here is our reach".
function emblem({ stats, states, markXL }) {
  const labels = placeLabels(stats.locales, { top: 10 });
  const css = `
  .crest{position:absolute;top:70px;left:0;right:0;display:flex;flex-direction:column;
    align-items:center;gap:16px}
  .wm{font-size:40px;font-weight:700;letter-spacing:-.026em;color:${C.ink}}
  .rule{width:64px;height:1px;background:${C.line}}
  .hl{position:absolute;top:330px;left:80px;right:80px;text-align:center;font-size:34px;
    font-weight:500;letter-spacing:-.024em;line-height:1.3;color:${C.soft}}
  .hl b{color:${C.ink};font-weight:600}
  .hl em{color:${C.amber};font-style:normal;font-weight:600}
  .map{position:absolute;top:430px;left:20px;right:20px;height:500px}
  .foot{position:absolute;left:64px;right:64px;bottom:50px;display:flex;align-items:center;
    justify-content:center;gap:0}
  .cell{padding:0 26px;border-left:1px solid ${C.line};text-align:center}
  .cell:first-child{border-left:0}
  .cv{font-size:27px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.07em;color:${C.muted};padding-top:6px}`;
  const body = `
  <div class="crest">${markXL}<div class="wm">ProtoQuiz</div><div class="rule"></div></div>
  <div class="hl"><b>${nf(stats.activeStudiers)} medics</b> studying their own<br>EMS protocols across <em>${stats.statesRepresented} states</em>.</div>
  <div class="map">${mapSVG({ stats, states, labels, opts: { nameSize: 12 } })}</div>
  <div class="foot">
   <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
   <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
   <div class="cell"><div class="cv">${stats.statesRepresented}</div><div class="cl">states</div></div>
   <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
  </div>`;
  return page(css, body);
}

// OUTLINE -- no state fills at all. The dots draw the country themselves, with
// only a whisper of border. Quietest and most confident of the map treatments.
function outline({ stats, states, markLg }) {
  const labels = placeLabels(stats.locales, { top: 12, zones: [{ x0: -50, x1: 540, y0: -50, y1: 50 }] });
  const css = `
  .top{position:absolute;top:62px;left:64px;right:64px;display:flex;align-items:center;gap:18px}
  .wm{font-size:40px;font-weight:700;letter-spacing:-.028em;color:${C.ink};line-height:1}
  .kick{position:absolute;top:186px;left:64px;font-family:${MONO};font-size:12px;
    letter-spacing:.14em;text-transform:uppercase;color:${C.muted}}
  .hl{position:absolute;top:218px;left:64px;right:64px;font-size:52px;font-weight:600;
    letter-spacing:-.032em;line-height:1.1;color:${C.ink}}
  .hl b{color:${C.amber}}
  .map{position:absolute;top:340px;left:6px;right:6px;height:600px}
  .foot{position:absolute;left:64px;right:64px;bottom:54px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:29px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top">${markLg}<div class="wm">ProtoQuiz</div></div>
  <div class="kick">protocol coverage · united states</div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics. <b>${stats.statesRepresented}</b> states.<br>Their own protocols.</div>
  <div class="map">${mapSVG({ stats, states, labels, opts: { stateFill: false, tailOpacity: .45 } })}</div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}


// PURE -- dots only, no city names at all. Removes the label-collision problem
// entirely and lets the dot field read as a shape rather than a list. Size still
// encodes volume, so the hierarchy survives without a single word on the map.
function pure({ stats, states, markLg }) {
  const counts = stats.byState || {};
  const paths = states.map(({ st, d }) => {
    const n = counts[st] || 0;
    return `<path d="${d}" fill="${n ? 'rgba(255,176,0,.035)' : '#0a0906'}"
      stroke="${n ? 'rgba(255,176,0,.15)' : '#191712'}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  // No names means the dots can carry more weight without crowding anything.
  const dots = [...stats.locales].sort((a, b) => a.count - b.count).map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${2.2 + Math.sqrt(l.count) * 1.5}"
      fill="${C.amber}" opacity="${l.count >= 10 ? 1 : l.count >= 4 ? .8 : .58}"/>`).join('');

  const css = `
  .top{position:absolute;top:64px;left:64px;right:64px;display:flex;align-items:center;gap:20px}
  .wm{font-size:44px;font-weight:700;letter-spacing:-.028em;color:${C.ink};line-height:1}
  .tag{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:${C.muted};padding-top:7px}
  .hl{position:absolute;top:212px;left:64px;right:64px;font-size:48px;font-weight:600;
    letter-spacing:-.03em;line-height:1.12;color:${C.ink}}
  .hl b{color:${C.amber};font-weight:600}
  .map{position:absolute;top:322px;left:10px;right:10px;height:600px}
  .foot{position:absolute;left:64px;right:64px;bottom:52px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top">${markLg}<div><div class="wm">ProtoQuiz</div>
    <div class="tag">study your own protocols</div></div></div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics studying their own<br>EMS protocols in <b>${stats.statesRepresented}</b> states.</div>
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${paths}</g><g class="dots">${dots}</g></svg></div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// PURE-OUTLINE -- same dots-only idea with no state fills. The dot field alone
// has to carry the country's shape.
function pureOutline({ stats, states, markLg }) {
  const counts = stats.byState || {};
  const paths = states.map(({ st, d }) =>
    `<path d="${d}" fill="transparent" stroke="${(counts[st] || 0) ? '#282318' : '#161410'}"
      stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
  const dots = [...stats.locales].sort((a, b) => a.count - b.count).map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${2.4 + Math.sqrt(l.count) * 1.6}"
      fill="${C.amber}" opacity="${l.count >= 10 ? 1 : l.count >= 4 ? .82 : .6}"/>`).join('');
  const css = `
  .top{position:absolute;top:64px;left:64px;right:64px;display:flex;align-items:center;gap:20px}
  .wm{font-size:44px;font-weight:700;letter-spacing:-.028em;color:${C.ink};line-height:1}
  .tag{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:${C.muted};padding-top:7px}
  .hl{position:absolute;top:212px;left:64px;right:64px;font-size:48px;font-weight:600;
    letter-spacing:-.03em;line-height:1.12;color:${C.ink}}
  .hl b{color:${C.amber};font-weight:600}
  .map{position:absolute;top:322px;left:10px;right:10px;height:600px}
  .foot{position:absolute;left:64px;right:64px;bottom:52px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top">${markLg}<div><div class="wm">ProtoQuiz</div>
    <div class="tag">study your own protocols</div></div></div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics studying their own<br>EMS protocols in <b>${stats.statesRepresented}</b> states.</div>
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${paths}</g><g class="dots">${dots}</g></svg></div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

const LOOKS = { pure, pureOutline, branded, emblem, outline };

// ============================================================ main

const argv = process.argv.slice(2);
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 && argv[i + 1] ? argv[i + 1].split(',') : null; })();

const main = async () => {
  const stats = JSON.parse(await fs.readFile(path.join(ROOT, 'data/reach-stats.json'), 'utf8'));
  const states = await loadStates();
  const markLg = await loadMark(84);
  const markXL = await loadMark(148);
  await fs.mkdir(OUTDIR, { recursive: true });

  const names = only || Object.keys(LOOKS);
  for (const n of names) {
    if (!LOOKS[n]) throw new Error(`unknown look ${n}`);
    const html = LOOKS[n]({ stats, states, markLg, markXL });
    const hp = path.join(OUTDIR, `${n}.html`);
    await fs.writeFile(hp, html);
    await run(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--screenshot=${path.join(OUTDIR, `${n}.png`)}`,
      '--window-size=1080,1080', '--virtual-time-budget=9000', hp]);
    console.log(`  ${n}`);
  }

  const NOTES = {
    branded: 'Logo + wordmark as a real lockup up top, claim, then the map. Logo is a co-lead, not a credit.',
    emblem:  'The mark is the hero at 148px, centred crest. Map below as the evidence.',
    outline: 'No state fills — the dots draw the country. Quietest, most confident.',
    pure:    'Dots only, no city names. The field reads as a shape; size still encodes volume.',
    pureOutline: 'Dots only, no state fills either. The dot field alone carries the country.',
  };
  const sheet = `<!doctype html><meta charset="utf-8"><title>ProtoQuiz reach — map directions</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0908;font-family:${SANS};color:${C.ink};padding:56px 40px 90px}
h1{font-size:26px;font-weight:600;letter-spacing:-.025em;padding-bottom:6px}
.sub{font-family:${MONO};font-size:12px;color:${C.muted};letter-spacing:.04em;padding-bottom:40px}
.wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:36px;max-width:1560px;margin:0 auto}
figure{background:#0f0e0c;border:1px solid #1e1b16;border-radius:16px;overflow:hidden}
img{width:100%;display:block;background:${C.bg}}
figcaption{padding:16px 20px 20px}
.nm{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${C.amber};padding-bottom:7px}
.ds{font-size:14.5px;line-height:1.5;color:${C.soft}}
.hdr{max-width:1560px;margin:0 auto}</style>
<div class="hdr"><h1>Reach graphic — map directions</h1>
<div class="sub">${nf(stats.activeStudiers)} studying · ${nf(stats.totalUploads)} uploads · ${stats.statesRepresented} states · live data ${new Date(stats.generatedAt).toISOString().slice(0, 10)}</div></div>
<div class="wrap">${names.map(n => `<figure><img src="${n}.png" alt="${n}">
<figcaption><div class="nm">${n}</div><div class="ds">${esc(NOTES[n] || '')}</div></figcaption></figure>`).join('')}</div>`;
  await fs.writeFile(path.join(OUTDIR, 'index.html'), sheet);
  console.log(`\nsheet: share/maps/index.html`);
};

main().catch(e => { console.error(e); process.exit(1); });
