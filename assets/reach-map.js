// assets/reach-map.js — the reach map's dots, labels and state shading from reach-stats.json.
//
// One renderer for both sides: scripts/build-map.mjs bakes it into the page as the
// no-JS fallback, and /app re-runs it in the browser on the same daily JSON as the
// stat row, so the dots can never drift from the numbers under them.
//
// Labels are sized by tier and placed by a greedy search (six close positions, then
// an expanding ring); a label pushed away from its dot gets a thin leader line. Hot
// and warm cities are placed first and never dropped. Counts are uploads.

const R = { hot: 7, warm: 5, on: 3.5, tiny: 2.5 };
const H = { hot: 18, warm: 11, on: 8, tiny: 6 };
const SZ = { hot: 16, warm: 13, on: 10.5, tiny: 8.5 };
const WSZ = 22;
const US = { x: 195, y: 205 };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const plural = n => `${Number(n).toLocaleString('en-US')} upload${n === 1 ? '' : 's'}`;
export const bucket = n => n >= 20 ? 'hot' : n >= 8 ? 'warm' : n >= 1 ? 'on' : 'off';

const dot = (l, tier, name) =>
  `<g class="lc ${tier}" data-name="${esc(name)}" data-n="${l.count}" tabindex="0" role="button" aria-label="${esc(name)}, ${plural(l.count)}">`
  + `<circle class="halo" cx="${l.x}" cy="${l.y}" r="${H[tier]}"/><circle class="core" cx="${l.x}" cy="${l.y}" r="${R[tier]}"/></g>`;

// items: [{ x, y, name, count, cls, sz, big, key }] in priority order; width = viewBox
// width; dots = every dot a label should avoid. Dense maps (US) let a big name take a
// close slot over a stray dot; sparse ones (world) pass strict so no dot is hidden.
function placeLabels(items, width, { dots = items, strict = false } = {}) {
  const obstacles = dots.map(l => [l.x - 4, l.y - 4, l.x + 4, l.y + 4]);
  const placed = [], out = [];
  const clash = (b, list, px = 2, py = 1) =>
    list.some(o => !(b[2] < o[0] - px || b[0] > o[2] + px || b[3] < o[1] - py || b[1] > o[3] + py));
  for (const l of items) {
    const { sz, big } = l;
    const w = `${l.name} ${l.count}`.length * sz * 0.66, h = sz * 1.15, pad = 6;
    const cands = [];
    const add = (anc, x, y) => {
      const x0 = anc === 'start' ? x : anc === 'end' ? x - w : x - w / 2;
      cands.push({ anc, x, y, box: [x0, y - h, x0 + w, y] });
    };
    add('start', l.x + pad, l.y - pad); add('end', l.x - pad, l.y - pad);
    add('start', l.x + pad, l.y + h + 2); add('end', l.x - pad, l.y + h + 2);
    add('middle', l.x, l.y - pad - 4); add('middle', l.x, l.y + h + 4);
    const near = cands.length;
    for (const rad of [22, 32, 44, 58, 74, 92]) for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2, px = l.x + rad * Math.cos(a), py = l.y + rad * Math.sin(a);
      add(Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle', px, py + h / 2);
    }
    const inMap = cands.map((c, i) => ({ ...c, i })).filter(c => c.box[0] >= 10 && c.box[2] <= width - 10 && c.box[1] >= 4);
    // Pass 1: clear of every label and dot. Pass 2: clear of labels only. Pass 3, big names only: closest slot.
    const pick = inMap.find(c => !clash(c.box, !strict && big && c.i < near ? placed : placed.concat(obstacles)))
      || inMap.find(c => !clash(c.box, placed))
      || (big ? inMap[0] : null);
    if (!pick) continue;
    placed.push(pick.box);
    let leader = '';
    if (pick.i >= near) {
      const lx = pick.anc === 'start' ? pick.box[0] : pick.anc === 'end' ? pick.box[2] : (pick.box[0] + pick.box[2]) / 2;
      const ly = pick.anc === 'middle' ? (pick.box[1] > l.y ? pick.box[1] : pick.box[3]) : (pick.box[1] + pick.box[3]) / 2;
      leader = `<line class="lead" x1="${l.x}" y1="${l.y}" x2="${lx.toFixed(0)}" y2="${ly.toFixed(0)}"/>`;
    }
    out.push(`${leader}<text class="lbl ${l.cls}" data-for="${esc(l.key)}" x="${pick.x.toFixed(0)}" y="${pick.y.toFixed(0)}" text-anchor="${pick.anc}">${esc(l.name)} <tspan class="n">${l.count}</tspan></text>`);
  }
  return out;
}

// -> { us, world, byState: {ST: bucket}, located, unlocated }
export function reachLayers(reach) {
  const has = l => l.x != null && l.y != null;
  const locales = (reach.locales || []).filter(has).sort((a, b) => b.count - a.count);
  const intl = (reach.internationalLocales || []).filter(has).sort((a, b) => b.count - a.count);
  const usName = l => `${l.city}, ${l.state}`;
  const usLocated = locales.reduce((t, l) => t + l.count, 0);
  const intlLocated = intl.reduce((t, l) => t + l.count, 0);

  const us = [
    ...locales.map(l => dot(l, l.tier, usName(l))),
    ...placeLabels(locales.map(l => ({
      x: l.x, y: l.y, name: l.city.toUpperCase(), count: l.count, key: usName(l),
      cls: l.tier, sz: SZ[l.tier], big: l.tier === 'hot' || l.tier === 'warm',
    })), 959),
  ].join('');

  // One dot per city, one label per country (at its busiest city), plus the US as a
  // single marker carrying the located US uploads, i.e. the sum of the US view's dots.
  const countries = [];
  for (const l of intl) if (!countries.some(c => c.country === l.country)) countries.push(l);
  const usMark = { ...US, count: usLocated };
  const world = [
    dot(usMark, 'warm', 'United States'),
    ...intl.map(l => dot(l, l.tier === 'tiny' ? 'on' : l.tier, `${l.city}, ${l.countryName}`)),
    ...placeLabels([
      { ...usMark, name: 'US', key: 'United States', cls: 'w hot', sz: WSZ, big: true },
      ...countries.map(c => ({
        x: c.x, y: c.y, name: c.countryName.toUpperCase(), key: `${c.city}, ${c.countryName}`,
        count: intl.filter(l => l.country === c.country).reduce((t, l) => t + l.count, 0),
        cls: 'w', sz: WSZ, big: true,
      })),
    ], 950, { dots: [US, ...intl], strict: true }),
  ].join('');

  const byState = Object.fromEntries(Object.entries(reach.byState || {}).map(([k, v]) => [k, bucket(v)]));
  const total = reach.totalUploads || 0;
  return { us, world, byState, usLocated, intlLocated, total, unlocated: Math.max(0, total - usLocated - intlLocated) };
}

const nf = n => n.toLocaleString('en-US');
export const pickHint = ({ unlocated }) => unlocated ? `No location: ${nf(unlocated)} uploads` : '';

// Browser: redraw from the live JSON and wire tap-to-inspect.
export function mountReach(root, reach) {
  const pick = root.querySelector('[data-reach-pick]');
  if (reach) {
    const L = reachLayers(reach);
    for (const v of ['us', 'world']) { const g = root.querySelector(`.reach-map[data-view="${v}"] .reach-layer`); if (g) g.innerHTML = L[v]; }
    for (const p of root.querySelectorAll('.reach-map .state')) {
      const st = (p.getAttribute('class').match(/s-([a-z]{2})/) || [])[1]?.toUpperCase();
      if (st) p.dataset.b = L.byState[st] || 'off';
    }
    if (pick) pick.textContent = pickHint(L);
  }
  const hint = pick?.textContent;
  const select = g => {
    root.querySelectorAll('.lc.sel').forEach(x => x.classList.remove('sel'));
    if (!g) { if (pick) pick.textContent = hint; return; }
    g.classList.add('sel');
    if (pick) pick.innerHTML = `<b>${esc(g.dataset.name)}</b> &middot; ${plural(+g.dataset.n)}`;
  };
  const target = e => {
    const lbl = e.target.closest('.lbl[data-for]');
    const map = e.target.closest('.reach-map'), lcs = [...map.querySelectorAll('.lc')];
    if (e.target.closest('.lc')) return e.target.closest('.lc');
    if (lbl) return lcs.find(g => g.dataset.name === lbl.dataset.for);
    // Phone-sized dots are a few px: take the nearest one within a fingertip.
    let best = null, bd = 24 ** 2;
    for (const g of lcs) {
      const r = g.querySelector('.core').getBoundingClientRect();
      const d = (r.x + r.width / 2 - e.clientX) ** 2 + (r.y + r.height / 2 - e.clientY) ** 2;
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  };
  root.addEventListener('click', e => { if (e.target.closest('.reach-map')) select(target(e)); });
  root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.lc')) { e.preventDefault(); select(e.target.closest('.lc')); } });
}
