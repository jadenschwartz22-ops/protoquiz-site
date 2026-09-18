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
    : c.tier === 'A' ? 'named by a state record'
    : `tier ${c.tier}, inferred`;
  return `<path d="${d}" fill="${COL[own] ?? COL.unknown}" fill-opacity="${op}" class="cty">`
    + `<title>${esc(c.name)}, ${c.st}: ${LABEL[own] ?? own} — ${tierWord}</title></path>`;
});

const states = Object.values(geo.states).map(d => `<path d="${d}" class="stl"/>`).join('');

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
  <svg viewBox="0 0 975 610" role="img" aria-label="Every US county coloured by who owns the agency that answers the 911 call" class="rm-svg">
${paths.map(p => '    ' + p).join('\n')}
    ${states}
  </svg>
  <figcaption class="rm-cap">
    <span class="rm-keys">
${legend}
      <span class="rm-key"><i class="rm-fade"></i>fainter &#61; weaker evidence</span>
    </span>
    Every county in the country, coloured by who owns the agency that answers the 911 call. <strong>${n(answered)}</strong> of ${n(Object.keys(S).length)} counties have an answer, and <strong>${n(nA)}</strong> of those &mdash; ${Math.round((popA / tot) * 100)}% of the population &mdash; are named directly by a state or agency record. The rest are inferred from licensing rosters and Medicare billing, and are drawn fainter: an inferred county is a lead, not a fact.
  </figcaption>
</figure>`;

writeFileSync('assets/research-map.html', html);
console.log(`wrote assets/research-map.html (${drawn} counties, ${(html.length / 1024).toFixed(0)} KB)`);
