// scripts/build-research-map.mjs — the research map: who answers 911, by COUNTY.
//
// Writes assets/research-map.html, the inline SVG that build-research.mjs embeds.
//
// PER-COUNTY, NOT PER-STATE, and that is the point. A state fill says "Texas is
// private", which is false: Texas is fire, private and county services county by
// county. Colouring a state by its most common model makes a claim the data does not
// support and hides the actual finding, which is that the model changes at county
// lines.
//
// CONFIDENCE IS DRAWN, NOT FOOTNOTED. Per RESUME_911_MAP.md only tier A counties have
// a source naming the county; B/C/D are inference and are "wrong by construction" (an
// agency placed at its billing address; IFT and air carriers mixed in with 911
// responders). Opacity carries the tier exactly as build_map.py already does it, so a
// guess renders visibly faint and no county is published as known when it is not.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const GEO = 'data/county-paths.json';
const CNTY = 'data/county-911.json';
for (const f of [GEO, CNTY]) {
  if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(1); }
}
const geo = JSON.parse(readFileSync(GEO, 'utf8'));
const S = JSON.parse(readFileSync(CNTY, 'utf8'));

// Okabe-Ito, matching build_map.py's county map and the ownership donut, so a model
// means one thing in every artifact.
const COL = {
  public: '#0072B2', private: '#D55E00', hospital: '#009E73',
  mixed: '#8C6BB1', unknown: '#c9c6bf',
};
const OPACITY = { A: 1, B: 0.85, C: 0.62, D: 0.38 };
const LABEL = {
  public: 'Public', private: 'Private', hospital: 'Hospital',
  mixed: 'Mixed', unknown: 'Unknown',
};

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = x => x.toLocaleString('en-US');

let drawn = 0;
const paths = Object.entries(geo.counties).map(([fips, d]) => {
  const c = S[fips];
  if (!c) return `<path d="${d}" fill="#eeece6"/>`;
  drawn++;
  const blank = c.tier === '-';
  const own = blank ? 'unknown' : c.ownership;
  const op = blank ? 0.22 : (OPACITY[c.tier] ?? 0.4);
  const tierWord = blank ? 'no usable source'
    : c.tier === 'A' ? (c.source === 'local' ? 'named by a county or agency source' : 'named by a state record')
    : `tier ${c.tier}, inferred`;
  // data-f is the county FIPS. The detail panel joins on it rather than on the title
  // text. "Name, ST" happens to be unique today (checked: 0 collisions across 3,144),
  // but it is display copy -- 422 county names repeat across states, so the state
  // suffix is the only thing keeping it unique, and an escaped ampersand or a renamed
  // county would silently break the join. FIPS is the identifier; the title is words.
  return `<path d="${d}" fill="${COL[own] ?? COL.unknown}" fill-opacity="${op}" class="cty" data-f="${fips}">`
    + `<title>${esc(c.name)}, ${c.st}: ${LABEL[own] ?? own} — ${tierWord}</title></path>`;
});

const states = Object.values(geo.states).map(d => `<path d="${d}" class="stl"/>`).join('');

// The viewBox is MEASURED from the paths, not declared. The old fixed "0 0 975 610" held
// 51px of nothing at the top and 30px at the bottom, and the projection reaches past it
// on the right. Rendered into that box the slack became dead margin, which shrank the map
// and with it every county's hit target.
//
// The left bound skips the ANTIMERIDIAN TAIL. Aleutians West trails to x=-140 because
// the Aleutians cross 180 degrees longitude, and framing to it pushed the other 3,132
// counties right by 140 units to keep a few specks of island in view. The tail is found
// as a GAP in the distribution -- a run of empty space wider than any real coastline gap
// -- rather than by a percentile (too close to real coastline to be safe at this scale)
// or a hardcoded FIPS (a renumbered county would silently bring the margin back).
const VIEWBOX = (() => {
  const xs = [], ys = [];
  for (const d of Object.values(geo.counties)) {
    const re = /(-?\d+\.?\d*),(-?\d+\.?\d*)/g;
    let m;
    while ((m = re.exec(d))) { xs.push(+m[1]); ys.push(+m[2]); }
  }
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  // Measured on this projection: the antimeridian jump is 154 units wide and the largest
  // gap anywhere else is 4.1, so GAP sits far above every real coastline gap and far
  // below the tail. Only the leftmost 2% of points are searched -- a gap that size in
  // the middle of the country would be a broken projection, not something to crop to.
  const GAP = 40;
  let i = 0;
  const limit = Math.floor(xs.length * 0.02);
  for (let k = 0; k < limit; k++) if (xs[k + 1] - xs[k] > GAP) i = k + 1;
  const x0 = xs[i], x1 = xs[xs.length - 1], y0 = ys[0], y1 = ys[ys.length - 1];
  const pad = 6;
  const r = n => Math.round(n * 10) / 10;
  return `${r(x0 - pad)} ${r(y0 - pad)} ${r(x1 - x0 + pad * 2)} ${r(y1 - y0 + pad * 2)}`;
})();

// Population share is the honest denominator for coverage: the counties with no
// answer are mostly small, so a raw county count overstates the gap.
const tot = Object.values(S).reduce((a, c) => a + (c.pop || 0), 0);
const popA = Object.values(S).filter(c => c.tier === 'A').reduce((a, c) => a + (c.pop || 0), 0);
const nA = Object.values(S).filter(c => c.tier === 'A').length;
const answered = Object.values(S).filter(c => c.tier !== '-').length;

const legend = ['public', 'private', 'hospital', 'mixed']
  .map(k => `      <span class="rm-key"><i style="background:${COL[k]}"></i>${LABEL[k]}</span>`)
  .join('\n');

const html = `<figure class="research-map">
  <svg viewBox="${VIEWBOX}" role="img" aria-label="Every US county coloured by who owns the agency that answers the 911 call" class="rm-svg">
${paths.map(p => '    ' + p).join('\n')}
    ${states}
  </svg>
  <figcaption class="rm-cap">
    <span class="rm-keys">
${legend}
      <span class="rm-key"><i class="rm-fade"></i>fainter &#61; weaker evidence</span>
    </span>
    Every county, coloured by who owns the agency that answers the 911 call. <strong>${n(answered)}</strong> of ${n(Object.keys(S).length)} have an answer; <strong>${n(nA)}</strong> of those &mdash; ${Math.round((popA / tot) * 100)}% of the population &mdash; are named directly by a state or agency record. The rest are inferred and drawn fainter: a lead, not a fact.
  </figcaption>
</figure>`;

writeFileSync('assets/research-map.html', html);
console.log(`wrote assets/research-map.html (${drawn} counties, ${(html.length / 1024).toFixed(0)} KB)`);
