// scripts/build-map.mjs — the reach map as self-contained, themed SVGs.
//
// Two views, US (default) and WORLD, toggled on /app. State outlines come from
// data/us-state-paths.txt, continents from data/world-land-paths.txt (the
// projection pull-firestore-stats.mjs fits its world x/y against). Dots, labels and
// state shading come from assets/reach-map.js, which /app re-runs in the browser on
// the live data/reach-stats.json; what is baked here is the no-JS fallback.
// Colours are tokens, so the map flips with [data-shift].
import { readFileSync, writeFileSync } from 'node:fs';
import { reachLayers, pickHint } from '../assets/reach-map.js';

const paths = readFileSync('data/us-state-paths.txt', 'utf8')
  .split('\n').filter(Boolean)
  .map(p => p.replace(/\sfill="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, ''))
  .map(p => (p.endsWith('/>') ? p : p.replace(/>$/, '/>')));
const land = readFileSync('data/world-land-paths.txt', 'utf8').split('\n').filter(Boolean);
const reach = JSON.parse(readFileSync('data/reach-stats.json', 'utf8'));
const L = reachLayers(reach);

const states = paths.map(p => {
  const st = (p.match(/s-([a-z]{2})/) || [])[1]?.toUpperCase();
  return p.replace('<path', `<path data-b="${L.byState[st] || 'off'}"`);
});

writeFileSync('assets/reach-map.html', `  <svg class="reach-map" data-view="us" viewBox="0 0 959 593" role="img"
       aria-label="Map of the United States showing where providers have uploaded protocols">
${states.map(p => '      ' + p).join('\n')}
      <g class="reach-layer">${L.us}</g>
  </svg>
  <svg class="reach-map" data-view="world" viewBox="0 0 950 620" role="img" hidden
       aria-label="World map showing where providers outside the US have uploaded protocols">
${land.map(p => '      ' + p.replace('<path', '<path class="land"')).join('\n')}
      <g class="reach-layer">${L.world}</g>
  </svg>
    <p class="reach-pick" data-reach-pick aria-live="polite">${pickHint(L)}</p>
    <div class="reach-stats">
    </div>
`);
console.log(`wrote assets/reach-map.html — ${states.length} states, ${L.located} located of ${reach.totalUploads} uploads`);
