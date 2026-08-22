#!/usr/bin/env node
// Regenerates the ProtoQuiz map creative -- the 1080x1080 look that runs as a
// Reddit ad -- from LIVE data instead of whatever was baked in when it was made.
//
// The look is NOT reimplemented here: the CSS, the leader-line label treatment,
// and the layout are lifted from creatives/map-campaign/_render, and the page is
// rendered by headless Chrome. That matters -- the previous attempt hand-computed
// text positions into raw SVG and never matched, because real browser layout and
// font hinting are doing most of the work.
//
//   node scripts/gen-reach-creative.mjs                  # square 1080
//   node scripts/gen-reach-creative.mjs --preset portrait
//   node scripts/gen-reach-creative.mjs --html-only      # skip the PNG render
//
// Out: share/creative-reach-<preset>.{html,png}
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const STATS = path.join(ROOT, 'data/reach-stats.json');
const INDEX = path.join(ROOT, 'index.html');
const OUTDIR = path.join(ROOT, 'share');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PRESETS = {
  square:    { w: 1080, h: 1080, mapTop: 205, mapH: 680, headSize: 48 },
  portrait:  { w: 1080, h: 1350, mapTop: 250, mapH: 760, headSize: 52 },
  landscape: { w: 1200, h: 628,  mapTop: 120, mapH: 380, headSize: 34 },
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nf = n => Number(n || 0).toLocaleString('en-US');
const kfmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n ?? 0));

// State outlines come from the live page, so the creative can never drift from
// the map on protoquiz.com.
async function readStates() {
  const idx = await fs.readFile(INDEX, 'utf8');
  const start = idx.indexOf('<svg class="reach-svg"');
  const block = idx.slice(start, idx.indexOf('</svg>', start));
  return [...block.matchAll(/<path class="(state[^"]*)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => ({ st: (m[1].match(/\bs-([a-z]{2})\b/) || [])[1]?.toUpperCase() || null, d: m[2] }));
}

async function logoDataURI() {
  const b = await fs.readFile(path.join(ROOT, 'logo-256.png'));
  return `data:image/png;base64,${b.toString('base64')}`;
}

// Greedy de-collision in MAP units (the 959x593 viewBox). Hottest first, so the
// biggest numbers always win their space; a label that cannot fit is dropped but
// its dot stays, so no data point is ever lost to crowding.
function placeLabels(locales) {
  const CH = 7.3, LH = 15;           // measured advance/leading at 12.5px mono
  const placed = [], boxes = [];
  for (const l of [...locales].sort((a, b) => b.count - a.count)) {
    const hot = l.count >= 20, warm = l.count >= 5;
    const ch = hot || warm ? 8.6 : CH;
    const text = `${l.city.toUpperCase()} ${l.count}`;
    const w = text.length * ch;
    // Prefer the side with more room; east-coast density means most go left.
    const right = l.x < 520;
    const gap = 9;
    const tx = right ? l.x + gap : l.x - gap;
    const y = l.y + 3.5;
    const box = {
      x0: (right ? tx : tx - w) - 2, x1: (right ? tx + w : tx) + 2,
      y0: y - LH * 0.72, y1: y + LH * 0.28,
    };
    if (box.x0 < -70 || box.x1 > 1030) continue;
    if (boxes.some(b => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
    boxes.push(box);
    placed.push({ ...l, tx, ty: y, anchor: right ? 'start' : 'end', right, cls: hot ? 'rl-hot' : warm ? 'rl-warm' : '' });
  }
  return placed;
}

function buildHTML({ stats, states, labels, logo, preset }) {
  const P = PRESETS[preset];
  const byState = stats.byState || {};
  const maxSt = Math.max(1, ...Object.values(byState));

  const statePaths = states.map(({ st, d }) => {
    const n = st ? (byState[st] || 0) : 0;
    const cls = !n ? 'state' : n >= maxSt * 0.4 ? 'state lit warm' : 'state lit';
    return `<path class="${cls}" d="${d}"/>`;
  }).join('');

  const dots = labels.map(l => {
    const r = l.count >= 20 ? 5 : l.count >= 5 ? 4 : 3;
    const halo = l.count >= 20 ? 10 : 8;
    const lx = l.right ? l.tx - 2 : l.tx + 2;
    return `<g class="locale"><circle class="halo" cx="${l.x}" cy="${l.y}" r="${halo}"/>`
         + `<circle class="core" cx="${l.x}" cy="${l.y}" r="${r}"/>`
         + `<line class="lead" x1="${l.x}" y1="${l.y}" x2="${lx}" y2="${l.y}"/>`
         + `<text class="rl ${l.cls}" x="${l.tx}" y="${l.ty}" text-anchor="${l.anchor}">`
         + `${esc(l.city.toUpperCase())} <tspan class="rl-n">${l.count}</tspan></text></g>`;
  }).join('');

  // Locales that lost their label still get a dot — density is the message.
  const labeled = new Set(labels.map(l => `${l.x},${l.y}`));
  const bare = stats.locales.filter(l => !labeled.has(`${l.x},${l.y}`))
    .map(l => `<g class="locale"><circle class="halo" cx="${l.x}" cy="${l.y}" r="7"/>`
             + `<circle class="core" cx="${l.x}" cy="${l.y}" r="2.6"/></g>`).join('');

  const S = [
    [nf(stats.totalUploads), 'UPLOADS'],
    [nf(stats.statesRepresented), 'STATES'],
    [nf(stats.distinctProtocols), 'PROTOCOLS'],
    [kfmt(stats.pagesProcessed), 'PAGES'],
  ].map(([b, i]) => `<div><b>${esc(b)}</b><i>${esc(i)}</i></div>`).join('');

  return `<!doctype html><html><head><meta charset=utf8><style>
:root{--amber:#ffb000;--bg:#06050a;--ink:#f4f1ea;--ink-soft:#b4afa4;--muted:#8a8478}
*{margin:0;box-sizing:border-box}html,body{width:${P.w}px;height:${P.h}px;overflow:hidden}
.ad{width:${P.w}px;height:${P.h}px;background:var(--bg);position:relative;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:var(--ink)}
.head{position:absolute;top:42px;left:60px;right:60px;font-weight:800;font-size:${P.headSize}px;line-height:1.16}.head .hl{color:var(--amber)}
.map{position:absolute;left:12px;right:12px;top:${P.mapTop}px;height:${P.mapH}px;width:${P.w - 24}px}
.state{fill:transparent;stroke:#4a453c;stroke-width:1.1;vector-effect:non-scaling-stroke}
.state.lit{fill:rgba(255,176,0,.08);stroke:rgba(255,176,0,.55);stroke-width:1.4}
.state.lit.warm{fill:rgba(255,176,0,.15);stroke:rgba(255,176,0,.8);stroke-width:1.6}
.locale circle.core{fill:var(--amber)}.locale circle.halo{fill:none;stroke:var(--amber);stroke-width:1.2;opacity:.45}
.lead{stroke:#6e675a;stroke-width:.8}
.rl{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;letter-spacing:.01em;fill:var(--ink-soft);text-transform:uppercase;font-weight:600;paint-order:stroke fill;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round}
.rl-warm{font-size:15px;font-weight:800;fill:var(--ink)}
.rl-hot{font-size:17px;font-weight:800;fill:var(--ink)}
.rl .rl-n{fill:var(--amber);font-weight:800}
.stats{position:absolute;bottom:64px;left:560px;right:60px;display:flex;justify-content:space-between;text-align:center}
.stats b{color:var(--amber);font-size:50px;font-weight:800;display:block;line-height:1}
.stats i{color:var(--muted);font-size:16px;letter-spacing:.12em;font-style:normal;font-weight:700}
.brand{position:absolute;bottom:52px;left:60px;display:flex;align-items:center;gap:20px}
.brand img{width:150px;height:150px}.brand .wm{font-weight:800;font-size:44px;letter-spacing:2px}
</style></head><body><div class="ad">
<div class="head"><div>${nf(stats.activeStudiers)} medics are studying</div><div>their EMS protocols.</div><div><span class=hl>Are you?</span></div></div>
<svg viewBox="0 0 959 593" preserveAspectRatio="xMidYMid meet" class="map">
<g class="states">${statePaths}</g>
<g class="dots">${bare}${dots}</g>
</svg>
<div class="brand"><img src="${logo}"><span class="wm">PROTOQUIZ</span></div>
<div class="stats">${S}</div>
</div></body></html>
`;
}

const main = async () => {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1]; };
  const presets = arg('preset', null) ? [arg('preset', null)] : ['square'];

  const stats = JSON.parse(await fs.readFile(STATS, 'utf8'));
  const [states, logo] = await Promise.all([readStates(), logoDataURI()]);
  const labels = placeLabels(stats.locales);
  await fs.mkdir(OUTDIR, { recursive: true });

  for (const preset of presets) {
    if (!PRESETS[preset]) throw new Error(`unknown preset "${preset}"`);
    const { w, h } = PRESETS[preset];
    const base = path.join(OUTDIR, `creative-reach-${preset}`);
    await fs.writeFile(`${base}.html`, buildHTML({ stats, states, labels, logo, preset }));

    if (!argv.includes('--html-only')) {
      await run(CHROME, [
        '--headless', '--disable-gpu', '--hide-scrollbars',
        `--screenshot=${base}.png`, `--window-size=${w},${h}`,
        '--default-background-color=00000000', `file://${base}.html`,
      ]).catch(e => { if (!/^$/.test(e.stderr || '')) return; throw e; });
    }
    console.log(`${path.relative(ROOT, base)}.png  ${w}x${h}  ${labels.length} labels`);
  }
  console.log(`\n${nf(stats.totalUploads)} uploads / ${stats.statesRepresented} states / ${nf(stats.activeStudiers)} studying`);
  console.log(`stats generated ${stats.generatedAt}`);
};

main().catch(e => { console.error(e.message); process.exit(1); });
