// scripts/build-practice-charts.mjs — the charts for /research/practice and /research/changes.
//
// Both are generated from the SAME extracts the pages publish, the way the volume thumbs
// on /research are. Nothing here is illustration: every bar is a count of agencies or
// editions that the page also prints in a table, so a reader can check the picture
// against the numbers on the same screen.
//
// SIZING. These SVGs CROP, they do not scale. The viewBox is computed from the number of
// rows at full text size and the page gives them width:100% with no height cap, so the
// labels render at the size they were designed at. The dose chart on /research learned
// this the hard way: fitting eight rows into a fixed height shrank the medication names
// below reading size and turned a chart into decoration.
//
// COLOR lives in research.css, not here, so the palette has one home. It is Okabe-Ito,
// the colorblind-safe set the county map and the carriage chart already use: BLUE is the
// permissive answer (act now), VERMILION the restrictive one (call first), and GRAY the
// unstated third. Gray is deliberately NOT a fainter blue -- "not stated" is a different
// kind of answer, not a weaker version of one of the other two.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  readProcedures, readTimeline, byProcedure, contested,
  verifiedEvents, isAdd, escapeHtml,
} from './practice-data.mjs';

const OUT = 'assets/practice-charts.json';

// ── 1. contested procedures: where agencies disagree about who may decide ────────────
// A diverging bar, centered on the split rather than left-aligned, because the question
// is which way each procedure leans and a common baseline makes that a length
// comparison instead of an angle one. Rows are ordered by how many agencies STATED an
// answer, so the most evidenced disagreements sit at the top.
function contestedChart(groups) {
  const rows = contested(groups).slice(0, 12);
  if (!rows.length) return { svg: '', note: '', rows: 0 };

  const W = 820, RH = 30, PAD_T = 30, PAD_B = 34;
  const LAB = 268, GUT = 10;
  const PLOT_X = LAB + GUT, PLOT_W = W - PLOT_X - 104;
  const MID = PLOT_X + PLOT_W / 2;
  const H = PAD_T + rows.length * RH + PAD_B;

  // One scale for every row: the widest single side sets the half-width, so a row with
  // 128 contacts is drawn longer than one with 36 and the rows stay comparable. Scaling
  // each row to its own width would make every procedure look equally divided.
  const MAXSIDE = Math.max(...rows.map(r => Math.max(r.standing, r.contact_required)));
  const x = v => (v / MAXSIDE) * (PLOT_W / 2);

  const bars = rows.map((r, i) => {
    const y = PAD_T + i * RH;
    const ws = x(r.standing), wc = x(r.contact_required);
    // Counts sit OUTSIDE their bar when the bar is too short to hold them, so a small
    // number is never clipped by the shape it describes.
    const inS = ws > 26, inC = wc > 26;
    // The conditional count sits in its own column, not in the bar: drawing it as a
    // third segment would put it on one side of the axis and imply it leans that way.
    return `<g>
      <text x="${LAB}" y="${y + 14}" class="pc-lab" text-anchor="end">${escapeHtml(r.label)}</text>
      <rect x="${(MID - ws).toFixed(1)}" y="${y + 3}" width="${ws.toFixed(1)}" height="15" class="pc-so"/>
      <rect x="${MID}" y="${y + 3}" width="${wc.toFixed(1)}" height="15" class="pc-cr"/>
      <text x="${(MID - ws + (inS ? 5 : -5)).toFixed(1)}" y="${y + 14.5}" class="pc-num${inS ? ' pc-in' : ''}" text-anchor="${inS ? 'start' : 'end'}">${r.standing}</text>
      <text x="${(MID + wc + (inC ? -5 : 5)).toFixed(1)}" y="${y + 14.5}" class="pc-num${inC ? ' pc-in' : ''}" text-anchor="${inC ? 'end' : 'start'}">${r.contact_required}</text>
      <text x="${W - 46}" y="${y + 14.5}" class="pc-cond" text-anchor="end">${r.conditional}</text>
      <text x="${W - 4}" y="${y + 14.5}" class="pc-unk" text-anchor="end">${r.unknown}</text>
    </g>`;
  }).join('');

  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pc-svg pc-contested" role="img" aria-label="Contested procedures: for each, the number of agencies whose protocol makes it a standing order versus the number that require contacting a physician first.">
    <text x="${MID - 6}" y="14" class="pc-head" text-anchor="end">&#8592; Standing order</text>
    <text x="${MID + 6}" y="14" class="pc-head pc-head-cr">Contact required &#8594;</text>
    <text x="${W - 46}" y="14" class="pc-head pc-head-cond" text-anchor="end">Depends</text>
    <text x="${W - 4}" y="14" class="pc-head pc-head-unk" text-anchor="end">Not stated</text>
    <line x1="${MID}" y1="${PAD_T - 6}" x2="${MID}" y2="${H - PAD_B + 2}" class="pc-axis"/>
    ${bars}
    <text x="0" y="${H - 18}" class="pc-foot">Each bar counts AGENCIES, and every agency is counted once. &ldquo;Depends&rdquo; is the count whose book gives BOTH answers for this</text>
    <text x="0" y="${H - 6}" class="pc-foot">procedure &mdash; standing in one presentation, a call in another. &ldquo;Not stated&rdquo; names it without saying on whose authority.</text>
  </svg>`;

  return { svg, rows: rows.length, maxside: MAXSIDE };
}

// ── 2. the change ledger: verified edition-to-edition changes, by agency ─────────────
// Stacked by direction, one row per agency, ordered by total. The point of the picture
// is how FEW agencies the timeline covers and how unevenly: three agencies carry most of
// it. A chart that hid that behind a national total would be the dishonest version.
function changeChart(t) {
  const ev = verifiedEvents(t);
  if (!ev.length) return { svg: '', rows: 0 };

  const by = new Map();
  for (const e of ev) {
    if (!by.has(e.agencyKey)) {
      by.set(e.agencyKey, { name: e.agencyName, state: e.state, add: 0, drop: 0 });
    }
    const g = by.get(e.agencyKey);
    if (isAdd(e.changeType)) g.add++; else g.drop++;
  }
  const rows = [...by.values()]
    .sort((a, b) => (b.add + b.drop) - (a.add + a.drop) || a.name.localeCompare(b.name));

  const W = 760, RH = 27, PAD_T = 28, PAD_B = 24;
  const LAB = 300, PLOT_X = LAB + 10, PLOT_W = W - PLOT_X - 44;
  const MAX = Math.max(...rows.map(r => r.add + r.drop));
  const H = PAD_T + rows.length * RH + PAD_B;
  const x = v => (v / MAX) * PLOT_W;

  // An agency's own name, trimmed to the measure. The state stays, because "Michigan
  // DHHS" and "Massachusetts DPH" are the fact a reader is scanning for.
  const short = r => {
    const s = r.name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length > 42 ? `${s.slice(0, 41)}…` : s;
  };

  const bars = rows.map((r, i) => {
    const y = PAD_T + i * RH;
    const wa = x(r.add), wd = x(r.drop);
    return `<g>
      <text x="${LAB}" y="${y + 13}" class="pc-lab" text-anchor="end">${escapeHtml(short(r))}<tspan class="pc-st"> ${escapeHtml(r.state || '')}</tspan></text>
      <rect x="${PLOT_X}" y="${y + 2}" width="${wa.toFixed(1)}" height="14" class="pc-add"/>
      <rect x="${(PLOT_X + wa).toFixed(1)}" y="${y + 2}" width="${wd.toFixed(1)}" height="14" class="pc-drop"/>
      <text x="${(PLOT_X + wa + wd + 6).toFixed(1)}" y="${y + 13}" class="pc-num">${r.add + r.drop}</text>
    </g>`;
  }).join('');

  const svg = `<svg viewBox="0 0 ${W} ${H}" class="pc-svg pc-changes" role="img" aria-label="Verified changes between protocol editions, by agency: how many things each agency's book added and how many it stopped naming.">
    <text x="${PLOT_X}" y="14" class="pc-head pc-head-add">Added</text>
    <text x="${PLOT_X + 62}" y="14" class="pc-head pc-head-drop">Stopped naming</text>
    ${bars}
    <text x="0" y="${H - 7}" class="pc-foot">Only changes whose quote was re-found on the page it was cited from. ${rows.length} agencies &mdash; the whole of what this timeline covers.</text>
  </svg>`;

  return { svg, rows: rows.length };
}

export { contestedChart, changeChart };

// Importable for the test without writing anything: a generator that builds on import
// cannot be unit-tested, and the test is what keeps these two charts honest.
export function build() {
  const proc = readProcedures();
  const tl = readTimeline();
  const out = { builtAt: null };

  if (proc) {
    const c = contestedChart(byProcedure(proc.rows));
    out.contested = c.svg;
    out.contestedRows = c.rows;
    out.builtAt = proc.builtAt || null;
  }
  if (tl) {
    const c = changeChart(tl);
    out.changes = c.svg;
    out.changeRows = c.rows;
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const out = build();
  writeFileSync(OUT, JSON.stringify(out, null, 0));
  console.log(`wrote ${OUT} — contested ${out.contestedRows || 0} rows, changes ${out.changeRows || 0} rows`);
}
