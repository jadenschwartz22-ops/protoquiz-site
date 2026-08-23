#!/usr/bin/env node
// ProtoQuiz reach graphic, second pass.
//
// What changed from gen-reach-creative.mjs and why:
//   - Real brand type. The old one fell back to Helvetica because it never
//     loaded a webfont. Inter + JetBrains Mono are the site's actual faces and
//     headless Chrome will fetch them, which is most of the "why does this look
//     generic" answer on its own.
//   - Brand-correct color. #06050a is warm near-black, not the cold #010102 the
//     mockups used. Amber #ffb000 is the only accent.
//   - The logo is recolored, not pasted. The stock mark is a blue Star of Life;
//     that blue (#025EB0) appears nowhere else in the brand, which is why it read
//     as clip art dropped onto the canvas. Here the SVG paths are refilled from
//     brand tokens at build time.
//   - Density is kept. Real city names with real counts are the proof; stripping
//     them for minimalism left anonymous dots that argue nothing.
//
//   node scripts/gen-reach-v2.mjs --look terminal
//   node scripts/gen-reach-v2.mjs --look ledger --stats studying,states,pages
//   node scripts/gen-reach-v2.mjs --look signal --headline-text "A|B|Hook"
//   node scripts/gen-reach-v2.mjs --all          # every look, for comparison
//
// Out: share/v2/<look>.{html,png}
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const STATS = path.join(ROOT, 'data/reach-stats.json');
const INDEX = path.join(ROOT, 'index.html');
const OUTDIR = path.join(ROOT, 'share/v2');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = {
  bg: '#06050a',
  panel: '#100d08',
  ink: '#f4f1ea',
  soft: '#a8a399',
  muted: '#6f6a60',
  line: '#1c1a14',
  amber: '#ffb000',
  amberDim: '#7a5a00',
};

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const SANS = `'Inter',system-ui,-apple-system,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nf = n => Number(n || 0).toLocaleString('en-US');
const kfmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n ?? 0));

const FIELDS = {
  uploads:   { label: 'uploads',   pick: s => nf(s.totalUploads) },
  protocols: { label: 'protocols', pick: s => nf(s.distinctProtocols) },
  studying:  { label: 'studying',  pick: s => nf(s.activeStudiers) },
  medics:    { label: 'medics',    pick: s => nf(s.activeStudiers) },
  states:    { label: 'states',    pick: s => nf(s.statesRepresented) },
  countries: { label: 'countries', pick: s => nf(s.countriesRepresented) },
  pages:     { label: 'pages',     pick: s => kfmt(s.pagesProcessed) },
};
const DEFAULT_STATS = 'uploads,states,protocols,pages';

const HEADLINES = {
  studying: ['{studying} medics are studying', 'their own EMS protocols.', 'Are you?'],
  country:  ['Real protocols. Real medics.', 'Across {states} states.', 'Are you?'],
  none:     null,
};

const fillTokens = (line, stats) => line.replace(/\{(\w+)\}/g, (m, k) =>
  FIELDS[k] ? FIELDS[k].pick(stats) : m);

// geofacet's us_state_grid1 (7 rows x 11 cols). Vendored so the render never
// depends on the network; regenerate from hafen/grid-designer if it ever moves.
async function readGrid() {
  const csv = await fs.readFile(path.join(ROOT, 'scripts/data/us-state-grid.csv'), 'utf8');
  const [head, ...lines] = csv.trim().split('\n');
  const keys = head.split(',');
  return lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [keys[i], v])));
}

async function readStates() {
  const idx = await fs.readFile(INDEX, 'utf8');
  const start = idx.indexOf('<svg class="reach-svg"');
  const block = idx.slice(start, idx.indexOf('</svg>', start));
  return [...block.matchAll(/<path class="(state[^"]*)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => ({ st: (m[1].match(/\bs-([a-z]{2})\b/) || [])[1]?.toUpperCase() || null, d: m[2] }));
}

// The shipped mark is a blue Star of Life over a black backing plate. Neither the
// blue nor the plate belongs on a brand canvas, so pull the three paths apart and
// refill them: star in `star`, book/rod in `book`, outline dropped entirely.
async function markSVG({ size = 64 }) {
  // logo-mark.svg is the social-safe copy: brand-recolored, transparent, and with
  // the trace's outline layer dropped (it duplicated the artwork rather than
  // outlining it). bimi-logo.svg is left alone -- BIMI needs its opaque square.
  const raw = await fs.readFile(path.join(ROOT, 'logo-mark.svg'), 'utf8');
  return raw.replace('<svg ', `<svg style="display:block" `)
            .replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`);
}

// Greedy de-collision in MAP units (959x593 viewBox), hottest first so the
// biggest numbers always win their space. A label that cannot fit is dropped,
// but its dot stays -- no data point is lost to crowding.
function placeLabels(locales, { minLabel = 8, zones = [], chw = 6.4, lh = 14 } = {}) {
  const placed = [], boxes = [];
  for (const l of [...locales].sort((a, b) => b.count - a.count)) {
    if (l.count < minLabel) continue;
    if (zones.some(z => l.x >= z.x0 && l.x <= z.x1 && l.y >= z.y0 && l.y <= z.y1)) continue;
    const text = `${l.city} ${l.count}`;
    const w = text.length * chw;
    const right = l.x < 520;
    // The gap has to clear the dot itself, whose radius grows with the count --
    // a fixed gap let the biggest markers sit under their own label.
    const gap = 5.5 + Math.sqrt(l.count) * 1.2;
    const tx = right ? l.x + gap : l.x - gap;
    const y = l.y + 3.2;
    const box = {
      x0: (right ? tx : tx - w) - 2, x1: (right ? tx + w : tx) + 2,
      y0: y - lh * 0.72, y1: y + lh * 0.28,
    };
    if (box.x0 < -60 || box.x1 > 1020) continue;
    if (boxes.some(b => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
    boxes.push(box);
    placed.push({ ...l, tx, ty: y, right, hot: l.count >= 18, warm: l.count >= 6 });
  }
  return placed;
}

const grain = `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");background-size:180px`;

const shell = (title, css, body) => `<!doctype html><meta charset="utf-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
.stage{position:relative;width:1080px;height:1080px;background:${C.bg};overflow:hidden;
  font-family:${SANS};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.grain{position:absolute;inset:0;pointer-events:none;z-index:20;opacity:.05;mix-blend-mode:overlay;${grain}}
.dots{mix-blend-mode:plus-lighter}
${css}
</style><div class="stage">${body}<div class="grain"></div></div>`;

// ---------------------------------------------------------------- looks

// TERMINAL -- the graphic as a readout. Monospace chrome, a header rule with a
// live-ish status, the map as the payload. Leans on the fact that the audience
// is technical enough to read a log and the product is genuinely a pipeline.
function lookTerminal({ stats, states, labels, mark, fields, headline }) {
  const statePaths = states.map(({ st, d }) => {
    const n = stats.byState?.[st] || 0;
    const cls = n >= 18 ? 'st hot' : n >= 6 ? 'st warm' : n > 0 ? 'st on' : 'st';
    return `<path class="${cls}" d="${d}"/>`;
  }).join('');
  const dots = labels.map(l => {
    const r = 2.0 + Math.sqrt(l.count) * 1.15;
    return `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="${C.amber}" opacity=".92"/>`;
  }).join('');
  const allDots = stats.locales.map(l => {
    const r = 1.6 + Math.sqrt(l.count) * 1.05;
    return `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="${C.amber}" opacity="${l.count >= 6 ? .95 : .6}"/>`;
  }).join('');
  const names = labels.map(l => {
    const anchor = l.right ? 'start' : 'end';
    const col = l.hot ? C.ink : l.warm ? '#cdc7bb' : C.soft;
    return `<text x="${l.tx}" y="${l.ty}" text-anchor="${anchor}" class="rl" fill="${col}">${esc(l.city)} <tspan fill="${C.amber}" dx="2">${l.count}</tspan></text>`;
  }).join('');

  const head = headline ? `<div class="head">
    ${headline.map((ln, i) => `<div class="hl${i === headline.length - 1 ? ' hook' : ''}">${esc(ln)}</div>`).join('')}
  </div>` : '';

  const cells = fields.map(f => `<div class="cell"><div class="cv">${FIELDS[f].pick(stats)}</div><div class="cl">${FIELDS[f].label}</div></div>`).join('');

  const css = `
  .bar{position:absolute;top:0;left:0;right:0;height:52px;border-bottom:1px solid ${C.line};
    display:flex;align-items:center;padding:0 40px;gap:14px;font-family:${MONO};font-size:12px;
    letter-spacing:.02em;color:${C.muted}}
  .dot{width:6px;height:6px;border-radius:50%;background:${C.amber};box-shadow:0 0 0 3px rgba(255,176,0,.14)}
  .bar .sp{margin-left:auto}
  .head{position:absolute;top:104px;left:40px;right:40px}
  .hl{font-size:52px;font-weight:600;letter-spacing:-.028em;line-height:1.1;color:${C.ink}}
  .hl.hook{color:${C.amber}}
  .map{position:absolute;top:290px;left:24px;right:24px;height:600px}
  .st{fill:#0a0906;stroke:${C.line};stroke-width:1;vector-effect:non-scaling-stroke}
  .st.on{fill:rgba(255,176,0,.030);stroke:#2a261b}
  .st.warm{fill:rgba(255,176,0,.058);stroke:#3a3320}
  .st.hot{fill:rgba(255,176,0,.088);stroke:#4a3f24}
  .rl{font-family:${MONO};font-size:11.5px;font-weight:500;letter-spacing:.01em;
    paint-order:stroke fill;stroke:${C.bg};stroke-width:3.5px;stroke-linejoin:round}
  .foot{position:absolute;left:40px;right:40px;bottom:38px;display:flex;align-items:flex-end;gap:28px}
  .lock{display:flex;align-items:center;gap:12px}
  .wm{font-size:21px;font-weight:600;letter-spacing:-.02em;color:${C.ink}}
  .cells{margin-left:auto;display:flex;gap:0}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.06em;color:${C.muted};padding-top:7px}`;

  const body = `
  <div class="bar"><span class="dot"></span><span>protoquiz · reach</span>
    <span class="sp">${new Date(stats.generatedAt).toISOString().slice(0, 10)}</span></div>
  ${head}
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths}</g><g class="dots">${allDots}</g><g>${names}</g></svg></div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
    <div class="cells">${cells}</div></div>`;
  return shell('terminal', css, body);
}

// LEDGER -- the claim carries it, the map is evidence underneath. Big editorial
// type, a hairline table of states down the side, map quiet and wide.
function lookLedger({ stats, states, labels, mark, fields, headline }) {
  const statePaths = states.map(({ st, d }) => {
    const n = stats.byState?.[st] || 0;
    const cls = n > 0 ? 'st on' : 'st';
    return `<path class="${cls}" d="${d}"/>`;
  }).join('');
  const allDots = stats.locales.map(l => {
    const r = 1.7 + Math.sqrt(l.count) * 1.25;
    return `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="${C.amber}" opacity="${l.count >= 6 ? 1 : .62}"/>`;
  }).join('');
  const names = labels.slice(0, 12).map(l => {
    const anchor = l.right ? 'start' : 'end';
    return `<text x="${l.tx}" y="${l.ty}" text-anchor="${anchor}" class="rl" fill="${C.soft}">${esc(l.city)} <tspan fill="${C.amber}" dx="2">${l.count}</tspan></text>`;
  }).join('');

  const top = Object.entries(stats.byState || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rows = top.map(([st, n]) => `<div class="row"><span>${st}</span><b>${n}</b></div>`).join('');
  const cells = fields.map(f => `<div class="cell"><div class="cv">${FIELDS[f].pick(stats)}</div><div class="cl">${FIELDS[f].label}</div></div>`).join('');

  const css = `
  .head{position:absolute;top:78px;left:52px;right:52px}
  .kick{font-family:${MONO};font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:${C.muted};padding-bottom:22px}
  .hl{font-size:58px;font-weight:600;letter-spacing:-.032em;line-height:1.08;color:${C.ink}}
  .hl.hook{color:${C.amber}}
  .map{position:absolute;top:330px;left:8px;right:200px;height:520px}
  .st{fill:none;stroke:#191712;stroke-width:1;vector-effect:non-scaling-stroke}
  .st.on{stroke:#2b2619}
  .rl{font-family:${MONO};font-size:11px;font-weight:500;
    paint-order:stroke fill;stroke:${C.bg};stroke-width:3.5px;stroke-linejoin:round}
  .side{position:absolute;right:52px;top:360px;width:132px}
  .sh{font-family:${MONO};font-size:10px;letter-spacing:.1em;text-transform:uppercase;
    color:${C.muted};padding-bottom:10px;border-bottom:1px solid ${C.line}}
  .row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;
    border-bottom:1px solid ${C.line};font-family:${MONO};font-size:12.5px;color:${C.soft}}
  .row b{color:${C.amber};font-weight:500}
  .foot{position:absolute;left:52px;right:52px;bottom:44px;display:flex;align-items:flex-end}
  .lock{display:flex;align-items:center;gap:12px}
  .wm{font-size:20px;font-weight:600;letter-spacing:-.02em;color:${C.ink}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 20px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:27px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${C.muted};padding-top:6px}`;

  const head = headline ? `<div class="head"><div class="kick">protocol coverage · united states</div>
    ${headline.map((ln, i) => `<div class="hl${i === headline.length - 1 ? ' hook' : ''}">${esc(ln)}</div>`).join('')}</div>` : '';

  const body = `${head}
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths}</g><g class="dots">${allDots}</g><g>${names}</g></svg></div>
  <div class="side"><div class="sh">top states</div>${rows}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
    <div class="cells">${cells}</div></div>`;
  return shell('ledger', css, body);
}

// SIGNAL -- closest to the ad that already works, rebuilt correctly. Dense
// labels, warm-lit states, but real type, restrained accent, and a mark that
// belongs to the palette.
function lookSignal({ stats, states, labels, mark, fields, headline }) {
  const statePaths = states.map(({ st, d }) => {
    const n = stats.byState?.[st] || 0;
    const cls = n >= 18 ? 'st hot' : n >= 6 ? 'st warm' : n > 0 ? 'st on' : 'st';
    return `<path class="${cls}" d="${d}"/>`;
  }).join('');
  const allDots = stats.locales.map(l => {
    const r = 1.8 + Math.sqrt(l.count) * 1.15;
    return `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="${C.amber}" opacity="${l.count >= 6 ? .98 : .66}"/>`;
  }).join('');
  const names = labels.map(l => {
    const anchor = l.right ? 'start' : 'end';
    const col = l.hot ? C.ink : l.warm ? '#c6c0b4' : C.soft;
    return `<text x="${l.tx}" y="${l.ty}" text-anchor="${anchor}" class="rl" fill="${col}">${esc(l.city)} <tspan fill="${C.amber}" dx="2">${l.count}</tspan></text>`;
  }).join('');
  const cells = fields.map(f => `<div class="cell"><div class="cv">${FIELDS[f].pick(stats)}</div><div class="cl">${FIELDS[f].label}</div></div>`).join('');

  const head = headline ? `<div class="head">
    ${headline.map((ln, i) => `<div class="hl${i === headline.length - 1 ? ' hook' : ''}">${esc(ln)}</div>`).join('')}</div>` : '';

  const css = `
  .head{position:absolute;top:72px;left:56px;right:56px}
  .hl{font-size:50px;font-weight:600;letter-spacing:-.03em;line-height:1.12;color:${C.ink}}
  .hl.hook{color:${C.amber}}
  .map{position:absolute;top:250px;left:20px;right:20px;height:610px}
  .st{fill:#0a0906;stroke:#1a1813;stroke-width:1;vector-effect:non-scaling-stroke}
  .st.on{fill:rgba(255,176,0,.028);stroke:#2b2619}
  .st.warm{fill:rgba(255,176,0,.055);stroke:#3d3524}
  .st.hot{fill:rgba(255,176,0,.085);stroke:#514428}
  .rl{font-family:${MONO};font-size:11.5px;font-weight:500;
    paint-order:stroke fill;stroke:${C.bg};stroke-width:3.6px;stroke-linejoin:round}
  .foot{position:absolute;left:56px;right:56px;bottom:44px;display:flex;align-items:center}
  .lock{display:flex;align-items:center;gap:13px}
  .wm{font-size:22px;font-weight:600;letter-spacing:-.022em;color:${C.ink}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 21px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:29px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.07em;color:${C.muted};padding-top:6px}`;

  const body = `${head}
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths}</g><g class="dots">${allDots}</g><g>${names}</g></svg></div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
    <div class="cells">${cells}</div></div>`;
  return shell('signal', css, body);
}


// TILE -- a state grid instead of a geographic map. Every state gets equal area,
// so the read is "how much of the country" rather than "how big is Texas", and
// it sidesteps the MAUP problem that makes filled choropleths misleading. This
// is the most-verified pattern in the survey (geofacet / NPR-style hex maps).
function lookTile({ stats, grid, mark, fields, headline }) {
  const counts = stats.byState || {};
  const max = Math.max(...Object.values(counts), 1);
  const cells = grid.map(g => {
    const n = counts[g.code] || 0;
    const t = n / max;
    // Four discrete steps read as a legend; a continuous ramp reads as mush.
    const step = n === 0 ? 0 : t > .6 ? 4 : t > .3 ? 3 : t > .12 ? 2 : 1;
    return `<div class="t s${step}" style="grid-row:${g.row};grid-column:${g.col}">
      <span class="tc">${g.code}</span>${n ? `<span class="tn">${n}</span>` : ''}</div>`;
  }).join('');

  const head = headline ? `<div class="head">
    ${headline.map((ln, i) => `<div class="hl${i === headline.length - 1 ? ' hook' : ''}">${esc(ln)}</div>`).join('')}</div>` : '';
  const statCells = fields.map(f => `<div class="cell"><div class="cv">${FIELDS[f].pick(stats)}</div><div class="cl">${FIELDS[f].label}</div></div>`).join('');

  const css = `
  .head{position:absolute;top:76px;left:56px;right:56px}
  .hl{font-size:50px;font-weight:600;letter-spacing:-.03em;line-height:1.12;color:${C.ink}}
  .hl.hook{color:${C.amber}}
  .grid{position:absolute;top:290px;left:56px;right:56px;
    display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(7,84px);gap:8px}
  .t{border-radius:10px;position:relative;display:flex;flex-direction:column;
    align-items:flex-start;justify-content:space-between;padding:10px 11px;
    background:#0b0a07;border:1px solid #201d16}
  .tc{font-family:${MONO};font-size:12px;font-weight:500;letter-spacing:.04em;color:#585245}
  .tn{font-size:22px;font-weight:600;letter-spacing:-.02em;color:${C.ink};line-height:1}
  .t.s1{background:rgba(255,176,0,.05);border-color:rgba(255,176,0,.13)}
  .t.s1 .tc{color:#6a6252}
  .t.s2{background:rgba(255,176,0,.10);border-color:rgba(255,176,0,.22)}
  .t.s2 .tc{color:#8a8070}
  .t.s3{background:rgba(255,176,0,.19);border-color:rgba(255,176,0,.36)}
  .t.s3 .tc{color:#a89a80}
  .t.s4{background:rgba(255,176,0,.30);border-color:rgba(255,176,0,.55)}
  .t.s4 .tc{color:#c4b494}
  .t.s4 .tn{color:#fff}
  .foot{position:absolute;left:56px;right:56px;bottom:44px;display:flex;align-items:center}
  .lock{display:flex;align-items:center;gap:13px}
  .wm{font-size:22px;font-weight:600;letter-spacing:-.022em;color:${C.ink}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 21px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:29px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.07em;color:${C.muted};padding-top:6px}`;

  const body = `${head}<div class="grid">${cells}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
    <div class="cells">${statCells}</div></div>`;
  return shell('tile', css, body);
}

const LOOKS = { terminal: lookTerminal, ledger: lookLedger, signal: lookSignal, tile: lookTile };

// ---------------------------------------------------------------- main

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = k => argv.includes(`--${k}`);

const main = async () => {
  const stats = JSON.parse(await fs.readFile(STATS, 'utf8'));
  const states = await readStates();
  const grid = await readGrid();
  const mark = await markSVG({ size: 58 });

  const fields = arg('stats', DEFAULT_STATS).split(',').map(s => s.trim()).filter(f => FIELDS[f]);
  if (!fields.length) throw new Error('no valid --stats fields');

  const htext = arg('headline-text');
  const hkey = arg('headline', 'studying');
  let headline = htext ? htext.split('|') : HEADLINES[hkey];
  if (headline) headline = headline.map(l => fillTokens(l, stats));

  const looks = has('all') ? Object.keys(LOOKS) : [arg('look', 'signal')];
  await fs.mkdir(OUTDIR, { recursive: true });

  for (const look of looks) {
    if (!LOOKS[look]) throw new Error(`unknown --look ${look}; try ${Object.keys(LOOKS).join('|')}`);
    // Headline occupies the top band; those cities keep their dot, lose their name.
    const zones = headline ? [{ x0: -50, x1: 640, y0: -50, y1: 40 }] : [];
    const labels = placeLabels(stats.locales, { minLabel: Number(arg('min-label', 6)), zones });
    const html = LOOKS[look]({ stats, states, grid, labels, mark, fields, headline });
    const hp = path.join(OUTDIR, `${look}.html`);
    await fs.writeFile(hp, html);
    if (!has('html-only')) {
      await run(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=1', `--screenshot=${path.join(OUTDIR, `${look}.png`)}`,
        '--window-size=1080,1080', '--virtual-time-budget=9000', hp]);
    }
    console.log(`${look}: ${labels.length} labels -> share/v2/${look}.png`);
  }
};

main().catch(e => { console.error(e.message); process.exit(1); });
