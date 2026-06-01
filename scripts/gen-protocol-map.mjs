#!/usr/bin/env node
// Generates blog/images/protocol-map-51.svg: a dark/amber US map with one dot
// per state in the 51-protocol research sample, labeled with service names.
// Source of truth = the research sample-summary.json. State outlines + coords
// are reused from index.html's reach map (viewBox 0 0 959 593).
import fs from 'fs/promises';

const SAMPLE = '/Users/jadenschwartz/Desktop/Entrepreneurship/APPS/PQ-B2C/research/compare-mining-2026-05/data/sample/sample-summary.json';
const INDEX = 'index.html';
const OUT = 'blog/images/protocol-map-51.svg';

// Per-state dot coords (viewBox 0 0 959 593), reused from pull-firestore-stats.mjs
// STATE_CITIES, with Houston/TX corrected. label.side picks where the text sits.
const ST = {
  CA:{x:98,y:343}, CO:{x:324,y:263}, MA:{x:895,y:151}, UT:{x:221,y:212},
  WA:{x:122,y:71}, FL:{x:745,y:545}, MN:{x:526,y:154}, TX:{x:484,y:497},
  NV:{x:183,y:312}, OR:{x:60,y:90}, NY:{x:858,y:185}, AZ:{x:182,y:366},
  MD:{x:805,y:248}, CT:{x:870,y:182}, NC:{x:760,y:340}, WI:{x:608,y:190},
  ME:{x:890,y:115}, NJ:{x:835,y:205}, IA:{x:540,y:215}, WV:{x:740,y:278},
  NH:{x:880,y:140}, IL:{x:615,y:224}, MI:{x:665,y:178}, SC:{x:730,y:382},
};

// State -> displayed labels (concise). Trailing "+N" when more services exist.
function labelFor(state, names) {
  const clean = names
    .filter(n => !/unidentified|mis-uploaded|reference\)|older|plain-text/i.test(n))
    .map(n => n.replace(/\s*\(.*?\)\s*/g, '').trim());
  const uniq = [...new Set(clean)];
  return uniq;
}

const SHORT = {
  CA:['LA County','Alameda Co','Antelope Valley','+ REMSA Riverside'],
  CO:['Denver Metro','Denver City','Boulder Co'],
  MA:['Massachusetts STP'],
  UT:['UT Lifestar','Mountain West'],
  WA:['Eastside/ECEMS','Thurston Co','Grant/Chelan'],
  FL:['Miami','Palm Beach','W. Palm Beach'],
  MN:['Minneapolis Fire','Mayo (ref)'],
  TX:['CareFlite DFW','South Plains (Lubbock)'],
  NV:['Clark Co (Las Vegas)','REMSA (Reno)'],
  OR:['Tualatin Valley','Dallas Fire OR'],
  NY:['NYC REMAC','NYS Collaborative'],
  AZ:['AZ Red Book','Metro Phoenix'],
  MD:['Maryland Statewide'],
  CT:['Connecticut Statewide'],
  NC:['North Carolina OEMS'],
  WI:['Aurora South WI'],
  ME:['Maine EPRIP'],
  NJ:['New Jersey Statewide'],
  IA:['UnityPoint AirCare'],
  WV:['West Virginia Statewide'],
  NH:['New Hampshire v9.3'],
  IL:['NW Chicago EMSS'],
  MI:['Berrien Co MI'],
  SC:['Kershaw Co SC'],
};

// Label placement: side ('l'|'r') and vertical nudge to avoid the dot/edges.
const PLACE = {
  WA:['r',0], OR:['l',0], CA:['l',0], NV:['l',6], UT:['l',-2], AZ:['l',8],
  CO:['l',0], TX:['l',10], MN:['l',-4], IA:['l',2], WI:['l',-6], IL:['l',8],
  MI:['r',-8], ME:['r',-4], NH:['r',-2], MA:['r',2], NY:['r',-6], CT:['r',6],
  NJ:['r',2], MD:['r',6], WV:['l',2], NC:['r',2], SC:['r',2], FL:['r',0],
};

const main = async () => {
  const sample = JSON.parse(await fs.readFile(SAMPLE, 'utf8'));
  const idx = await fs.readFile(INDEX, 'utf8');

  // Pull the reach-svg block and grab all <path class="state ..." d="..."> outlines.
  const svgStart = idx.indexOf('<svg class="reach-svg"');
  const svgEnd = idx.indexOf('</svg>', svgStart);
  const block = idx.slice(svgStart, svgEnd);
  const paths = [...block.matchAll(/<path class="state[^"]*"[^>]*?\sd="([^"]+)"/g)].map(m => m[1]);

  // Count services per state (skip non-US: ??, NZ; National handled as a footnote).
  const byState = {};
  for (const s of sample.services) {
    const st = s.state;
    if (!st || st === 'NZ' || st === 'US' || st === '?' || st === '??') continue;
    byState[st] = (byState[st] || 0) + 1;
  }
  const total = Object.values(byState).reduce((a, b) => a + b, 0);

  const W = 959, H = 593;
  // Pad the viewBox so left/right labels aren't clipped. Map paths stay in 0..959.
  const PADL = 150, PADR = 175, PADB = 16;
  const stateOutlines = paths
    .map(d => `<path d="${d}" fill="#13161d" stroke="#2a2f3a" stroke-width="0.8"/>`)
    .join('\n');

  // Dots + labels
  const dots = [];
  const labels = [];
  for (const [st, n] of Object.entries(byState)) {
    const c = ST[st];
    if (!c) continue;
    const r = n >= 4 ? 6.5 : n >= 2 ? 5 : 4;
    dots.push(
      `<circle cx="${c.x}" cy="${c.y}" r="${r + 6}" fill="none" stroke="#ffb000" stroke-width="0.8" opacity="0.35"/>` +
      `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="#ffb000"/>`
    );
    const lines = SHORT[st] || [st];
    const [side, dy] = PLACE[st] || ['r', 0];
    const lx = side === 'r' ? c.x + r + 12 : c.x - r - 12;
    const anchor = side === 'r' ? 'start' : 'end';
    const ly0 = c.y + dy - ((lines.length - 1) * 12) / 2;
    const head = `<tspan x="${lx}" font-weight="700" fill="#f4f6fb">${esc(lines[0])}</tspan>` +
      (n > 1 ? `<tspan dx="6" font-weight="700" fill="#ffb000">${n}</tspan>` : '');
    const tail = lines.slice(1).map((l, i) =>
      `<tspan x="${lx}" dy="13" fill="#9aa3b2">${esc(l)}</tspan>`).join('');
    labels.push(
      `<text x="${lx}" y="${ly0}" text-anchor="${anchor}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11">${head}${tail}</text>`
    );
  }

  const VW = W + PADL + PADR, VH = H + PADB;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PADL} 0 ${VW} ${VH}" role="img" aria-label="US map showing the ${total}+ EMS services in the 51-protocol research sample, spread across all four census regions">
  <rect x="${-PADL}" y="0" width="${VW}" height="${VH}" fill="#0a0c10"/>
  <g>${stateOutlines}</g>
  <g>${dots.join('\n')}</g>
  <g>${labels.join('\n')}</g>
  <text x="${-PADL + 24}" y="${H + PADB - 8}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="13" fill="#9aa3b2">51 EMS protocols mined &#183; West 22 &#183; South 9 &#183; Northeast 9 &#183; Midwest 6 &#183; + 1 national, 1 intl reference</text>
</svg>
`;
  await fs.writeFile(OUT, svg);
  console.log(`Wrote ${OUT}: ${total} US services across ${Object.keys(byState).length} states`);
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

main();
