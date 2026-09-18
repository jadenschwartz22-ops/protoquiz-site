// scripts/build-research-thumbs.mjs — the two thumbnails on /research.
//
// Each volume card shows a small rendering of what is actually inside it, generated from
// the SAME data the volume publishes. A card that showed a stock illustration would be
// the one thing on this page not backed by a source.
//
// Registry thumb: the county map at card size, no labels, no tooltips -- a shape, not a
// tool. Census thumb: the widest real dose spreads, which is the census's actual finding
// and the hardest thing to show in a number. Both write self-contained inline SVG.
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'assets/research-thumbs.json';

// ── registry: counties, coloured by ownership, faded by evidence tier ────────────────
const geo = JSON.parse(readFileSync('data/county-paths.json', 'utf8'));
const S = JSON.parse(readFileSync('data/county-911.json', 'utf8'));
const COL = { public: '#0072B2', private: '#D55E00', hospital: '#009E73', mixed: '#8C6BB1', unknown: '#c9c6bf' };
const OP = { A: 1, B: 0.85, C: 0.62, D: 0.38 };

// At ~420px wide a county is about 3px across, so the full outline is thrown away by
// the rasteriser. Coordinates round to whole units and counties sharing a fill are
// merged into one path: same picture, a fraction of the bytes. 661 KB -> ~60 KB.
const round = d => d.replace(/(\d+)\.\d+/g, '$1');
// Drop vertices closer than ~2 units to the last kept one: at thumbnail scale that is
// sub-pixel, so the shape is identical and the byte count is not.
const thin = (d) => {
  let out = '', lx = null, ly = null;
  for (const seg of d.split(/(?=[ML])/)) {
    const m = seg.match(/^([ML])\s*(-?\d+),(-?\d+)/);
    if (!m) { out += seg; continue; }
    const [, cmd, xs, ys] = m, x = +xs, y = +ys;
    if (cmd === 'M') { out += `M${x},${y}`; lx = x; ly = y; continue; }
    if (lx !== null && Math.abs(x - lx) < 2 && Math.abs(y - ly) < 2) continue;
    out += `L${x},${y}`; lx = x; ly = y;
  }
  return out + 'Z';
};
const buckets = new Map();
for (const [fips, d] of Object.entries(geo.counties)) {
  const c = S[fips];
  const key = !c ? 'none'
    : c.tier === '-' ? 'blank'
    : `${c.ownership}|${c.tier}`;
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(thin(round(d)));
}
const countyPaths = [...buckets].map(([key, ds]) => {
  if (key === 'none') return `<path d="${ds.join('')}" fill="#eeece6"/>`;
  if (key === 'blank') return `<path d="${ds.join('')}" fill="${COL.unknown}" fill-opacity="0.22"/>`;
  const [own, tier] = key.split('|');
  return `<path d="${ds.join('')}" fill="${COL[own] ?? COL.unknown}" fill-opacity="${OP[tier] ?? 0.4}"/>`;
}).join('');

const registry = `<svg viewBox="0 0 975 610" class="thumb-svg" role="img" aria-label="Thumbnail of the county map: every US county shaded by who owns its 911 provider">`
  + `${countyPaths}<path fill="none" stroke="#6b6b6b" stroke-width="1.4" d="`
  + Object.values(geo.states).map(d => round(d)).join('')
  + `"/></svg>`;

// ── census: the widest dose spreads it can actually evidence ─────────────────────────
// Sorted by max/min, floored at 15 sources so a two-agency outlier cannot lead. Each row
// is one published distribution; the bar is min..max with the median marked, log-scaled
// because an 8x spread and a 1.5x spread cannot share a linear axis legibly.
const cmp = JSON.parse(readFileSync('data/census/compare.json', 'utf8'));
const MIN_SOURCES = 15, ROWS = 5;
const title = k => `${k.drugKey.charAt(0) + k.drugKey.slice(1).toLowerCase()}`;
const ind = k => String(k.indicationKey || '').toLowerCase().replace(/_/g, ' ');

const picked = cmp.groups
  .filter(g => g.dist && g.dist.min > 0 && g.n.sources >= MIN_SOURCES && g.key.indicationKey !== 'OTHER')
  .map(g => ({ g, ratio: g.dist.max / g.dist.min }))
  .sort((a, b) => b.ratio - a.ratio);

// One row per medication: five ketamine indications in a row of five is one finding shown
// five times, and reads as if the census only knows about ketamine.
const seen = new Set();
const top = [];
for (const p of picked) {
  if (seen.has(p.g.key.drugKey)) continue;
  seen.add(p.g.key.drugKey);
  top.push(p);
  if (top.length === ROWS) break;
}

const W = 440, RH = 46, PAD = 8, LABEL_W = 150, BAR_X = LABEL_W + 10, BAR_W = W - BAR_X - 34;
const H = PAD * 2 + top.length * RH;
const lg = v => Math.log10(v);

const rows = top.map(({ g, ratio }, i) => {
  const d = g.dist, y = PAD + i * RH;
  const lo = lg(d.min), hi = lg(d.max), span = hi - lo || 1;
  const at = v => BAR_X + ((lg(v) - lo) / span) * BAR_W;
  const medX = at(d.median);
  return `<g>
    <text x="0" y="${y + 15}" class="t-drug">${title(g.key)}</text>
    <text x="0" y="${y + 29}" class="t-ind">${ind(g.key)}</text>
    <line x1="${BAR_X}" y1="${y + 22}" x2="${BAR_X + BAR_W}" y2="${y + 22}" class="t-track"/>
    <rect x="${at(d.p25)}" y="${y + 16}" width="${Math.max(at(d.p75) - at(d.p25), 2)}" height="12" rx="2" class="t-iqr"/>
    <line x1="${medX}" y1="${y + 13}" x2="${medX}" y2="${y + 31}" class="t-med"/>
    <text x="${BAR_X + BAR_W + 6}" y="${y + 26}" class="t-x">${ratio < 10 ? ratio.toFixed(0) : Math.round(ratio)}&#215;</text>
  </g>`;
}).join('');

const census = `<svg viewBox="0 0 ${W} ${H}" class="thumb-svg thumb-doses" role="img" aria-label="Thumbnail of dose variation: the five medications with the widest published dose spread across US EMS protocols">${rows}</svg>`;

writeFileSync(OUT, JSON.stringify({
  registry,
  census,
  // Stated beside the chart so the claim it makes is checkable.
  censusNote: top.length
    ? `${title(top[0].g.key)} for ${ind(top[0].g.key)} runs ${top[0].g.dist.min}&ndash;${top[0].g.dist.max}&nbsp;${top[0].g.key.unit} across ${top[0].g.n.sources} protocols.`
    : '',
}, null, 0));
console.log(`wrote ${OUT} — registry ${(registry.length / 1024).toFixed(0)} KB, census chart ${top.length} rows`);
