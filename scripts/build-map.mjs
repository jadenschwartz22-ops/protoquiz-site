// scripts/build-map.mjs — the reach map as a self-contained, themed SVG.
//
// Static rebuild of the homepage's interactive map: no zoom, no world toggle,
// no click panel. What it keeps is the density: every city that has uploaded
// gets a name. Labels are sized by tier and placed by a greedy search (six
// close positions, then an expanding ring); a label pushed away from its dot
// gets a thin leader line so it still reads as that dot's. Hot and warm cities
// are placed first and never dropped.
//
// State outlines come from data/us-state-paths.txt; dots from
// data/reach-stats.json. Colours are tokens, so the map flips with [data-shift].
import { readFileSync, writeFileSync } from 'node:fs';

const paths = readFileSync('data/us-state-paths.txt', 'utf8')
  .split('\n').filter(Boolean)
  .map(p => p.replace(/\sfill="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, ''))
  .map(p => (p.endsWith('/>') ? p : p.replace(/>$/, '/>')));

const reach = JSON.parse(readFileSync('data/reach-stats.json', 'utf8'));
const locales = (reach.locales || []).filter(l => l.x != null && l.y != null)
  .sort((a, b) => b.count - a.count);
const byState = reach.byState || {};

const bucket = n => n >= 20 ? 'hot' : n >= 8 ? 'warm' : n >= 1 ? 'on' : 'off';
const states = paths.map(p => {
  const st = (p.match(/s-([a-z]{2})/) || [])[1]?.toUpperCase();
  return p.replace('<path', `<path data-b="${bucket(byState[st] || 0)}"`);
});

const R = { hot: 7, warm: 5, on: 3.5, tiny: 2.5 };
const H = { hot: 18, warm: 11, on: 8, tiny: 6 };
const SZ = { hot: 16, warm: 13, on: 10.5, tiny: 8.5 };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const dots = locales.map(l =>
  `      <g class="lc ${l.tier}"><circle class="halo" cx="${l.x}" cy="${l.y}" r="${H[l.tier]}"/>`
  + `<circle class="core" cx="${l.x}" cy="${l.y}" r="${R[l.tier]}"><title>${esc(l.city)}, ${l.state} — ${l.count} protocol${l.count === 1 ? '' : 's'}</title></circle></g>`
).join('\n');

// ---- label placement ------------------------------------------------------
const obstacles = locales.map(l => [l.x - 4, l.y - 4, l.x + 4, l.y + 4]);
const placed = [];
const clash = (b, list, px = 2, py = 1) =>
  list.some(o => !(b[2] < o[0] - px || b[0] > o[2] + px || b[3] < o[1] - py || b[1] > o[3] + py));

const labels = [];
for (const l of locales) {
  const sz = SZ[l.tier];
  const big = l.tier === 'hot' || l.tier === 'warm';
  const text = `${l.city.toUpperCase()} ${l.count}`;
  const w = text.length * sz * 0.66, h = sz * 1.15, pad = 6;
  const cands = [];
  const add = (anc, x, y) => {
    const x0 = anc === 'start' ? x : anc === 'end' ? x - w : x - w / 2;
    cands.push({ anc, x, y, box: [x0, y - h, x0 + w, y] });
  };
  add('start', l.x + pad, l.y - pad); add('end', l.x - pad, l.y - pad);
  add('start', l.x + pad, l.y + h + 2); add('end', l.x - pad, l.y + h + 2);
  add('middle', l.x, l.y - pad - 4); add('middle', l.x, l.y + h + 4);
  const near = cands.length;
  // Expanding ring: 16 angles at growing radii. These get a leader line.
  for (const rad of [22, 32, 44, 58, 74, 92]) for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, px = l.x + rad * Math.cos(a), py = l.y + rad * Math.sin(a);
    add(Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle', px, py + h / 2);
  }
  const inMap = cands.map((c, i) => ({ ...c, i })).filter(c => c.box[0] >= 10 && c.box[2] <= 949 && c.box[1] >= 4);
  // Pass 1: clear of every label and dot. Pass 2: clear of labels only (a
  // small name may sit over a stray dot). Pass 3, big names only: closest slot.
  const ok = inMap.find(c => !clash(c.box, big && c.i < near ? placed : placed.concat(obstacles)))
    || inMap.find(c => !clash(c.box, placed))
    || (big ? inMap[0] : null);
  const pick = ok;
  if (!pick) { console.warn('unplaced', l.city); continue; }
  placed.push(pick.box);
  let leader = '';
  if (pick.i >= near) {
    // Leader from the dot edge to the nearest label edge.
    const lx = pick.anc === 'start' ? pick.box[0] : pick.anc === 'end' ? pick.box[2] : (pick.box[0] + pick.box[2]) / 2;
    const ly = pick.anc === 'middle' ? (pick.box[1] > l.y ? pick.box[1] : pick.box[3]) : (pick.box[1] + pick.box[3]) / 2;
    leader = `<line class="lead" x1="${l.x}" y1="${l.y}" x2="${lx.toFixed(0)}" y2="${ly.toFixed(0)}"/>`;
  }
  labels.push(`      ${leader}<text class="lbl ${l.tier}" x="${pick.x.toFixed(0)}" y="${pick.y.toFixed(0)}" text-anchor="${pick.anc}">${esc(l.city.toUpperCase())} <tspan class="n">${l.count}</tspan></text>`);
}

const svg = `  <svg class="reach-map" viewBox="0 0 959 593" role="img"
       aria-label="Map of the United States showing where providers have uploaded protocols">
${states.map(p => '      ' + p).join('\n')}
${dots}
${labels.join('\n')}
  </svg>`;

const stats = [
  [reach.totalUploads.toLocaleString('en-US'), 'uploads'],
  [reach.statesRepresented, 'states'],
  [reach.distinctProtocols.toLocaleString('en-US'), 'protocol sets'],
  [reach.pagesProcessed.toLocaleString('en-US'), 'pages read'],
].map(([n, l]) => `      <div><span class="stat-n">${n}</span><span class="stat-l">${l}</span></div>`).join('\n');

writeFileSync('assets/reach-map.html', `${svg}
    <div class="reach-stats">
${stats}
    </div>
`);
console.log(`wrote assets/reach-map.html — ${states.length} states, ${locales.length} locations, ${labels.length} labeled`);
