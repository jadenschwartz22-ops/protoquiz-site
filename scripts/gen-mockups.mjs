#!/usr/bin/env node
// Four DIFFERENT design directions for the reach graphic, not four tweaks of one.
// Exists to pick a direction; the winner gets folded back into
// gen-reach-creative.mjs and this file goes away.
//
//   node scripts/gen-mockups.mjs
//
// Out: share/mockups/<name>.png
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'share/mockups');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1080;

const nf = n => Number(n || 0).toLocaleString('en-US');
const kf = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));

// Grain: what stops a large dark field reading as a fill bucket.
const GRAIN = `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" stitchTiles="stitch"/></filter>`;
const grainCSS = `.grain{position:absolute;inset:0;pointer-events:none;z-index:9;opacity:.055;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='182' height='182'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='182' height='182' filter='url(%23n)'/%3E%3C/svg%3E");background-size:182px}`;

// Shared type stack. -apple-system gets real optical sizing in headless Chrome.
const SANS = `-apple-system,"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif`;

const load = async () => JSON.parse(await fs.readFile('/tmp/mock-data.json', 'utf8'));

// ---------------------------------------------------------------- direction 1
// CONSTELLATION -- no landmass at all. The dots draw the country. Additive
// blending so overlap earns its brightness instead of a per-dot glow.
function constellation({ paths, locales, stats }) {
  const outline = paths.map(d => `<path d="${d}" fill="none" stroke="#1c1e24" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
  const dots = locales.map(l => {
    const r = 2.2 + Math.sqrt(l.count) * 1.5;
    return `<circle cx="${l.x}" cy="${l.y}" r="${r}" fill="#ffb000" opacity="${l.count >= 10 ? .9 : l.count >= 4 ? .62 : .4}"/>`;
  }).join('');
  return `<div class="ad">
<div class="eyebrow">Protocol coverage · United States</div>
<div class="hero"><b>${nf(stats.studying)}</b><i>medics studying their own protocols</i></div>
<svg class="map" viewBox="0 0 959 593"><g>${outline}</g><g style="mix-blend-mode:plus-lighter">${dots}</g></svg>
<div class="foot"><span class="wm">ProtoQuiz</span><span class="sub">${nf(stats.uploads)} uploads · ${stats.states} states · ${kf(stats.pages)} pages</span></div>
<div class="grain"></div></div>
<style>
.ad{width:${W}px;height:${W}px;background:#010102;position:relative;font-family:${SANS};overflow:hidden}
.eyebrow{position:absolute;left:76px;top:76px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42)}
.hero{position:absolute;left:76px;top:112px}
.hero b{display:block;font-size:184px;font-weight:500;letter-spacing:-.042em;color:#f7f8f8;line-height:.88;font-variant-numeric:tabular-nums}
.hero i{display:block;margin-top:16px;font-style:normal;font-size:29px;font-weight:400;letter-spacing:-.015em;color:rgba(255,255,255,.6)}
.map{position:absolute;left:0;right:0;top:365px;width:${W}px;height:600px}
.foot{position:absolute;left:76px;right:76px;bottom:70px;display:flex;justify-content:space-between;align-items:baseline}
.wm{font-size:29px;font-weight:600;letter-spacing:-.02em;color:#f7f8f8}
.sub{font-size:15px;font-weight:500;letter-spacing:-.01em;color:rgba(255,255,255,.38);font-variant-numeric:tabular-nums}
${grainCSS}</style>`;
}

// ---------------------------------------------------------------- direction 2
// EDITORIAL SPLIT -- map is a quiet plate on the right, the claim owns the left.
// Reads like a product page section, not an infographic.
function editorial({ paths, locales, stats }) {
  const outline = paths.map(d => `<path d="${d}" fill="#0f1011" stroke="#1e2026" stroke-width=".9" vector-effect="non-scaling-stroke"/>`).join('');
  const dots = locales.map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${1.8 + Math.sqrt(l.count) * 1.2}" fill="#ffb000" opacity="${l.count >= 10 ? .95 : .55}"/>`).join('');
  const rows = [['Uploads', nf(stats.uploads)], ['States', stats.states], ['Protocols', nf(stats.protocols)], ['Pages', kf(stats.pages)]]
    .map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  return `<div class="ad">
<div class="left">
  <div class="eyebrow">ProtoQuiz</div>
  <div class="claim">Medics in ${stats.states} states are studying <em>their own</em> protocols.</div>
  <div class="rows">${rows}</div>
</div>
<div class="plate"><svg viewBox="0 0 959 593"><g>${outline}</g><g style="mix-blend-mode:plus-lighter">${dots}</g></svg></div>
<div class="grain"></div></div>
<style>
.ad{width:${W}px;height:${W}px;background:#010102;position:relative;font-family:${SANS};overflow:hidden}
.left{position:absolute;left:72px;top:120px;width:430px;z-index:2}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#ffb000;margin-bottom:34px}
.claim{font-size:50px;font-weight:500;line-height:1.1;letter-spacing:-.035em;color:#f7f8f8}
.claim em{font-style:normal;color:rgba(255,255,255,.45)}
.rows{margin-top:52px;border-top:1px solid #1e2026}
.row{display:flex;justify-content:space-between;align-items:baseline;padding:17px 0;border-bottom:1px solid #1e2026}
.row span{font-size:13px;font-weight:500;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.36)}
.row b{font-size:31px;font-weight:500;letter-spacing:-.03em;color:#f7f8f8;font-variant-numeric:tabular-nums}
.plate{position:absolute;right:-40px;top:300px;width:640px;height:440px;z-index:1}
.plate svg{width:100%;height:100%}
${grainCSS}</style>`;
}

// ---------------------------------------------------------------- direction 3
// FULL BLEED -- map fills the frame edge to edge, type sits on top. The map is
// the poster, not an illustration inside one.
function bleed({ paths, locales, stats }) {
  const outline = paths.map(d => `<path d="${d}" fill="#0b0c10" stroke="#191b21" stroke-width=".8" vector-effect="non-scaling-stroke"/>`).join('');
  const dots = locales.map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${2 + Math.sqrt(l.count) * 1.35}" fill="#ffb000" opacity="${l.count >= 10 ? 1 : l.count >= 4 ? .6 : .38}"/>`).join('');
  return `<div class="ad">
<svg class="map" viewBox="30 40 900 520" preserveAspectRatio="xMidYMid meet"><g>${outline}</g><g style="mix-blend-mode:plus-lighter">${dots}</g></svg>
<div class="scrim"></div>
<div class="type">
  <div class="eyebrow">Protocol coverage</div>
  <div class="hero">${nf(stats.studying)}</div>
  <div class="deck">medics studying their own protocols</div>
</div>
<div class="foot"><span class="wm">ProtoQuiz</span><span class="sub">${nf(stats.uploads)} uploads · ${stats.states} states</span></div>
<div class="grain"></div></div>
<style>
.ad{width:${W}px;height:${W}px;background:#010102;position:relative;font-family:${SANS};overflow:hidden}
.map{position:absolute;left:0;right:0;top:150px;width:100%;height:800px}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,1,2,.9) 0%,rgba(1,1,2,.15) 40%,rgba(1,1,2,.55) 78%,rgba(1,1,2,.96) 100%);z-index:2}
.type{position:absolute;left:76px;top:82px;z-index:3}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:18px}
.hero{font-size:172px;font-weight:500;letter-spacing:-.045em;color:#f7f8f8;line-height:.86;font-variant-numeric:tabular-nums}
.deck{margin-top:18px;font-size:28px;font-weight:400;letter-spacing:-.015em;color:rgba(255,255,255,.62)}
.foot{position:absolute;left:76px;right:76px;bottom:66px;z-index:3;display:flex;justify-content:space-between;align-items:baseline}
.wm{font-size:28px;font-weight:600;letter-spacing:-.02em;color:#f7f8f8}
.sub{font-size:15px;font-weight:500;color:rgba(255,255,255,.4);font-variant-numeric:tabular-nums}
${grainCSS}</style>`;
}

// ---------------------------------------------------------------- direction 4
// DATA CARD -- map inside a lifted surface with a hairline, Linear-style. Most
// conservative, most "product screenshot".
function card({ paths, locales, stats }) {
  const outline = paths.map(d => `<path d="${d}" fill="none" stroke="#242730" stroke-width=".9" vector-effect="non-scaling-stroke"/>`).join('');
  const dots = locales.map(l =>
    `<circle cx="${l.x}" cy="${l.y}" r="${2 + Math.sqrt(l.count) * 1.3}" fill="#ffb000" opacity="${l.count >= 10 ? .95 : l.count >= 4 ? .6 : .4}"/>`).join('');
  const cells = [['Uploads', nf(stats.uploads)], ['States', stats.states], ['Studying', nf(stats.studying)], ['Pages', kf(stats.pages)]]
    .map(([k, v]) => `<div class="cell"><b>${v}</b><span>${k}</span></div>`).join('');
  return `<div class="ad">
<div class="hd"><span class="dot"></span><span class="wm">ProtoQuiz</span><span class="tag">Live coverage</span></div>
<div class="card">
  <div class="cardhead"><span>Where protocols are being studied</span><span class="live">Updated today</span></div>
  <svg viewBox="0 0 959 593"><g>${outline}</g><g style="mix-blend-mode:plus-lighter">${dots}</g></svg>
  <div class="cells">${cells}</div>
</div>
<div class="grain"></div></div>
<style>
.ad{width:${W}px;height:${W}px;background:#010102;position:relative;font-family:${SANS};overflow:hidden;padding:64px;box-sizing:border-box}
.hd{display:flex;align-items:center;gap:13px;margin-bottom:34px}
.hd .dot{width:9px;height:9px;border-radius:50%;background:#ffb000}
.hd .wm{font-size:23px;font-weight:600;letter-spacing:-.02em;color:#f7f8f8}
.hd .tag{margin-left:auto;font-size:12px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:rgba(255,255,255,.34)}
.card{background:#0f1011;border:1px solid #23252a;border-radius:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.045);overflow:hidden}
.cardhead{display:flex;justify-content:space-between;align-items:center;padding:26px 30px;border-bottom:1px solid #1c1e23}
.cardhead span:first-child{font-size:21px;font-weight:500;letter-spacing:-.02em;color:#f7f8f8}
.live{font-size:12px;font-weight:500;letter-spacing:.06em;color:rgba(255,255,255,.32)}
.card svg{display:block;width:100%;height:520px;padding:18px 0}
.cells{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #1c1e23}
.cell{padding:26px 30px;border-right:1px solid #1c1e23}
.cell:last-child{border-right:0}
.cell b{display:block;font-size:36px;font-weight:500;letter-spacing:-.032em;color:#f7f8f8;font-variant-numeric:tabular-nums}
.cell span{display:block;margin-top:7px;font-size:11px;font-weight:600;letter-spacing:.11em;text-transform:uppercase;color:rgba(255,255,255,.34)}
${grainCSS}</style>`;
}

const DIRECTIONS = { constellation, editorial, bleed, card };

const main = async () => {
  const data = await load();
  await fs.mkdir(OUT, { recursive: true });
  for (const [name, fn] of Object.entries(DIRECTIONS)) {
    const html = `<!doctype html><html><head><meta charset=utf8><style>*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${W}px;overflow:hidden;background:#010102}</style></head><body><svg width="0" height="0">${GRAIN}</svg>${fn(data)}</body></html>`;
    const base = path.join(OUT, name);
    await fs.writeFile(`${base}.html`, html);
    await run(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
      `--screenshot=${base}.png`, `--window-size=${W},${W}`, `file://${base}.html`]).catch(() => {});
    console.log(`share/mockups/${name}.png`);
  }
};

main().catch(e => { console.error(e.message); process.exit(1); });
