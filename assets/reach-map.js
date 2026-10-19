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

// A statewide dot is named for the state alone ("Colorado statewide"); a city dot is "Denver, CO".
export const usName = l => (l.statewide ? l.city : `${l.city}, ${l.state}`);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const plural = n => `${Number(n).toLocaleString('en-US')} upload${n === 1 ? '' : 's'}`;
export const bucket = n => n >= 20 ? 'hot' : n >= 8 ? 'warm' : n >= 1 ? 'on' : 'off';

const dot = (l, tier, name, k = 1) =>
  `<g class="lc ${tier}${l.statewide ? ' sw' : ''}" data-name="${esc(name)}" data-n="${l.count}" tabindex="0" role="button" aria-label="${esc(name)}, ${plural(l.count)}">`
  + `<circle class="halo" cx="${l.x}" cy="${l.y}" r="${+(H[tier] * k).toFixed(2)}"/><circle class="core" cx="${l.x}" cy="${l.y}" r="${+(R[tier] * k).toFixed(2)}"/></g>`;

// items: [{ x, y, name, count, cls, sz, big, key }] in priority order; box = the visible
// [x0, y0, x1, y1]; k = map units per screen px (1 unzoomed, <1 zoomed in: labels and
// dots keep their screen size, so zooming spreads them apart and more names fit); dots = every dot a label should avoid. Dense maps (US) let a big name take a
// close slot over a stray dot; sparse ones (world) pass strict so no dot is hidden.
function placeLabels(items, [bx0, by0, bx1, by1], { dots = items, strict = false, k = 1 } = {}) {
  const obstacles = dots.map(l => [l.x - 4 * k, l.y - 4 * k, l.x + 4 * k, l.y + 4 * k]);
  const placed = [], out = [];
  const clash = (b, list, px = 2 * k, py = k) =>
    list.some(o => !(b[2] < o[0] - px || b[0] > o[2] + px || b[3] < o[1] - py || b[1] > o[3] + py));
  for (const l of items) {
    const { sz, big } = l;
    const w = `${l.name} ${l.count}`.length * sz * 0.66 * k, h = sz * 1.15 * k, pad = 6 * k;
    const cands = [];
    const add = (anc, x, y) => {
      const x0 = anc === 'start' ? x : anc === 'end' ? x - w : x - w / 2;
      cands.push({ anc, x, y, box: [x0, y - h, x0 + w, y] });
    };
    add('start', l.x + pad, l.y - pad); add('end', l.x - pad, l.y - pad);
    add('start', l.x + pad, l.y + h + 2 * k); add('end', l.x - pad, l.y + h + 2 * k);
    add('middle', l.x, l.y - pad - 4 * k); add('middle', l.x, l.y + h + 4 * k);
    const near = cands.length;
    for (const rad of [22, 32, 44, 58, 74, 92]) for (let j = 0; j < 24; j++) {
      const a = (j / 24) * Math.PI * 2, px = l.x + rad * k * Math.cos(a), py = l.y + rad * k * Math.sin(a);
      add(Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle', px, py + h / 2);
    }
    const inMap = cands.map((c, i) => ({ ...c, i })).filter(c => c.box[0] >= bx0 + 10 * k && c.box[2] <= bx1 - 10 * k && c.box[1] >= by0 + 4 * k && c.box[3] <= by1);
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
      leader = `<line class="lead" x1="${l.x}" y1="${l.y}" x2="${+lx.toFixed(1)}" y2="${+ly.toFixed(1)}"/>`;
    }
    out.push(`${leader}<text class="lbl ${l.cls}"${k === 1 ? '' : ` style="font-size:${+(sz * k).toFixed(2)}px;stroke-width:${+(4 * k).toFixed(2)}px"`} data-for="${esc(l.key)}" x="${+pick.x.toFixed(1)}" y="${+pick.y.toFixed(1)}" text-anchor="${pick.anc}">${esc(l.name)} <tspan class="n">${l.count}</tspan></text>`);
  }
  return out;
}

// view: { us: { box, k }, world: { box, k } }, the visible box and zoom of each map;
// defaults to the whole map. -> { us, world, byState: {ST: bucket}, located, unlocated }
export function reachLayers(reach, view = {}) {
  const vu = view.us || { box: [0, 0, 959, 593], k: 1 }, vw = view.world || { box: [0, 0, 950, 620], k: 1 };
  const seen = ({ box: [x0, y0, x1, y1] }) => l => l.x >= x0 && l.x <= x1 && l.y >= y0 && l.y <= y1;
  const has = l => l.x != null && l.y != null;
  const locales = (reach.locales || []).filter(has).sort((a, b) => b.count - a.count);
  const intl = (reach.internationalLocales || []).filter(has).sort((a, b) => b.count - a.count);
  const usLocated = locales.reduce((t, l) => t + l.count, 0);
  const intlLocated = intl.reduce((t, l) => t + l.count, 0);

  const us = [
    ...locales.map(l => dot(l, l.tier, usName(l), vu.k)),
    ...placeLabels(locales.filter(seen(vu)).map(l => ({
      x: l.x, y: l.y, name: l.city.replace(/ statewide$/, '').toUpperCase(), count: l.count, key: usName(l),
      cls: l.tier, sz: SZ[l.tier], big: l.tier === 'hot' || l.tier === 'warm',
    })), vu.box, { dots: locales, k: vu.k }),
  ].join('');

  // One dot per city, one label per country (at its busiest city), plus the US as a
  // single marker carrying the located US uploads, i.e. the sum of the US view's dots.
  const countries = [];
  for (const l of intl) if (!countries.some(c => c.country === l.country)) countries.push(l);
  const usMark = { ...US, count: usLocated };
  const world = [
    dot(usMark, 'warm', 'United States', vw.k),
    ...intl.map(l => dot(l, l.tier === 'tiny' ? 'on' : l.tier, `${l.city}, ${l.countryName}`, vw.k)),
    ...placeLabels([
      { ...usMark, name: 'US', key: 'United States', cls: 'w hot', sz: WSZ, big: true },
      ...countries.map(c => ({
        x: c.x, y: c.y, name: c.countryName.toUpperCase(), key: `${c.city}, ${c.countryName}`,
        count: intl.filter(l => l.country === c.country).reduce((t, l) => t + l.count, 0),
        cls: 'w', sz: WSZ, big: true,
      })),
    ].filter(seen(vw)), vw.box, { dots: [US, ...intl], strict: true, k: vw.k }),
  ].join('');

  const byState = Object.fromEntries(Object.entries(reach.byState || {}).map(([k, v]) => [k, bucket(v)]));
  const total = reach.totalUploads || 0;
  return { us, world, byState, usLocated, intlLocated, total, unlocated: Math.max(0, total - usLocated - intlLocated) };
}

const nf = n => n.toLocaleString('en-US');

// A place's uploaded documents: titles with the account-timestamp prefix and the "+N more"
// merge suffix stripped, same titles folded together, and the rest as one "+N more" line.
const docTitle = t => t.replace(/\.pdf$/i, '').replace(/^\d{9,}\s+/, '').replace(/\s*\+\d+ more$/, '').replace(/^[^a-z]*$/i, 'Untitled protocol');
function docList(l) {
  const by = new Map();
  for (const p of l?.topProtocols || []) by.set(docTitle(p.title), (by.get(docTitle(p.title)) || 0) + p.count);
  const rest = l ? l.count - [...by.values()].reduce((a, b) => a + b, 0) : 0;
  return `<ul class="reach-docs">${[...by].map(([t, n]) => `<li><b>${n}&times;</b> ${esc(t)}</li>`).join('')}`
    + `${rest > 0 ? `<li class="more">+ ${nf(rest)} more</li>` : ''}</ul>`;
}

// Zoom like a map: scroll wheel / trackpad, pinch, double-click, buttons; drag to pan. Scrolling
// down at full view still scrolls the page. onChange(map, views) redraws that map's dots and labels
// for the new view (views = what reachLayers takes) so they keep their size and re-spread.
function mountZoom(root, anchor, onChange) {
  const maps = [...root.querySelectorAll('.reach-map')];
  const view = new Map(maps.map(m => [m, m.getAttribute('viewBox').split(' ').map(Number)]));
  const cur = new Map([...view].map(([m, v]) => [m, [...v]]));
  const apply = m => {
    const w = cur.get(m)[2], bw = view.get(m)[2];
    m.setAttribute('viewBox', cur.get(m).map(n => +n.toFixed(1)).join(' '));
    m.style.touchAction = w < bw - 0.5 ? 'none' : 'pan-y';
    if (!m._raf) m._raf = requestAnimationFrame(() => {
      m._raf = 0;
      onChange(m, Object.fromEntries(maps.map(n => { const [x, y, nw, nh] = cur.get(n); return [n.dataset.view, { box: [x, y, x + nw, y + nh], k: nw / view.get(n)[2] }]; })));
    });
  };
  const zoom = (m, f, cx = 0.5, cy = 0.5) => {
    const [bx, by, bw, bh] = view.get(m), [x, y, w, h] = cur.get(m);
    const nw = Math.min(bw, Math.max(bw / 8, w / f)), nh = nw * bh / bw;
    const nx = Math.min(bx + bw - nw, Math.max(bx, x + (w - nw) * cx)), ny = Math.min(by + bh - nh, Math.max(by, y + (h - nh) * cy));
    cur.set(m, [nx, ny, nw, nh]); apply(m);
  };
  const shown = () => maps.find(m => !m.hasAttribute('hidden'));
  const bar = document.createElement('div');
  bar.className = 'reach-zoom';
  bar.innerHTML = '<button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" data-z="reset">Reset</button>';
  anchor.before(bar);
  bar.addEventListener('click', e => {
    const z = e.target.closest('[data-z]')?.dataset.z, m = shown();
    if (!z || !m) return;
    if (z === 'reset') { cur.set(m, [...view.get(m)]); apply(m); } else zoom(m, z === 'in' ? 1.6 : 1 / 1.6);
  });
  const frac = (m, e) => { const r = m.getBoundingClientRect(); return [(e.clientX - r.x) / r.width, (e.clientY - r.y) / r.height]; };
  for (const m of maps) {
    m.style.touchAction = 'pan-y';
    m.addEventListener('wheel', e => {
      if (!e.ctrlKey && (Math.abs(e.deltaX) > Math.abs(e.deltaY) || (e.deltaY > 0 && cur.get(m)[2] >= view.get(m)[2] - 0.5))) return;
      e.preventDefault();
      zoom(m, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * (e.ctrlKey ? 0.01 : 0.0025)), ...frac(m, e));
    }, { passive: false });
    m.addEventListener('dblclick', e => zoom(m, 2, ...frac(m, e)));
    const ptrs = new Map();
    m.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); m._moved = 0; });
    const end = e => ptrs.delete(e.pointerId);
    m.addEventListener('pointerup', end); m.addEventListener('pointercancel', end); m.addEventListener('pointerleave', end);
    m.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const [x, y, w] = cur.get(m), k = w / m.getBoundingClientRect().width;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
        ptrs.set(e.pointerId, [e.clientX, e.clientY]);
        const [c, d] = [...ptrs.values()], d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
        if (d0) zoom(m, d1 / d0, ...frac(m, { clientX: (c[0] + d[0]) / 2, clientY: (c[1] + d[1]) / 2 }));
        m._moved = 9; return;
      }
      const dx = e.clientX - p[0], dy = e.clientY - p[1];
      if (w >= view.get(m)[2] - 0.5) return;
      m._moved += Math.abs(dx) + Math.abs(dy);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (m._moved < 4) return;
      const [bx, by, bw, bh] = view.get(m), h = cur.get(m)[3];
      cur.set(m, [Math.min(bx + bw - w, Math.max(bx, x - dx * k)), Math.min(by + bh - h, Math.max(by, y - dy * k)), w, h]); apply(m);
    });
  }
}
export const pickHint = ({ unlocated }) => unlocated ? `No location: ${nf(unlocated)} uploads` : '';

// Browser: redraw from the live JSON and wire tap-to-inspect.
export function mountReach(root, reach) {
  const pick = root.querySelector('[data-reach-pick]'), note = root.querySelector('[data-reach-note]');
  if (reach) {
    const L = reachLayers(reach);
    for (const v of ['us', 'world']) { const g = root.querySelector(`.reach-map[data-view="${v}"] .reach-layer`); if (g) g.innerHTML = L[v]; }
    for (const p of root.querySelectorAll('.reach-map .state')) {
      const st = (p.getAttribute('class').match(/s-([a-z]{2})/) || [])[1]?.toUpperCase();
      if (st) p.dataset.b = L.byState[st] || 'off';
    }
    if (note) note.textContent = pickHint(L);
  }
  const places = new Map([...(reach?.locales || []).map(l => [usName(l), l]), ...(reach?.internationalLocales || []).map(l => [`${l.city}, ${l.countryName}`, l])]);
  let selName = '';
  const mark = () => root.querySelectorAll('.lc').forEach(x => x.classList.toggle('sel', x.dataset.name === selName));
  if (note && reach) mountZoom(root, note, (m, views) => {
    m.querySelector('.reach-layer').innerHTML = reachLayers(reach, views)[m.dataset.view];
    mark();
  });
  const select = g => {
    selName = g?.dataset.name || '';
    mark();
    if (!g) { if (pick) pick.textContent = ''; return; }
    if (pick) pick.innerHTML = `<b>${esc(g.dataset.name)}</b> &middot; ${plural(+g.dataset.n)}${places.has(g.dataset.name) ? docList(places.get(g.dataset.name)) : ''}`;
  };
  const target = e => {
    if (e.target.closest('.reach-map')?._moved > 4) return null;
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
