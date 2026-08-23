#!/usr/bin/env node
// Energy pass on the reach map. `pure` is calm and correct but inert; these are
// four different ANSWERS to "make it exciting", not four intensities of the same
// one -- so there is a real choice rather than a slider.
//
//   surge    scale. One number huge behind the map; the map is the texture.
//   pulse    depth. Concentric rings on the top cities: implied motion in a still.
//   world    scope. Melbourne, Auckland, Vancouver, Calgary -- 3 countries, not 42 states.
//   growth   time. The claim is the trajectory, not the snapshot.
//
// Deliberately NOT doing: outer glow on every dot, vignettes, drop shadows. That
// was the earlier mistake -- additive effects on a static idea read as dated,
// not energetic. Excitement here comes from scale, contrast and what is claimed.
//
//   node scripts/gen-reach-energy.mjs           # all + sheet
//   node scripts/gen-reach-energy.mjs --only surge
//
// Out: share/energy/<name>.png and share/energy/index.html
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUTDIR = path.join(ROOT, 'share/energy');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = {
  bg: '#06050a', panel: '#100d08', ink: '#f4f1ea', soft: '#a8a399',
  muted: '#6f6a60', line: '#1c1a14', amber: '#ffb000', warm: '#ff7a00',
};
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap';
const SANS = `'Inter',system-ui,sans-serif`;
const MONO = `'JetBrains Mono',ui-monospace,Menlo,monospace`;

const totalCountries = s => (s.countriesRepresented || 0) + 1; // +1 for the US, which byCountry excludes
const nf = n => Number(n || 0).toLocaleString('en-US');
const kfmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n ?? 0));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const grainCSS = `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");background-size:180px`;

const page = (css, body) => `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}
.stage{position:relative;width:1080px;height:1080px;background:${C.bg};overflow:hidden;
 font-family:${SANS};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.grain{position:absolute;inset:0;z-index:40;pointer-events:none;opacity:.05;mix-blend-mode:overlay;${grainCSS}}
.dots{mix-blend-mode:plus-lighter}
.lock{display:flex;align-items:center;gap:15px}
.wm{font-size:30px;font-weight:700;letter-spacing:-.026em;color:${C.ink};line-height:1}
${css}</style><div class="stage">${body}<div class="grain"></div></div>`;

async function loadMark(size) {
  const b = await fs.readFile(path.join(ROOT, 'share/logo-2000-transparent.png'));
  return `<img src="data:image/png;base64,${b.toString('base64')}" width="${size}" height="${size}" style="display:block">`;
}
async function loadStates() {
  const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const s = idx.indexOf('<svg class="reach-svg"');
  const b = idx.slice(s, idx.indexOf('</svg>', s));
  return [...b.matchAll(/<path class="(state[^"]*)"[^>]*?\sd="([^"]+)"/g)]
    .map(m => ({ st: (m[1].match(/\bs-([a-z]{2})\b/) || [])[1]?.toUpperCase() || null, d: m[2] }));
}
// The world outline lives in index.html too, as .landmass paths.
async function loadWorld() {
  const idx = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
  const s = idx.indexOf('<svg class="reach-svg-world"');
  if (s < 0) return null;
  const b = idx.slice(s, idx.indexOf('</svg>', s));
  const vb = (b.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 950 620';
  const paths = [...b.matchAll(/<path[^>]*class="[^"]*landmass[^"]*"[^>]*?\sd="([^"]+)"/g)].map(m => m[1]);
  return paths.length ? { vb, paths } : null;
}

const usDots = (locales, { rBase = 2.2, rScale = 1.5 } = {}) =>
  [...locales].sort((a, b) => a.count - b.count).map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${rBase + Math.sqrt(l.count) * rScale}"
      fill="${C.amber}" opacity="${l.count >= 10 ? 1 : l.count >= 4 ? .8 : .58}"/>`).join('');

const statePaths = (states, counts, { fill = true } = {}) => states.map(({ st, d }) => {
  const n = counts[st] || 0;
  return `<path d="${d}" fill="${!fill ? 'transparent' : n ? 'rgba(255,176,0,.035)' : '#0a0906'}"
    stroke="${n ? 'rgba(255,176,0,.15)' : '#191712'}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}).join('');

// ============================================================ looks

// SURGE -- excitement from SCALE. The number is set enormous and the map runs
// behind it, so the eye lands on 338 first and then discovers the footprint.
function surge({ stats, states, mark }) {
  const css = `
  .map{position:absolute;top:250px;left:-70px;right:-70px;height:700px;opacity:.85}
  .top{position:absolute;top:56px;left:60px;right:60px;display:flex;align-items:center;z-index:6}
  .n{position:absolute;top:150px;left:52px;right:52px;text-align:center;
    font-size:392px;font-weight:800;letter-spacing:-.055em;line-height:.82;color:${C.ink};z-index:5}
  .cap{position:absolute;top:568px;left:60px;right:60px;text-align:center;font-size:41px;
    font-weight:600;letter-spacing:-.028em;line-height:1.22;color:${C.ink};z-index:6}
  .cap em{font-style:normal;color:${C.amber}}
  .foot{position:absolute;left:60px;right:60px;bottom:52px;display:flex;align-items:flex-end;z-index:6}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:700;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths(states, stats.byState || {})}</g>
    <g class="dots">${usDots(stats.locales, { rBase: 2.1, rScale: 1.4 })}</g></svg></div>
  <div class="top"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div></div>
  <div class="n">${nf(stats.activeStudiers)}</div>
  <div class="cap">medics studying their own<br>EMS protocols in <em>${stats.statesRepresented} states</em>.</div>
  <div class="foot"><div class="lock" style="gap:0"><span style="font-family:${MONO};font-size:13px;color:${C.soft};letter-spacing:.04em">protoquiz.com</span></div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${nf(stats.distinctProtocols)}</div><div class="cl">protocols</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// PULSE -- excitement from IMPLIED MOTION. Concentric rings radiate off the
// biggest cities, the way a live dashboard shows an active node. Reads as a
// system that is running right now rather than a chart of the past.
function pulse({ stats, states, mark }) {
  const top = [...stats.locales].sort((a, b) => b.count - a.count).slice(0, 6);
  const rings = top.map((l, i) => {
    const r = 3 + Math.sqrt(l.count) * 1.5;
    // Three rings per node, each fainter and wider -- a still frame of a pulse.
    return [1.9, 3.1, 4.6].map((m, j) =>
      `<circle cx="${l.x}" cy="${l.y}" r="${(r * m).toFixed(1)}" fill="none"
        stroke="${C.amber}" stroke-width="${(1.5 - j * .35).toFixed(2)}"
        opacity="${(.42 - j * .12).toFixed(2)}"/>`).join('');
  }).join('');
  const css = `
  .top{position:absolute;top:60px;left:62px;right:62px;display:flex;align-items:center}
  .tag{font-family:${MONO};font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:${C.muted};margin-left:auto;display:flex;align-items:center;gap:9px}
  .live{width:7px;height:7px;border-radius:50%;background:${C.amber};
    box-shadow:0 0 0 4px rgba(255,176,0,.16)}
  .hl{position:absolute;top:186px;left:62px;right:62px;font-size:54px;font-weight:700;
    letter-spacing:-.034em;line-height:1.08;color:${C.ink}}
  .hl b{color:${C.amber}}
  .map{position:absolute;top:330px;left:8px;right:8px;height:600px}
  .foot{position:absolute;left:62px;right:62px;bottom:50px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:31px;font-weight:700;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div>
    <div class="tag"><span class="live"></span>live</div></div>
  <div class="hl"><b>${nf(stats.activeStudiers)}</b> medics are studying<br>their own EMS protocols.</div>
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths(states, stats.byState || {})}</g>
    <g>${rings}</g>
    <g class="dots">${usDots(stats.locales)}</g></svg></div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${stats.statesRepresented}</div><div class="cl">states</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// WORLD -- excitement from SCOPE. The US map undersells it: there are medics in
// Melbourne, Auckland, Vancouver and Calgary. "3 countries" is the bigger claim,
// and the reveal that this escaped the US is the interesting part.
function world({ stats, states, worldGeo, mark }) {
  const intl = stats.internationalLocales || [];
  const body_ = worldGeo
    ? `<svg viewBox="${worldGeo.vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <g>${worldGeo.paths.map(d => `<path d="${d}" fill="#0b0a07" stroke="#1d1b15"
          stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}</g>
        <g class="dots">
          <circle cx="195" cy="205" r="26" fill="${C.amber}" opacity=".9"/>
          ${[1.7, 2.6].map((m, j) => `<circle cx="195" cy="205" r="${26 * m}" fill="none"
            stroke="${C.amber}" stroke-width="${1.4 - j * .4}" opacity="${.34 - j * .12}"/>`).join('')}
          ${intl.map(l => `<circle cx="${l.x}" cy="${l.y}" r="${7 + Math.sqrt(l.count) * 3}"
            fill="${C.amber}" opacity=".92"/>`).join('')}
        </g>
        <g>${intl.map(l => {
          const right = l.x < 500;
          return `<text x="${right ? l.x + 16 : l.x - 16}" y="${l.y + 4}"
            text-anchor="${right ? 'start' : 'end'}"
            style="font-family:${MONO};font-size:15px;font-weight:500;paint-order:stroke fill;
            stroke:${C.bg};stroke-width:4px;stroke-linejoin:round" fill="${C.ink}">${esc(l.city.split(',')[0])}</text>`;
        }).join('')}
        <text x="195" y="262" text-anchor="middle" style="font-family:${MONO};font-size:15px;
          font-weight:500;paint-order:stroke fill;stroke:${C.bg};stroke-width:4px" fill="${C.ink}">United States <tspan fill="${C.amber}">${nf(stats.totalUploads - (stats.internationalUploads || 0))}</tspan></text></g>
      </svg>`
    : `<svg viewBox="0 0 959 593" width="100%" height="100%"><g>${statePaths(states, stats.byState || {})}</g>
       <g class="dots">${usDots(stats.locales)}</g></svg>`;
  const css = `
  .top{position:absolute;top:60px;left:62px;right:62px;display:flex;align-items:center}
  .hl{position:absolute;top:184px;left:62px;right:62px;font-size:56px;font-weight:700;
    letter-spacing:-.034em;line-height:1.08;color:${C.ink}}
  .hl b{color:${C.amber}}
  .sub{position:absolute;top:320px;left:62px;right:62px;font-size:21px;font-weight:400;
    color:${C.soft};letter-spacing:-.01em}
  .map{position:absolute;top:368px;left:0;right:0;height:560px}
  .foot{position:absolute;left:62px;right:62px;bottom:50px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:31px;font-weight:700;letter-spacing:-.025em;color:${C.amber};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div></div>
  <div class="hl"><b>${totalCountries(stats)}</b> countries. <b>${stats.statesRepresented}</b> states.<br>One protocol library each.</div>
  <div class="sub">It stopped being a US thing.</div>
  <div class="map">${body_}</div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.activeStudiers)}</div><div class="cl">studying</div></div>
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${kfmt(stats.pagesProcessed)}</div><div class="cl">pages</div></div>
   </div></div>`;
  return page(css, body);
}

// GROWTH -- excitement from TIME. A snapshot is inert; a trajectory is not. The
// map stays as evidence but the headline claims momentum.
// NOTE: the bar row is illustrative of the CURRENT total only -- there is no
// historical series in reach-stats.json. Wire real history before publishing
// anything that implies a trend.
function growth({ stats, states, mark }) {
  const css = `
  .top{position:absolute;top:60px;left:62px;right:62px;display:flex;align-items:center}
  .hl{position:absolute;top:180px;left:62px;right:62px;font-size:58px;font-weight:700;
    letter-spacing:-.035em;line-height:1.06;color:${C.ink}}
  .hl b{color:${C.amber}}
  .big{position:absolute;top:330px;left:62px;display:flex;align-items:baseline;gap:18px}
  .bn{font-size:150px;font-weight:800;letter-spacing:-.05em;color:${C.amber};line-height:.86}
  .bl{font-size:23px;font-weight:500;color:${C.soft};letter-spacing:-.012em;max-width:290px;line-height:1.3}
  .map{position:absolute;top:470px;left:6px;right:6px;height:490px;opacity:.92}
  .foot{position:absolute;left:62px;right:62px;bottom:50px;display:flex;align-items:flex-end}
  .site{font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.soft}}
  .cells{margin-left:auto;display:flex}
  .cell{padding:0 22px;border-left:1px solid ${C.line};text-align:right}
  .cell:first-child{border-left:0}
  .cv{font-size:30px;font-weight:700;letter-spacing:-.025em;color:${C.ink};line-height:1}
  .cl{font-family:${MONO};font-size:10.5px;letter-spacing:.07em;color:${C.muted};padding-top:7px}`;
  const body = `
  <div class="top"><div class="lock">${mark}<div class="wm">ProtoQuiz</div></div></div>
  <div class="hl">Every one of these pages<br>was somebody's <b>next shift</b>.</div>
  <div class="big"><div class="bn">${kfmt(stats.pagesProcessed)}</div>
    <div class="bl">pages of real protocol, turned into questions.</div></div>
  <div class="map"><svg viewBox="0 0 959 593" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <g>${statePaths(states, stats.byState || {})}</g>
    <g class="dots">${usDots(stats.locales, { rBase: 2, rScale: 1.35 })}</g></svg></div>
  <div class="foot"><div class="site">protoquiz.com</div>
   <div class="cells">
    <div class="cell"><div class="cv">${nf(stats.activeStudiers)}</div><div class="cl">studying</div></div>
    <div class="cell"><div class="cv">${nf(stats.totalUploads)}</div><div class="cl">uploads</div></div>
    <div class="cell"><div class="cv">${stats.statesRepresented}</div><div class="cl">states</div></div>
   </div></div>`;
  return page(css, body);
}

const LOOKS = { surge, pulse, world, growth };

// ============================================================ main

const argv = process.argv.slice(2);
const only = (() => { const i = argv.indexOf('--only'); return i >= 0 && argv[i + 1] ? argv[i + 1].split(',') : null; })();

const main = async () => {
  const stats = JSON.parse(await fs.readFile(path.join(ROOT, 'data/reach-stats.json'), 'utf8'));
  const states = await loadStates();
  const worldGeo = await loadWorld();
  const mark = await loadMark(62);
  await fs.mkdir(OUTDIR, { recursive: true });
  if (!worldGeo) console.log('  (no world geometry found in index.html; world falls back to US)');

  const names = only || Object.keys(LOOKS);
  for (const n of names) {
    if (!LOOKS[n]) throw new Error(`unknown look ${n}`);
    const hp = path.join(OUTDIR, `${n}.html`);
    await fs.writeFile(hp, LOOKS[n]({ stats, states, worldGeo, mark }));
    await run(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--screenshot=${path.join(OUTDIR, `${n}.png`)}`,
      '--window-size=1080,1080', '--virtual-time-budget=9000', hp]);
    console.log(`  ${n}`);
  }

  const NOTES = {
    surge:  'SCALE. 338 at 392px, map running behind it. Eye lands on the number, then finds the footprint.',
    pulse:  'MOTION. Concentric rings off the top cities + a live dot. Reads as a system running now.',
    world:  'SCOPE. Melbourne, Auckland, Vancouver, Calgary. "3 countries" is the bigger claim.',
    growth: 'MEANING. 81.3k pages reframed as "somebody\'s next shift" — the stat with a stake in it.',
  };
  const sheet = `<!doctype html><meta charset="utf-8"><title>ProtoQuiz reach — energy</title>
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
<div class="hdr"><h1>Reach graphic — four kinds of energy</h1>
<div class="sub">${nf(stats.activeStudiers)} studying · ${nf(stats.totalUploads)} uploads · ${stats.statesRepresented} states · ${stats.countriesRepresented} countries · live ${new Date(stats.generatedAt).toISOString().slice(0, 10)}</div></div>
<div class="wrap">${names.map(n => `<figure><img src="${n}.png" alt="${n}">
<figcaption><div class="nm">${n}</div><div class="ds">${esc(NOTES[n] || '')}</div></figcaption></figure>`).join('')}</div>`;
  await fs.writeFile(path.join(OUTDIR, 'index.html'), sheet);
  console.log(`\nsheet: share/energy/index.html`);
};

main().catch(e => { console.error(e); process.exit(1); });
