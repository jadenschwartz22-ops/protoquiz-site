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
    thumbCap: 'Every county, colored by who owns its 911 provider. Fainter is weaker evidence.',
    eyebrow: 'Volume two',
    title: 'The American EMS Atlas',
    href: '/research/atlas/',
    cta: 'Open the atlas',
    q: 'Who answers the call, and who owns them?',
    body: `Every county in the country, mapped to the agency that answers the 911 call and
      who owns it. No public national record of this exists, so we are building one.`,
    stats: [[n(answered), 'counties with an answer'], [n(nA), 'named by a state record'],
            [n(nCounty), 'counties in scope']],
    standing: `Early. ${Math.round((nA / nCounty) * 100)}% of counties are named directly by a
      source; the rest are inferred and drawn fainter on the map. An inferred county is a
      lead, not a fact.`,
  },
];

// The full statement of why this research arm exists. It sits behind a disclosure rather
// than in the lede because it is an argument, not a summary -- a reader who wants the data
// gets to the volumes without scrolling past it, and a reader who wants the reasoning gets
// all of it. <details> is native: no JS, open by default to a crawler, and printable.
//
// Both statistics are attributed BECAUSE they are the only claims on this page we did not
// measure ourselves. Verified against the primary sources 2026-09-18: the NCSL page says
// "At least 19 states and the District of Columbia" and is dated July 17 2026; the CDC page
// was last reviewed 9 Oct 2024. A secondary summary claiming 21 states was wrong.
// The statement opens "EMS is highly fragmented across the United States." — which is now
// the lede's first sentence, so it is not repeated here two inches below itself.
const ABOUT = `        <p>There is a broad national foundation for EMS education and certification through
        the NREMT, but there is no standard for how EMS is delivered in the field. States
        establish their own regulations and scopes of practice, while individual EMS agencies
        operate under their own protocols and medical direction. As a result, protocols can
        vary substantially from one agency to another, even between neighboring communities.
        There is meaningful overlap, but there can also be significant differences in what
        clinicians are permitted or expected to do, depending on where they work.</p>

        <p>The fragmentation extends beyond clinical practice. There is no single model for
        who responds to a 911 medical call. Depending on the community, EMS may be provided
        by a municipal or county service, fire department, hospital system, private company,
        nonprofit organization, volunteer service, or some combination of these. That means
        the agency responding, the resources available, the equipment carried, and the
        clinical care provided can all change depending on where a patient lives.</p>

        <p>ProtoQuiz is building a way to make this fragmented system easier to understand.</p>

        <p>We read the protocols and other information that EMS agencies publish and turn
        them into a structured, searchable record that can be independently reviewed. We
        track changes over time and document how 911 EMS is organized and who provides
        emergency ambulance services in communities across the country.</p>

        <p>The goal is to build an accurate picture of the state of EMS in the United States:
        where systems are standardized, where they differ, how clinical practice varies, and
        how EMS is organized from community to community.</p>

        <p>That information can provide a foundation for identifying opportunities for
        greater standardization. Greater consistency in EMS education, clinical practice, and
        system design could help improve the quality and reliability of care while also
        supporting a stronger, more sustainable profession.</p>

        <p>EMS is also unusual among emergency services in the United States because it has
        historically not been recognized as an essential public service. The CDC states that,
        unlike police and fire services, EMS is
        <a href="https://www.cdc.gov/ems-community-paramedicine/php/us/local-authority.html">rarely
        classified and funded as an essential service</a>.</p>

        <p>EMS is primarily organized and funded at the local level, contributing to
        substantial variation between communities.</p>

        <p>That is beginning to change. As of July 2026, the National Conference of State
        Legislatures reported that
        <a href="https://www.ncsl.org/health/state-policies-defining-ems-as-essential">at
        least 19 states and the District of Columbia</a> had enacted legislation explicitly
        using the term &ldquo;essential&rdquo; to define EMS in statute. The laws differ
        considerably in what they require and how EMS is funded.</p>

        <p>ProtoQuiz can help make that transition visible: not just what EMS is supposed to
        be nationally, but what EMS actually looks like across the country.</p>

        <p>By improving our understanding of EMS and identifying where greater consistency is
        possible, we can help improve the quality of care and strengthen the profession
        itself. Better quality EMS means better pay for those who enter this profession,
        better quality care for patients, and a more efficient, sustainable future for
        EMS.</p>`;

const card = v => `        <article class="vol">
${v.thumb ? `          <figure class="vol-thumb"><a href="${v.href}" aria-label="${v.title}">${v.thumb}</a><figcaption>${v.thumbCap}</figcaption></figure>` : ''}
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
      <p class="lede">EMS is highly fragmented across the United States. In most places every
      single agency has its own set of protocols, and there is no standard for who responds
      to a 911 EMS call &mdash; a fire department, a private company, a county or a hospital,
      depending on where you are. So what a crew carries, and even who shows up, changes at
      county lines. We read what agencies publish and turn it into a record anyone can
      check.</p>

      <details class="res-about">
        <summary>Why we are building this</summary>
${ABOUT}
      </details>
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
