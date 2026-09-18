// scripts/build-research-map.mjs — the research map: who runs 911 EMS, by state.
//
// Writes assets/research-map.html, the inline SVG that build-research.mjs embeds.
// This asset was missing (it lived in a scratch dir that is gone), which is why
// build-research.mjs could not run; generating it from research.json means it can
// never go missing again without the data going missing too.
//
// Shaded by the state's DOMINANT model, not by a value ramp: "mostly fire-based"
// is the finding, and a gradient would invent precision the roster data does not
// have. A state whose only source is a fire-station list is hatched rather than
// filled, because its fire share is a ceiling, not a measurement -- the same rule
// the table below the map already applies with its "station list only" flag.
import { readFileSync, writeFileSync } from 'node:fs';

const R = JSON.parse(readFileSync('scratch/ems-services/research.json', 'utf8'));
// Same normalization build-map.mjs does: the source lines end with `">`, not `/>`,
// and carry their own fill/style that would win over ours.
const paths = readFileSync('data/us-state-paths.txt', 'utf8')
  .split('\n').filter(Boolean)
  .map(p => p.replace(/\sfill="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, ''))
  .map(p => (p.endsWith('/>') ? p : p.replace(/>$/, '/>')));

// Okabe-Ito, the palette the donut in build_page.py already uses, so the two
// artifacts agree on what each model looks like.
const FILL = {
  'fire-based':    '#d55e00',
  private:         '#0072b2',
  'third-service': '#009e73',
  hospital:        '#cc79a7',
  tribal:          '#e69f00',
};
const LABEL = {
  'fire-based': 'Fire-based', private: 'Private',
  'third-service': 'Third service', hospital: 'Hospital', tribal: 'Tribal',
};

const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const dominant = pct => Object.entries(pct)
  .filter(([, v]) => v > 0)
  .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

const shaded = paths.map(p => {
  const m = p.match(/class="state s-([a-z]{2})"/);
  if (!m) return p;
  const st = R.states[m[1].toUpperCase()];
  if (!st) return p.replace('<path ', '<path fill="var(--map-blank,#e8e6e0)" ');
  const top = dominant(st.pct);
  const fill = FILL[top] ?? '#e8e6e0';
  // A floor state's fill is the ceiling of its fire share, so it reads as
  // provisional: hatched over the colour, never a flat confident block.
  const thin = st.tag === 'floor' || st.tag === 'station';
  const title = `${m[1].toUpperCase()}: mostly ${LABEL[top] ?? 'unclassified'}`
    + ` (${Math.round(st.pct[top] ?? 0)}% of ${st.n.toLocaleString('en-US')} agencies)`
    + (thin ? ' — station-list source, treat as a ceiling' : '');
  // Close on the FINAL `/>`: path `d` data contains `/` characters, so replacing the
  // first occurrence rewrites the geometry instead of the tag and the state vanishes.
  const open = p.replace('<path ', `<path fill="${fill}"${thin ? ' mask="url(#thin-mask)"' : ''} `);
  return open.replace(/\/>\s*$/, `><title>${esc(title)}</title></path>`);
});

const legend = Object.entries(LABEL)
  .filter(([k]) => Object.values(R.states).some(s => dominant(s.pct) === k))
  .map(([k, l]) => `      <span class="rm-key"><i style="background:${FILL[k]}"></i>${l}</span>`)
  .join('\n');

const html = `<figure class="research-map">
  <svg viewBox="0 0 959 593" role="img" aria-label="US states shaded by the dominant 911 EMS provider model" class="rm-svg">
    <defs>
      <pattern id="thin-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#fff"/>
        <rect width="3" height="6" fill="#000"/>
      </pattern>
      <mask id="thin-mask"><rect width="959" height="593" fill="url(#thin-hatch)"/></mask>
    </defs>
${shaded.map(p => '    ' + p).join('\n')}
  </svg>
  <figcaption class="rm-cap">
    <span class="rm-keys">
${legend}
      <span class="rm-key"><i class="rm-hatch"></i>station-list source only</span>
    </span>
    Each state takes the colour of its most common model among licensed agencies, ${R.realStates} states classified as of ${R.asOf}. Hatched states are sourced from a fire-station list, so their fire share is a ceiling rather than a count.
  </figcaption>
</figure>`;

writeFileSync('assets/research-map.html', html);
console.log(`wrote assets/research-map.html (${Object.keys(R.states).length} states, ${(html.length / 1024).toFixed(0)} KB)`);
