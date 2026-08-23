#!/usr/bin/env node
// Wider exploration for the reach graphic, rendered to a single contact sheet.
//
// The point is range, not polish: several of these are deliberately far apart so
// there is something real to choose between. The winner gets folded into
// gen-reach-creative.mjs and this file goes away.
//
//   node scripts/gen-reach-looks.mjs            # all looks + sheet
//   node scripts/gen-reach-looks.mjs --only tile,stack
//
// Out: share/looks/<name>.png and share/looks/index.html (the sheet)
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUTDIR = path.join(ROOT, 'share/looks');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = {
  bg: '#06050a', panel: '#100d08', ink: '#f4f1ea', soft: '#a8a399',
  muted: '#6f6a60', line: '#1c1a14', amber: '#ffb000', amberDim: '#7a5a00',
};
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap';
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
.lock{display:flex;align-items:center;gap:13px}
.wm{font-size:22px;font-weight:600;letter-spacing:-.022em;color:${C.ink}}
${css}</style><div class="stage">${body}<div class="grain"></div></div>`;

async function loadMark(size) {
  const raw = await fs.readFile(path.join(ROOT, 'logo-mark.svg'), 'utf8');
  return raw.replace('<svg ', '<svg style="display:block" ')
            .replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`);
}
async function loadGrid() {
  const csv = await fs.readFile(path.join(ROOT, 'scripts/data/us-state-grid.csv'), 'utf8');
  const [h, ...ls] = csv.trim().split('\n');
  const k = h.split(',');
  return ls.map(l => Object.fromEntries(l.split(',').map((v, i) => [k[i], v])));
}
async function loadStates() {
  const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const s = idx.indexOf('<svg class="reach-svg"');
  const b = idx.slice(s, idx.indexOf('</svg>', s));
  return [...b.matchAll(/<path class="(state[^"]*)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => ({ st: (m[1].match(/\bs-([a-z]{2})\b/) || [])[1]?.toUpperCase() || null, d: m[2] }));
}

// ============================================================ looks

// TILE-XL -- the state grid, but the grid IS the graphic. No headline block
// competing for space; the numbers carry it. Bigger cells, tighter gutters.
function tileXL({ stats, grid, mark }) {
  const counts = stats.byState || {};
  const max = Math.max(...Object.values(counts), 1);
  const cells = grid.map(g => {
    const n = counts[g.code] || 0;
    const t = n / max;
    const step = n === 0 ? 0 : t > .6 ? 4 : t > .3 ? 3 : t > .12 ? 2 : 1;
    return `<div class="t s${step}" style="grid-row:${g.row};grid-column:${g.col}">
      <span class="tc">${g.code}</span>${n ? `<span class="tn">${n}</span>` : ''}</div>`;
  }).join('');
  const css = `
  .kick{position:absolute;top:64px;left:64px;font-family:${MONO};font-size:12px;
    letter-spacing:.16em;text-transform:uppercase;color:${C.muted}}
  .big{position:absolute;top:96px;left:64px;font-size:40px;font-weight:600;
    letter-spacing:-.03em;color:${C.ink}}
  .big b{color:${C.amber};font-weight:600}
  .grid{position:absolute;top:200px;left:64px;right:64px;
    display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(7,96px);gap:7px}
  .t{border-radius:12px;display:flex;flex-direction:column;justify-content:space-between;
    padding:12px 13px;background:#0b0a07;border:1px solid #201d16}
  .tc{font-family:${MONO};font-size:12.5px;font-weight:500;letter-spacing:.04em;color:#585245}
  .tn{font-size:26px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .t.s1{background:rgba(255,176,0,.05);border-color:rgba(255,176,0,.14)}
  .t.s2{background:rgba(255,176,0,.11);border-color:rgba(255,176,0,.24)}
  .t.s3{background:rgba(255,176,0,.20);border-color:rgba(255,176,0,.38)}
  .t.s4{background:rgba(255,176,0,.32);border-color:rgba(255,176,0,.58)}
  .t.s3 .tc,.t.s4 .tc{color:#c4b494}
  .t.s4 .tn{color:#fff}
  .foot{position:absolute;left:64px;right:64px;bottom:52px;display:flex;align-items:center}
  .legend{margin-left:auto;display:flex;align-items:center;gap:9px;font-family:${MONO};
    font-size:10.5px;letter-spacing:.06em;color:${C.muted}}
  .sw{width:26px;height:10px;border-radius:3px}`;
  const body = `<div class="kick">protocol uploads by state</div>
  <div class="big"><b>${nf(stats.totalUploads)}</b> uploads · <b>${stats.statesRepresented}</b> states</div>
  <div class="grid">${cells}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
   <div class="legend">less
     <span class="sw" style="background:rgba(255,176,0,.05)"></span>
     <span class="sw" style="background:rgba(255,176,0,.11)"></span>
     <span class="sw" style="background:rgba(255,176,0,.20)"></span>
     <span class="sw" style="background:rgba(255,176,0,.32)"></span>more</div></div>`;
  return page(css, body);
}

// STACK -- no map at all. The claim is the object; four numbers stacked at
// enormous scale with hairline rules. Fastest read of anything here.
function stack({ stats, mark }) {
  const rows = [
    ['medics studying their protocols', nf(stats.activeStudiers)],
    ['protocol documents uploaded', nf(stats.totalUploads)],
    ['states represented', nf(stats.statesRepresented)],
    ['pages processed', kfmt(stats.pagesProcessed)],
  ].map(([l, v], i) => `<div class="r"><span class="rl">${l}</span><span class="rv">${v}</span></div>`).join('');
  const css = `
  .kick{position:absolute;top:80px;left:72px;font-family:${MONO};font-size:12px;
    letter-spacing:.16em;text-transform:uppercase;color:${C.muted}}
  .rows{position:absolute;top:180px;left:72px;right:72px}
  .r{display:flex;align-items:baseline;justify-content:space-between;
    padding:34px 0;border-bottom:1px solid ${C.line}}
  .r:first-child{border-top:1px solid ${C.line}}
  .rl{font-size:22px;font-weight:400;color:${C.soft};letter-spacing:-.01em}
  .rv{font-size:88px;font-weight:600;letter-spacing:-.04em;color:${C.ink};line-height:.9}
  .r:first-child .rv{color:${C.amber}}
  .foot{position:absolute;left:72px;right:72px;bottom:56px;display:flex;align-items:center}
  .note{margin-left:auto;font-family:${MONO};font-size:11px;letter-spacing:.06em;color:${C.muted}}`;
  const body = `<div class="kick">protoquiz · reach</div><div class="rows">${rows}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
   <div class="note">${new Date(stats.generatedAt).toISOString().slice(0, 10)}</div></div>`;
  return page(css, body);
}

// BARS -- ranked horizontal bars. The most honest chart for "which states",
// and ranking is a story a dot map cannot tell at all.
function bars({ stats, mark }) {
  const top = Object.entries(stats.byState || {}).sort((a, b) => b[1] - a[1]).slice(0, 14);
  const max = top[0][1];
  const rows = top.map(([st, n], i) => `
    <div class="b">
      <span class="bs">${st}</span>
      <span class="bt"><span class="bf" style="width:${(n / max * 100).toFixed(1)}%"></span></span>
      <span class="bn">${n}</span>
    </div>`).join('');
  const css = `
  .kick{position:absolute;top:72px;left:72px;font-family:${MONO};font-size:12px;
    letter-spacing:.16em;text-transform:uppercase;color:${C.muted}}
  .hl{position:absolute;top:106px;left:72px;right:72px;font-size:46px;font-weight:600;
    letter-spacing:-.032em;line-height:1.1;color:${C.ink}}
  .hl b{color:${C.amber};font-weight:600}
  .bars{position:absolute;top:250px;left:72px;right:72px}
  .b{display:flex;align-items:center;gap:16px;padding:13px 0}
  .bs{font-family:${MONO};font-size:13px;font-weight:500;color:${C.soft};width:32px}
  .bt{flex:1;height:26px;background:#0d0b08;border-radius:4px;overflow:hidden}
  .bf{display:block;height:100%;background:${C.amber};border-radius:4px}
  .bn{font-size:17px;font-weight:600;color:${C.ink};width:38px;text-align:right;letter-spacing:-.02em}
  .foot{position:absolute;left:72px;right:72px;bottom:52px;display:flex;align-items:center}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 20px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:26px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${C.muted};padding-top:6px}`;
  const body = `<div class="kick">uploads by state · top 14</div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics, <b>${stats.statesRepresented}</b> states,<br>their own protocols.</div>
  <div class="bars">${rows}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
   <div class="cells">
     <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
     <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// HERO -- one number at extreme scale, map reduced to faint supporting texture.
// The most "campaign poster" of the set.
function hero({ stats, states, mark }) {
  const counts = stats.byState || {};
  const paths = states.map(({ st, d }) => {
    const n = counts[st] || 0;
    return `<path d="${d}" fill="${n ? 'rgba(255,176,0,.10)' : 'transparent'}"
      stroke="${n ? 'rgba(255,176,0,.20)' : '#141210'}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  const dots = stats.locales.map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${1.5 + Math.sqrt(l.count) * .95}" fill="${C.amber}" opacity=".75"/>`).join('');
  const css = `
  .map{position:absolute;top:300px;left:-40px;right:-40px;height:640px;opacity:.55}
  .dots{mix-blend-mode:plus-lighter}
  .kick{position:absolute;top:92px;left:72px;font-family:${MONO};font-size:12px;
    letter-spacing:.16em;text-transform:uppercase;color:${C.muted};z-index:5}
  .n{position:absolute;top:120px;left:66px;font-size:290px;font-weight:600;letter-spacing:-.05em;
    color:${C.ink};line-height:.86;z-index:5}
  .sub{position:absolute;top:430px;left:72px;right:72px;font-size:38px;font-weight:500;
    letter-spacing:-.028em;color:${C.soft};z-index:5}
  .sub b{color:${C.amber};font-weight:600}
  .foot{position:absolute;left:72px;right:72px;bottom:56px;display:flex;align-items:center;z-index:5}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 20px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:26px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${C.muted};padding-top:6px}`;
  const body = `
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${paths}</g><g class="dots">${dots}</g></svg></div>
  <div class="kick">medics studying their own ems protocols</div>
  <div class="n">${nf(stats.activeStudiers)}</div>
  <div class="sub">across <b>${stats.statesRepresented} states</b> and <b>${nf(stats.distinctProtocols)}</b> protocol sets.</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
   <div class="cells">
     <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
     <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// SPLIT -- claim owns the top third on a raised panel, tile grid below. Borrows
// the "product surface" read without letting the map float in space.
function split({ stats, grid, mark }) {
  const counts = stats.byState || {};
  const max = Math.max(...Object.values(counts), 1);
  const cells = grid.map(g => {
    const n = counts[g.code] || 0;
    const t = n / max;
    const step = n === 0 ? 0 : t > .6 ? 4 : t > .3 ? 3 : t > .12 ? 2 : 1;
    return `<div class="t s${step}" style="grid-row:${g.row};grid-column:${g.col}">
      <span class="tc">${g.code}</span>${n ? `<span class="tn">${n}</span>` : ''}</div>`;
  }).join('');
  const css = `
  .head{position:absolute;top:0;left:0;right:0;height:300px;background:${C.panel};
    border-bottom:1px solid ${C.line};padding:70px 72px 0}
  .kick{font-family:${MONO};font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;
    color:${C.muted};padding-bottom:18px}
  .hl{font-size:52px;font-weight:600;letter-spacing:-.032em;line-height:1.1;color:${C.ink}}
  .hl b{color:${C.amber}}
  .grid{position:absolute;top:352px;left:64px;right:64px;
    display:grid;grid-template-columns:repeat(11,1fr);grid-template-rows:repeat(7,78px);gap:7px}
  .t{border-radius:10px;display:flex;flex-direction:column;justify-content:space-between;
    padding:9px 10px;background:#0b0a07;border:1px solid #201d16}
  .tc{font-family:${MONO};font-size:11px;font-weight:500;letter-spacing:.04em;color:#585245}
  .tn{font-size:21px;font-weight:600;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .t.s1{background:rgba(255,176,0,.05);border-color:rgba(255,176,0,.14)}
  .t.s2{background:rgba(255,176,0,.11);border-color:rgba(255,176,0,.24)}
  .t.s3{background:rgba(255,176,0,.20);border-color:rgba(255,176,0,.38)}
  .t.s4{background:rgba(255,176,0,.32);border-color:rgba(255,176,0,.58)}
  .t.s4 .tn{color:#fff}
  .foot{position:absolute;left:72px;right:72px;bottom:48px;display:flex;align-items:center}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 20px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:25px;font-weight:600;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10px;letter-spacing:.06em;color:${C.muted};padding-top:5px}`;
  const body = `<div class="head"><div class="kick">protocol coverage · united states</div>
   <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics are studying<br>their own EMS protocols.</div></div>
  <div class="grid">${cells}</div>
  <div class="foot"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
   <div class="cells">
     <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
     <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
     <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

const LOOKS = { tileXL, split, bars, stack, hero };

// ============================================================ main

const argv = process.argv.slice(2);
const only = (() => {
  const i = argv.indexOf('--only');
  return i >= 0 && argv[i + 1] ? argv[i + 1].split(',') : null;
})();

const main = async () => {
  const stats = JSON.parse(await fs.readFile(path.join(ROOT, 'data/reach-stats.json'), 'utf8'));
  const grid = await loadGrid();
  const states = await loadStates();
  const mark = await loadMark(52);
  await fs.mkdir(OUTDIR, { recursive: true });

  const names = only || Object.keys(LOOKS);
  for (const name of names) {
    if (!LOOKS[name]) throw new Error(`unknown look ${name}`);
    const html = LOOKS[name]({ stats, grid, states, mark });
    const hp = path.join(OUTDIR, `${name}.html`);
    await fs.writeFile(hp, html);
    await run(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--screenshot=${path.join(OUTDIR, `${name}.png`)}`,
      '--window-size=1080,1080', '--virtual-time-budget=9000', hp]);
    console.log(`  ${name}`);
  }

  // The contact sheet -- all of them on one scrollable page, same scale.
  const NOTES = {
    tileXL: 'State grid as the whole graphic. Every state equal-area with its real number.',
    split:  'Claim on a raised panel, grid below. Product-surface read.',
    bars:   'Ranked bars. Tells "which states lead" — a story a dot map cannot.',
    stack:  'No map. Four numbers at scale on hairline rules. Fastest read.',
    hero:   'One number huge, map reduced to faint texture. Campaign poster.',
  };
  const sheet = `<!doctype html><meta charset="utf-8"><title>ProtoQuiz reach — directions</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0908;font-family:${SANS};color:${C.ink};padding:56px 40px 90px}
h1{font-size:26px;font-weight:600;letter-spacing:-.025em;padding-bottom:6px}
.sub{font-family:${MONO};font-size:12px;color:${C.muted};letter-spacing:.04em;padding-bottom:40px}
.wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:36px;max-width:1500px;margin:0 auto}
figure{background:#0f0e0c;border:1px solid #1e1b16;border-radius:16px;overflow:hidden}
img{width:100%;display:block;background:${C.bg}}
figcaption{padding:16px 20px 20px}
.nm{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${C.amber};padding-bottom:7px}
.ds{font-size:14.5px;line-height:1.5;color:${C.soft}}
.hdr{max-width:1500px;margin:0 auto}
</style>
<div class="hdr"><h1>Reach graphic — directions</h1>
<div class="sub">${nf(stats.activeStudiers)} studying · ${nf(stats.totalUploads)} uploads · ${stats.statesRepresented} states · live data ${new Date(stats.generatedAt).toISOString().slice(0, 10)}</div></div>
<div class="wrap">${names.map(n => `<figure><img src="${n}.png" alt="${n}">
<figcaption><div class="nm">${n}</div><div class="ds">${esc(NOTES[n] || '')}</div></figcaption></figure>`).join('')}</div>`;
  await fs.writeFile(path.join(OUTDIR, 'index.html'), sheet);
  console.log(`\nsheet: share/looks/index.html`);
};

main().catch(e => { console.error(e); process.exit(1); });
