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

const registry = `<svg viewBox="-145 46 1015 539" class="thumb-svg" role="img" aria-label="Thumbnail of the county map: every US county shaded by who owns its 911 provider">`
  + `${countyPaths}<path fill="none" stroke="#6b6b6b" stroke-width="1.4" d="`
  + Object.values(geo.states).map(d => round(d)).join('')
  + `"/></svg>`;

// ── census: SAME CALL, DIFFERENT DOSE ──────────────────────────────────────────────
// Common calls a medic runs every week, and the lowest to highest adult dose the census
// finds across agencies. Hand-picked, not sorted by ratio: the widest ratios are rare
// drugs and extraction noise, and the point is that ordinary calls vary. Each row reads
// on its own ("2 to 10 mg"), so no shared axis is needed.
const cmp = JSON.parse(readFileSync('data/census/compare.json', 'utf8'));
const CALLS = [
  ['Seizure', 'MIDAZOLAM', 'SEIZURE'],
  ['Opioid overdose', 'NALOXONE', 'OPIOID_OVERDOSE'],
  ['SVT', 'ADENOSINE', 'SVT'],
  ['Trauma bleeding', 'TRANEXAMIC ACID', 'TRAUMA_HEMORRHAGE'],
  ['Allergic reaction', 'DIPHENHYDRAMINE', 'ALLERGIC_REACTION'],
  ['Cardiac arrest', 'EPINEPHRINE', 'CARDIAC_ARREST'],
];
// A row reads in one unit: fentanyl is 25 to 100 mcg, not 25 mcg to 0.1 mg.
const fmt = (v, lo = v) => lo >= 0.1 && v >= 1000 ? `${+(v / 1000).toFixed(1)} g` : lo < 0.1 ? `${+(v * 1000).toFixed(0)} mcg` : `${+v.toFixed(1)} mg`;
const top = CALLS.map(([call, drug, indication]) => {
  const g = cmp.groups.find(g => g.key.drugKey === drug && g.key.indicationKey === indication
    && g.key.population === 'adult' && !g.key.perKg && g.key.unit === 'mg' && g.dist);
  return g && { call, drug: drug.charAt(0) + drug.slice(1).toLowerCase(), d: g.dist, n: g.n.agencies };
}).filter(Boolean);

const W = 440, RH = 35, PAD = 12, LAB = 140, X0 = LAB + 44, X1 = W - 66;
const H = PAD * 2 + top.length * RH;
const rows = top.map(({ call, drug, d }, i) => {
  const y = PAD + i * RH, cy = y + 11;
  const at = v => X0 + ((v - d.min) / ((d.max - d.min) || 1)) * (X1 - X0);
  const box = at(d.p75) - at(d.p25), med = at(d.median);
  return `<g>
    <text x="0" y="${y + 9}" class="t-drug">${call}</text>
    <text x="0" y="${y + 23}" class="t-ind">${drug}</text>
    <text x="${X0 - 10}" y="${cy + 4}" text-anchor="end" class="t-x">${fmt(d.min)}</text>
    <line x1="${X0}" y1="${cy}" x2="${X1}" y2="${cy}" class="t-whisk"/>
    <line x1="${X0}" y1="${cy - 6}" x2="${X0}" y2="${cy + 6}" class="t-whisk"/>
    <line x1="${X1}" y1="${cy - 6}" x2="${X1}" y2="${cy + 6}" class="t-whisk"/>
    ${box > 0 ? `<rect x="${at(d.p25)}" y="${cy - 8}" width="${box}" height="16" class="t-box"/>
    <line x1="${med}" y1="${cy - 8}" x2="${med}" y2="${cy + 8}" class="t-med"/>`
    // The middle half is one value: most agencies agree, so the agreed dose is the mark.
    : `<circle cx="${med}" cy="${cy}" r="6" class="t-agree"/>
    <text x="${med}" y="${cy + 20}" text-anchor="middle" class="t-agree-x">${d.min === d.max ? 'All' : 'Most'} use ${fmt(d.p25, d.min)}</text>`}
    <text x="${X1 + 10}" y="${cy + 4}" class="t-x">${fmt(d.max, d.min)}</text>
  </g>`;
}).join('');

const census = `<svg viewBox="0 0 ${W} ${H}" class="thumb-svg thumb-doses" role="img" aria-label="Thumbnail: the lowest to highest adult dose across US EMS agencies for six common calls">${rows}</svg>`;

// ── carry: WHERE AGENCIES SPLIT ─────────────────────────────────────────────────────
// Share of agencies whose protocol lists each item as a medication with a dose. Three
// zones: nearly all (75%+), split (25-75%), rare. The core kit is one strip of dots; the
// rows are the advanced drugs people ask about. Groups are unions of spellings and forms
// (any paralytic counts as RSI). Blood is left out: protocols write it as a procedure, not
// a medication, so a medication count undercounts it. It comes with procedures.
const BLOOD = new Set(['BLOOD PRODUCTS', 'LOW TITER O WHOLE BLOOD', 'WHOLE BLOOD', 'PLASMA']);
const listed = new Map();
for (const g of cmp.groups) for (const a of g.agencyKeys || []) {
  if (!listed.has(g.key.drugKey)) listed.set(g.key.drugKey, new Set());
  listed.get(g.key.drugKey).add(a);
}
const ALL = new Set([...listed.values()].flatMap(s => [...s])).size;
const share = keys => new Set(keys.flatMap(k => [...(listed.get(k) || [])])).size / ALL;
const meds = [...listed].filter(([k]) => !BLOOD.has(k)).map(([k, s]) => s.size / ALL);
const pct = meds.map(p => Math.round(p * 100));
const carryZones = { core: pct.filter(p => p >= 75).length, split: pct.filter(p => p >= 25 && p < 75).length };
const CARRY = [
  ['Ketamine', 'Pain, sedation, agitation', ['KETAMINE']],
  ['Cyanide antidote', 'Smoke-inhalation poisoning', ['HYDROXOCOBALAMIN', 'HYDROXYCOBALAMIN']],
  ['Norepinephrine', 'Blood pressure in shock', ['NOREPINEPHRINE']],
  ['RSI paralytic', 'Paralysis for a breathing tube', ['ROCURONIUM', 'SUCCINYLCHOLINE', 'VECURONIUM', 'PANCURONIUM']],
  ['Antibiotics', 'Sepsis, open fractures', ['CEFAZOLIN', 'CEFTRIAXONE', 'CEFEPIME', 'PIPERACILLIN-TAZOBACTAM', 'AMOXICILLIN-CLAVULANATE', 'CIPROFLOXACIN', 'CLINDAMYCIN', 'MOXIFLOXACIN', 'DOXYCYCLINE']],
  ['Buprenorphine', 'Starts opioid-withdrawal care', ['BUPRENORPHINE', 'BUPRENORPHINE-NALOXONE']],
].map(([label, use, keys]) => ({ label, use, pct: share(keys) }));
const CW = 440, CR = 29, CL = 176, CX1 = 424, CT = 22;
const cx = p => +(CL + p * (CX1 - CL)).toFixed(1);
const CH = CT + (CARRY.length + 1) * CR + 16;
const coreDots = meds.filter(p => p >= 0.75).map(p => `<circle cx="${cx(p)}" cy="${CT + 11}" r="3.5" class="t-core"/>`).join('');
const carryRow = (y, label, sub, mark) => `<g><line x1="${CL}" y1="${y + 11}" x2="${CX1}" y2="${y + 11}" class="t-track"/><text x="0" y="${y + 9}" class="t-drug">${label}</text><text x="0" y="${y + 22}" class="t-ind">${sub}</text>${mark}</g>`;
const carry = `<svg viewBox="0 0 ${CW} ${CH}" class="thumb-svg thumb-carry" role="img" aria-label="Share of ${ALL} US EMS agencies whose protocol lists each medication: ${carryZones.core} are on 75% or more, ${carryZones.split} on 25 to 75%. ${CARRY.map(r => `${r.label} ${Math.round(r.pct * 100)}%`).join(', ')}">`
  + `<rect x="${cx(0.25)}" y="${CT - 6}" width="${cx(0.75) - cx(0.25)}" height="${CH - CT - 10}" class="t-split"/>`
  + [['Rare', 0.125], ['Split', 0.5], ['Nearly all', 0.875]].map(([t, p]) => `<text x="${cx(p)}" y="11" text-anchor="middle" class="t-zone${t === 'Split' ? ' t-zone-hi' : ''}">${t}</text>`).join('')
  + `<line x1="${cx(0.5)}" y1="${CT - 6}" x2="${cx(0.5)}" y2="${CH - 16}" class="t-half"/>`
  + carryRow(CT, 'Core kit', `${carryZones.core} drugs, e.g. epinephrine`, coreDots)
  + CARRY.map((r, i) => carryRow(CT + (i + 1) * CR, r.label, r.use,
    `<circle cx="${cx(r.pct)}" cy="${CT + (i + 1) * CR + 11}" r="5" class="t-dot"/><text x="${cx(r.pct) + 9}" y="${CT + (i + 1) * CR + 15}" class="t-x">${Math.round(r.pct * 100)}%</text>`)).join('')
  + [0, 0.25, 0.5, 0.75, 1].map(p => `<text x="${cx(p)}" y="${CH - 3}" text-anchor="middle" class="t-tick">${p * 100}%</text>`).join('')
  + `</svg>`;

// ── formulary: HOW MANY MEDICATIONS EACH AGENCY LISTS ─────────────────────────────
// The same per-agency union as the carry chart, counted the other way round. Bins of 5.
const per = new Map();
for (const [k, s] of listed) if (!BLOOD.has(k)) for (const a of s) per.set(a, (per.get(a) || 0) + 1);
const sizes = [...per.values()].sort((a, b) => a - b);
const formularyStats = {
  n: sizes.length, min: sizes[0], max: sizes.at(-1),
  median: Math.round((sizes[(sizes.length - 1) >> 1] + sizes[sizes.length >> 1]) / 2),
};
const BIN = 5, bins = Array(Math.floor(formularyStats.max / BIN) + 1).fill(0);
for (const v of sizes) bins[Math.floor(v / BIN)]++;
const FW = 440, FH = 200, FB = 172, FX0 = 8, FX1 = FW - 8, peak = Math.max(...bins);
const bw = (FX1 - FX0) / bins.length, fx = v => FX0 + (v / (bins.length * BIN)) * (FX1 - FX0);
const formulary = `<svg viewBox="0 0 ${FW} ${FH}" class="thumb-svg thumb-carry thumb-form" role="img" aria-label="How many medications each agency's protocol lists: median ${formularyStats.median}, most ${formularyStats.max}, across ${formularyStats.n} agencies">${bins.map((c, i) => {
  const h = (c / peak) * (FB - 34), x = FX0 + i * bw;
  return `<rect x="${(x + 2).toFixed(1)}" y="${(FB - h).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="t-bar"/>`
    + (c ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(FB - h - 5).toFixed(1)}" text-anchor="middle" class="t-x">${c}</text>` : '');
}).join('')}<line x1="${FX0}" y1="${FB}" x2="${FX1}" y2="${FB}" class="t-axis"/>${
  bins.map((_, i) => i % 2 ? '' : `<text x="${fx(i * BIN).toFixed(1)}" y="${FB + 16}" text-anchor="middle" class="t-x">${i * BIN}</text>`).join('')
}<line x1="${fx(formularyStats.median + 0.5).toFixed(1)}" y1="14" x2="${fx(formularyStats.median + 0.5).toFixed(1)}" y2="${FB}" class="t-medline"/><text x="${(fx(formularyStats.median + 0.5) + 5).toFixed(1)}" y="20" class="t-drug">median ${formularyStats.median}</text></svg>`;

// ── tables for /research/doses and /research/carry ──────────────────────────────────
// A row reads in ONE unit, chosen by its lowest value: TXA is 500 to 2000 mg, not 500 mg to 2 g.
const UNIT = { mL: 'mL', mEq: 'mEq', unit: 'units', drop: 'drops', spray: 'sprays', inch: 'in' };
const rowFmt = (unit, lo) => unit !== 'mg' ? v => `${+v.toFixed(2)} ${UNIT[unit] ?? unit}`
  : lo < 0.1 ? v => `${+(v * 1000).toFixed(1)} mcg` : lo >= 1000 ? v => `${+(v / 1000).toFixed(2)} g` : v => `${+v.toFixed(2)} mg`;
// "Other" is a bucket of unrelated uses, so its spread is not a finding.
const doseTable = cmp.groups
  .filter(g => g.key.population === 'adult' && !g.key.perKg && g.dist && g.n.sources >= 15 && g.key.indicationKey !== 'OTHER')
  .map(g => {
    const f = rowFmt(g.key.unit, g.dist.min);
    return { indicationKey: g.key.indicationKey, drugKey: g.key.drugKey, lo: f(g.dist.min), med: f(g.dist.median), hi: f(g.dist.max), n: g.n.agencies,
      q: [g.dist.min, g.dist.p25, g.dist.median, g.dist.p75, g.dist.max] };
  });
const carryTable = [...listed].filter(([k]) => !BLOOD.has(k)).map(([drugKey, s]) => [drugKey, s.size]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

writeFileSync(OUT, JSON.stringify({
  registry,
  census,
  carry,
  carryN: ALL,
  carryZones,
  formulary,
  formularyStats,
  doseTable,
  carryTable,
}, null, 0));
console.log(`wrote ${OUT} — registry ${(registry.length / 1024).toFixed(0)} KB, census chart ${top.length} rows`);
