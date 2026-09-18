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

// ── census: WHAT IS CARRIED, not how it is dosed ────────────────────────────────────
// The question a medic actually asks of another agency's protocol is "do you carry
// that?", not "what is your p75". Carriage is also the more honest thing for this
// dataset to lead with: it needs one mention of a medication per agency, where a dose
// distribution needs a parsed number from 15+ sources before it can say anything.
const cmp = JSON.parse(readFileSync('data/census/compare.json', 'utf8'));
const carriers = new Map();
for (const g of cmp.groups) {
  const k = g.key.drugKey;
  if (!carriers.has(k)) carriers.set(k, new Set());
  for (const a of g.agencyKeys || []) carriers.get(k).add(a);
}
const TOTAL = new Set([...carriers.values()].flatMap(s => [...s])).size;

// Turkish-spelled duplicates (ADENOZİN, ADRENALİN, AMİODARON) are extraction failures,
// not medications. A dotted capital I cannot appear in an English drug name.
const BAD = /[İığşçö]/;
const pretty = k => k.charAt(0) + k.slice(1).toLowerCase();

const ranked = [...carriers]
  .filter(([k]) => !BAD.test(k))
  .map(([k, set]) => ({ k, n: set.size, pct: set.size / TOTAL }))
  .sort((a, b) => b.n - a.n);

const ROWS = 8;
const top = ranked.slice(0, ROWS);
const near = ranked.filter(r => r.pct >= 0.75).length;
const rare = ranked.filter(r => r.pct < 0.10).length;

const W = 440, RH = 27, PAD = 10, LAB = 132, BAR_X = LAB + 8, BAR_W = W - BAR_X - 46;
const H = PAD * 2 + top.length * RH;
const bars = top.map((r, i) => {
  const y = PAD + i * RH;
  return `<g>
    <text x="0" y="${y + 15}" class="t-drug">${pretty(r.k)}</text>
    <rect x="${BAR_X}" y="${y + 5}" width="${BAR_W}" height="13" rx="2" class="t-bg"/>
    <rect x="${BAR_X}" y="${y + 5}" width="${(BAR_W * r.pct).toFixed(1)}" height="13" rx="2" class="t-bar"/>
    <text x="${BAR_X + BAR_W + 6}" y="${y + 15}" class="t-x">${Math.round(r.pct * 100)}%</text>
  </g>`;
}).join('');

const census = `<svg viewBox="0 0 ${W} ${H}" class="thumb-svg thumb-carry" role="img" aria-label="Thumbnail: the medications most widely carried across US EMS protocols, as a share of agencies">${bars}</svg>`;
const censusNote = `${near} medications are carried almost everywhere. ${rare} are carried by fewer than one agency in ten &mdash; that gap is the finding.`;

writeFileSync(OUT, JSON.stringify({
  registry,
  census,
  // Stated beside the chart so the claim it makes is checkable.
  censusNote,
}, null, 0));
console.log(`wrote ${OUT} — registry ${(registry.length / 1024).toFixed(0)} KB, census chart ${top.length} rows`);
