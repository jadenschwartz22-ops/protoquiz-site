// scripts/build-map.mjs — the reach map as a self-contained, themed SVG.
//
// Lifted from the old homepage's interactive map, but rebuilt STATIC: the original
// carried a US/World toggle, zoom, a detail panel and ~38KB of driving JS. On /app we
// want the picture, not the apparatus. Dots come from data/reach-stats.json, so the
// map still tells the truth on every build.
//
// Colours are tokens, so the map flips with [data-shift] like everything else.
import { readFileSync, writeFileSync } from 'node:fs';

const paths = readFileSync('/tmp/us_paths.txt', 'utf8')
  .split('\n').filter(Boolean)
  .map(p => p.replace(/\sfill="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, ''))
  // The source markup self-closes these. Losing the slash nests every later path
  // INSIDE the first one, so only Alabama renders and the rest get a zero bbox.
  .map(p => (p.endsWith('/>') ? p : p.replace(/>$/, '/>')));

const reach = JSON.parse(readFileSync('data/reach-stats.json', 'utf8'));
const locales = (reach.locales || []).filter(l => l.x != null && l.y != null);

// The old map's dot scale, kept so the picture matches what people have seen.
const R = { hot: 7, warm: 5, on: 3.5, tiny: 2.5 };

const dots = locales.map(l => {
  const r = R[l.tier] || 2.5;
  return `      <circle class="reach-dot t-${l.tier}" cx="${l.x}" cy="${l.y}" r="${r}">`
       + `<title>${l.city}, ${l.state} — ${l.count} protocol${l.count === 1 ? '' : 's'}</title></circle>`;
}).join('\n');

const svg = `  <svg class="reach-map" viewBox="0 0 959 593" role="img"
       aria-label="Map of the United States showing where providers have uploaded protocols">
${paths.map(p => '      ' + p).join('\n')}
${dots}
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
console.log(`wrote assets/reach-map.html — ${paths.length} states, ${locales.length} locations`);
