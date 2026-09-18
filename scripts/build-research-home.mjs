// scripts/build-research-home.mjs — /research, the umbrella over both volumes.
//
// ProtoQuiz Research is one research arm with two lines of work, and this page is the
// parent that says so. It does not carry findings of its own: the protocol census owns
// medication variation, the registry owns who answers 911. A reader landing here should
// be able to tell in one screen which question each volume answers and how solid it is.
//
// Both cards state their own standing plainly, including the registry's, because the
// registry is 23% named-by-a-source and saying otherwise here would undo the care the
// volume itself takes.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';

// Each card shows a rendering of its own volume, built by build-research-thumbs.mjs from
// the same data the volume publishes -- never a stock illustration.
const THUMBS = existsSync('assets/research-thumbs.json')
  ? JSON.parse(readFileSync('assets/research-thumbs.json', 'utf8'))
  : { registry: '', census: '', censusNote: '' };

// Current documents only: `manifest.documents` counts every revision ever read, so it
// reads as coverage when it is mostly history of the same protocols.
let curDocs = 0;
if (existsSync('data/census/documents.json')) {
  const dj = JSON.parse(readFileSync('data/census/documents.json', 'utf8'));
  const drows = Array.isArray(dj) ? dj : dj.rows || [];
  curDocs = drows.filter(r => r.status === 'current').length;
}

// The denominator for census coverage, from our OWN roster research rather than a
// remembered round number: every licensed EMS agency the state rosters name.
const NATIONAL_AGENCIES = existsSync('scratch/ems-services/research.json')
  ? JSON.parse(readFileSync('scratch/ems-services/research.json', 'utf8')).named
  : 26883;

const cy = JSON.parse(readFileSync('data/county-911.json', 'utf8'));
const nCounty = Object.keys(cy).length;
const nA = Object.values(cy).filter(c => c.tier === 'A').length;
const answered = Object.values(cy).filter(c => c.tier !== '-').length;

// The census's own numbers, from the build it publishes. Two ways this can lie, so
// both are guarded: the file can be absent on a fresh clone (data/census is generated),
// and it can be STALE -- a worktree cut weeks ago carries that day's manifest, which
// understated the census by 3.7x when this page was first built. A manifest older than
// MAX_AGE_DAYS is refused and the card falls back to prose, because a confidently wrong
// number is worse than no number.
const MAX_AGE_DAYS = 14;
let census = null;
if (existsSync('data/census/manifest.json')) {
  const m = JSON.parse(readFileSync('data/census/manifest.json', 'utf8'));
  const ageDays = (Date.now() - Date.parse(m.asOf)) / 86400000;
  if (ageDays <= MAX_AGE_DAYS) census = m;
  else console.warn(`census manifest is ${Math.round(ageDays)} days old (asOf ${m.asOf}) — omitting its counts`);
}
const n = x => Number(x).toLocaleString('en-US');

const VOLUMES = [
  {
    thumb: THUMBS.census,
    thumbNote: THUMBS.censusNote,
    thumbCap: 'Medications only some agencies carry. Share of those the census has read.',
    eyebrow: 'Volume one',
    title: 'US EMS Protocol Census',
    href: '/census/',
    cta: 'Open the census',
    q: 'What does each agency actually carry?',
    body: `A versioned public record of the medications, doses and routes US EMS agencies
      publish, read from the agencies' own protocol documents and rebuilt every night.
      Every value is sourced to the page it came from.`,
    stats: census
      ? [[n(census.doseRows), 'dose entries'], [n(census.namedAgencies), 'named agencies'],
         [n(curDocs || census.documents), 'current protocols']]
      : [],
    // 'documents read' was 1,710 and read as coverage; most of that is revision history
    // of the same protocols. The honest coverage number is the count of CURRENT
    // documents, and the standing line says outright that this is a sample.
    standing: `Live and rebuilt nightly. Coverage is still thin: ${n(census.namedAgencies)} agencies
      of the ${n(NATIONAL_AGENCIES)} our own roster research counts nationally, so this is a sample
      of American EMS, not yet a census of it.`,
  },
  {
    thumb: THUMBS.registry,
    thumbCap: 'Every county, coloured by who owns its 911 provider. Fainter is weaker evidence.',
    eyebrow: 'Volume two',
    title: 'The 911 coverage registry',
    href: '/research/registry/',
    cta: 'Open the registry',
    q: 'Who answers the call, and who owns them?',
    body: `Every county in the country, mapped to the agency that answers the 911 call and
      whether that service is public, private, hospital-based or a fire department. No
      public national record of this exists, so we are building one.`,
    stats: [[n(answered), 'counties with an answer'], [n(nA), 'named by a state record'],
            [n(nCounty), 'counties in scope']],
    standing: `Early. ${Math.round((nA / nCounty) * 100)}% of counties are named directly by a
      source; the rest are inferred and drawn fainter on the map. An inferred county is a
      lead, not a fact.`,
  },
];

const card = v => `        <article class="vol">
${v.thumb ? `          <figure class="vol-thumb">${v.thumb}<figcaption>${v.thumbCap}</figcaption></figure>` : ''}
          <div class="vol-eyebrow">${v.eyebrow}</div>
          <h2><a href="${v.href}">${v.title}</a></h2>
          <p class="vol-q">${v.q}</p>
          <p class="vol-body">${v.body}</p>
${v.stats.length ? `          <dl class="vol-stats">
${v.stats.map(([num, lab]) => `            <div><dt>${num}</dt><dd>${lab}</dd></div>`).join('\n')}
          </dl>` : ''}
${v.thumbNote ? `          <p class="vol-thumbnote">${v.thumbNote}</p>` : ''}
          <p class="vol-standing"><span>Standing</span> ${v.standing}</p>
          <a class="vol-cta" href="${v.href}">${v.cta} &rarr;</a>
        </article>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProtoQuiz Research - open research on American EMS</title>
  <meta name="description" content="ProtoQuiz Research is an open research programme on American EMS, built from public documents: the US EMS Protocol Census on what agencies carry, and a county-level registry of who answers the 911 call.">
  <link rel="canonical" href="https://protoquiz.com/research/">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${navFor('/research/')}
${researchBar('/research/')}
  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">ProtoQuiz Research</div>
      <h1>Open research on how American EMS actually works.</h1>
      <p class="lede">What a crew carries, and even who shows up, changes at county lines.
      We read what agencies publish and turn it into a record anyone can check.</p>
    </section>

    <section class="res-vols">
${VOLUMES.map(card).join('\n')}
    </section>

    <section class="res-method">
      <h2>How we handle uncertainty</h2>
      <p>Both volumes are only as good as the documents behind them. Rather than average that
      away, we show it: every figure names what it was measured against, a value from a weak
      source is drawn as weak, and anything we could not source is left blank instead of
      guessed. A number that looks precise and is not is worse than no number.</p>
      <p><a href="/census/methodology/">Census methodology</a> &middot;
      <a href="/census/data-license/">Data license</a></p>
    </section>
  </main>
${FOOTER_HTML}
</body>
</html>
`;

mkdirSync('research', { recursive: true });
writeFileSync('research/index.html', html);
console.log(`wrote research/index.html — ${VOLUMES.length} volumes, ${html.length} bytes`);
