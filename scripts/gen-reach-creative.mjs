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
//   node scripts/gen-reach-creative.mjs --stats studying,states,pages
//   node scripts/gen-reach-creative.mjs --headline country|none|...
//   node scripts/gen-reach-creative.mjs --headline-text "Line one|Line two|Hook"
//        fields: uploads protocols studying medics states countries pages
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

// Selectable stat fields. `--stats studying,states,pages` picks the row; the
// key is what you type, `label` is what prints, `pick` reads reach-stats.json.
// Four fits comfortably at 1080 wide; five is tight; six will crowd.
const FIELDS = {
  uploads:   { label: 'UPLOADS',   pick: s => nf(s.totalUploads) },
  protocols: { label: 'PROTOCOLS', pick: s => nf(s.distinctProtocols) },
  studying:  { label: 'STUDYING',  pick: s => nf(s.activeStudiers) },
  medics:    { label: 'MEDICS',    pick: s => nf(s.activeStudiers) },
  states:    { label: 'STATES',    pick: s => nf(s.statesRepresented) },
  countries: { label: 'COUNTRIES', pick: s => nf(s.countriesRepresented) },
  pages:     { label: 'PAGES',     pick: s => kfmt(s.pagesProcessed) },
};
const DEFAULT_STATS = 'uploads,states,protocols,pages';

// Headline presets. The last line renders amber (the hook); `--headline none`
// drops the block entirely and gives the map the whole canvas.
// Tokens {studying} {uploads} {states} {protocols} {pages} {countries} resolve
// against live stats, so a saved headline never goes stale.
const HEADLINES = {
  studying:  ['{studying} medics are studying', 'their EMS protocols.', 'Are you?'],
  country:   ['Medics all over the country', 'are studying their protocols.', 'Are you?'],
  states:    ['Medics in {states} states are', 'studying their own protocols.', 'Are you?'],
  uploads:   ['{uploads} protocol documents.', 'Turned into real training.', 'Try yours free.'],
  agency:    ['Your protocols. Your quizzes.', 'Not generic EMS trivia.', 'Built by a medic.'],
  none:      null,
};
const DEFAULT_HEADLINE = 'studying';

// A hero number needs a caption that says what it MEANS. "STUDYING" is a column
// header; "MEDICS STUDYING THEIR OWN PROTOCOLS" is the claim.
const HERO_CAPTION = {
  studying:  'medics studying their own protocols',
  medics:    'medics studying their own protocols',
  uploads:   'protocol documents uploaded',
  protocols: 'agency protocols in the system',
  states:    'states represented',
  pages:     'pages of protocol processed',
  countries: 'countries',
};

// Substitutes {token} against the live numbers. An unknown token is left as-is
// rather than silently blanked -- a visible "{studers}" is a typo you can see.
const fillTokens = (line, stats) => line.replace(/\{(\w+)\}/g, (m, k) =>
  FIELDS[k] ? FIELDS[k].pick(stats) : m);

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
function placeLabels(locales, minLabel = 8, heroZone = null) {
  const CH = 7.3, LH = 15;           // measured advance/leading at 12.5px mono
  const placed = [], boxes = [];
  for (const l of [...locales].sort((a, b) => b.count - a.count)) {
    if (l.count < minLabel) continue;
    // The hero block owns the top-left; a label bleeding under its scrim reads
    // as a rendering fault, so those cities keep their dot and lose their name.
    if (heroZone && l.x < heroZone.x && l.y < heroZone.y) continue;
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

function buildHTML({ stats, states, labels, logo, preset, fields, headline, hero }) {
  const P = PRESETS[preset];
  const byState = stats.byState || {};
  const maxSt = Math.max(1, ...Object.values(byState));

  const statePaths = states.map(({ st, d }) => {
    const n = st ? (byState[st] || 0) : 0;
    const cls = !n ? 'state' : n >= maxSt * 0.4 ? 'state lit warm' : 'state lit';
    return `<path class="${cls}" d="${d}"/>`;
  }).join('');

  // Light sources, biggest cities brightest. Drawn UNDER the states so the
  // outlines stay crisp and the glow reads as light through the map, not haze
  // on top of it.
  const glows = stats.locales
    .filter(l => l.count >= 3)
    .map(l => `<circle cx="${l.x}" cy="${l.y}" r="${Math.min(46, 13 + l.count * 1.15)}" fill="url(#glow)"/>`)
    .join('');

  const dots = labels.map(l => {
    const r = l.count >= 20 ? 6.5 : l.count >= 5 ? 4.6 : 3;
    const halo = l.count >= 20 ? 13 : l.count >= 5 ? 9.5 : 7;
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

  // No headline means the map owns the canvas -- shift it up into that space
  // rather than leaving a dead band where the copy used to be.
  const headBlock = headline
    ? `<div class="head">` + headline.map((l, i) =>
        i === headline.length - 1
          ? `<div><span class=hl>${esc(fillTokens(l, stats))}</span></div>`
          : `<div>${esc(fillTokens(l, stats))}</div>`).join('') + `</div>`
    : '';

  const heroKey = hero && FIELDS[hero] ? hero : null;
  const rest = heroKey ? fields.filter(k => k !== heroKey) : fields;

  const S = rest
    .map(k => `<div><b>${esc(FIELDS[k].pick(stats))}</b><i>${esc(FIELDS[k].label)}</i></div>`)
    .join('');

  const heroBlock = heroKey
    ? `<div class="hero"><b>${esc(FIELDS[heroKey].pick(stats))}</b>`
      + `<i>${esc(HERO_CAPTION[heroKey] || FIELDS[heroKey].label)}</i></div>`
    : '';

  return `<!doctype html><html><head><meta charset=utf8><style>
:root{--amber:#ffb000;--bg:#06050a;--ink:#f4f1ea;--ink-soft:#b4afa4;--muted:#8a8478}
*{margin:0;box-sizing:border-box}html,body{width:${P.w}px;height:${P.h}px;overflow:hidden}
.ad{width:${P.w}px;height:${P.h}px;background:var(--bg);position:relative;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:var(--ink)}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse 78% 62% at 50% 44%,transparent 40%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:1}
.map{z-index:0}.head,.brand,.stats,.footrule{z-index:2}
.head{position:absolute;top:42px;left:60px;right:60px;font-weight:800;font-size:${P.headSize}px;line-height:1.16}.head .hl{color:var(--amber)}
.map{position:absolute;left:0;right:0;top:${headline ? P.mapTop : (hero ? 132 : 56)}px;height:${headline ? P.mapH : (hero ? P.mapH + 75 : P.mapH + 105)}px;width:${P.w}px}
.state{fill:#0d0c11;stroke:#1e1c24;stroke-width:1;vector-effect:non-scaling-stroke}
.state.lit{fill:#14120f;stroke:rgba(255,176,0,.22);stroke-width:1}
.state.lit.warm{fill:#1b1710;stroke:rgba(255,176,0,.38);stroke-width:1.2}
.locale circle.core{fill:var(--amber)}.locale circle.halo{fill:none;stroke:var(--amber);stroke-width:1.2;opacity:.45}
.lead{stroke:#6e675a;stroke-width:.8}
.rl{font-family:ui-monospace,Menlo,monospace;font-size:13px;letter-spacing:.02em;fill:#6f6a60;text-transform:uppercase;font-weight:600;paint-order:stroke fill;stroke:var(--bg);stroke-width:5px;stroke-linejoin:round}
.rl-warm{font-size:15px;font-weight:700;fill:#cdc7bb}
.rl-hot{font-size:18px;font-weight:800;fill:#fff;letter-spacing:.04em}
.rl .rl-n{fill:var(--amber);font-weight:800}
.stats{position:absolute;bottom:56px;left:${fields.length >= 5 ? 500 : 560}px;right:60px;display:flex;justify-content:space-between;text-align:center}
.stats b{color:var(--amber);text-shadow:0 0 24px rgba(255,176,0,.35);font-size:${fields.length >= 5 ? 38 : 50}px;font-weight:800;display:block;line-height:1}
.stats i{color:var(--muted);font-size:${fields.length >= 5 ? 13 : 16}px;letter-spacing:.12em;font-style:normal;font-weight:700}
.heroscrim{position:absolute;left:0;top:0;width:660px;height:300px;z-index:2;pointer-events:none;background:linear-gradient(160deg,rgba(6,5,10,.97) 30%,rgba(6,5,10,.75) 62%,rgba(6,5,10,0) 100%)}
.hero{position:absolute;left:60px;top:56px;z-index:3}
.hero b{display:block;font-size:168px;font-weight:800;line-height:.86;color:var(--ink);letter-spacing:-5px}
.hero i{display:block;margin-top:14px;font-style:normal;font-size:16px;font-weight:700;letter-spacing:.19em;color:var(--amber);text-transform:uppercase;max-width:560px;line-height:1.45}
.footrule{position:absolute;left:60px;right:60px;bottom:${fields.length >= 5 ? 186 : 190}px;height:1px;background:linear-gradient(90deg,rgba(255,176,0,.45),rgba(255,176,0,.06))}
.brand{position:absolute;bottom:52px;left:60px;display:flex;align-items:center;gap:20px}
.brand img{width:${fields.length >= 5 ? 120 : 150}px;height:${fields.length >= 5 ? 120 : 150}px}.brand .wm{font-weight:800;font-size:${fields.length >= 5 ? 34 : 44}px;letter-spacing:2px}
</style></head><body><div class="ad"><div class="vig"></div>
${headBlock}
<svg viewBox="0 0 959 593" preserveAspectRatio="xMidYMid meet" class="map">
<defs>
<radialGradient id="glow"><stop offset="0" stop-color="#ffb000" stop-opacity=".38"/><stop offset="55%" stop-color="#ff7a00" stop-opacity=".10"/><stop offset="100%" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="1.1"/></filter>
</defs>
<g class="glows">${glows}</g>
<g class="states">${statePaths}</g>
<g class="dots">${bare}${dots}</g>
</svg>
${hero ? `<div class="heroscrim"></div>` : ""}${heroBlock}
<div class="footrule"></div>
<div class="brand"><img src="${logo}"><span class="wm">PROTOQUIZ</span></div>
<div class="stats">${S}</div>
</div></body></html>
`;
}

const main = async () => {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : argv[i + 1]; };
  const presets = arg('preset', null) ? [arg('preset', null)] : ['square'];

  const hero = (h => h === 'none' ? null : h)(arg('hero', 'studying'));
  if (hero && !FIELDS[hero]) {
    throw new Error(`unknown --hero "${hero}"\navailable: ${Object.keys(FIELDS).join(', ')}, none`);
  }

  const fields = arg('stats', DEFAULT_STATS).split(',').map(f => f.trim()).filter(Boolean);
  const unknown = fields.filter(f => !FIELDS[f]);
  if (unknown.length) {
    throw new Error(`unknown stat field(s): ${unknown.join(', ')}\n` +
                    `available: ${Object.keys(FIELDS).join(', ')}`);
  }
  if (!fields.length) throw new Error('--stats needs at least one field');
  if (fields.length > 6) throw new Error('--stats takes at most 6 fields (4 reads best)');

  // --headline <preset|none>, or --headline-text "line one|line two|hook"
  const custom = arg('headline-text', null);
  let headline;
  if (custom !== null) {
    headline = custom.split('|').map(l => l.trim()).filter(Boolean);
    if (!headline.length) throw new Error('--headline-text needs at least one line');
    if (headline.length > 4) throw new Error('--headline-text takes at most 4 lines');
  } else {
    const key = arg('headline', DEFAULT_HEADLINE);
    if (!(key in HEADLINES)) {
      throw new Error(`unknown headline "${key}"\navailable: ${Object.keys(HEADLINES).join(', ')}`);
    }
    headline = HEADLINES[key];
  }

  const stats = JSON.parse(await fs.readFile(STATS, 'utf8'));
  const [states, logo] = await Promise.all([readStates(), logoDataURI()]);
  const labels = placeLabels(stats.locales, Number(arg('min-label', 8)),
    hero ? { x: 300, y: 120 } : null);   // map units, matches the scrim
  await fs.mkdir(OUTDIR, { recursive: true });

  for (const preset of presets) {
    if (!PRESETS[preset]) throw new Error(`unknown preset "${preset}"`);
    const { w, h } = PRESETS[preset];
    const base = path.join(OUTDIR, `creative-reach-${preset}`);
    await fs.writeFile(`${base}.html`, buildHTML({ stats, states, labels, logo, preset, fields, headline, hero }));

    if (!argv.includes('--html-only')) {
      await run(CHROME, [
        '--headless', '--disable-gpu', '--hide-scrollbars',
        `--screenshot=${base}.png`, `--window-size=${w},${h}`,
        '--default-background-color=00000000', `file://${base}.html`,
      ]).catch(e => { if (!/^$/.test(e.stderr || '')) return; throw e; });
    }
    console.log(`${path.relative(ROOT, base)}.png  ${w}x${h}  ${labels.length} labels  [${fields.join(" ")}]`);
    console.log(headline ? `  headline: ${headline.map(l => fillTokens(l, stats)).join(" / ")}` : "  headline: (none)");
  }
  console.log(`\n${nf(stats.totalUploads)} uploads / ${stats.statesRepresented} states / ${nf(stats.activeStudiers)} studying`);
  console.log(`stats generated ${stats.generatedAt}`);
};

main().catch(e => { console.error(e.message); process.exit(1); });
