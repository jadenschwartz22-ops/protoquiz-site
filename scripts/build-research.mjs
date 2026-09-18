// scripts/build-research.mjs — /research, the EMS services page.
//
// Same discipline as the census: say what each word means, show where the data is
// thin, and never let a sourcing artifact read as a finding. Three of the states
// with the highest "fire-based" share are high because their only source is a fire
// STATION list, and the page says so on the row rather than in a footnote.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { navFor, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';

// NOTE: this input lives in scratch/, which is gitignored, so a fresh clone cannot
// build this page until research.json is regenerated from the ems-services pipeline.
// The committed research/index.html is therefore the artifact of record for now.
const R = JSON.parse(readFileSync('scratch/ems-services/research.json', 'utf8'));
const MAP = readFileSync('assets/research-map.html', 'utf8');

const MODEL_LABEL = {
  'fire-based': 'Fire-based', private: 'Private', 'third-service': 'Third service',
  hospital: 'Hospital', tribal: 'Tribal',
};
const MODELS = ['fire-based', 'private', 'third-service', 'hospital'];

const stateRow = ([code, d]) => {
  const note = d.tag === 'floor'
    ? '<span class="src-flag floor">station list only</span>'
    : d.tag === 'station'
      ? '<span class="src-flag">fire-station source</span>'
      : '';
  return `        <tr${d.tag ? ' class="thin"' : ''}>
          <th scope="row">${code}${note}</th>
          <td class="num">${d.n.toLocaleString('en-US')}</td>
${MODELS.map(m => `          <td class="num">${d.pct[m] ? Math.round(d.pct[m]) + '%' : '&mdash;'}</td>`).join('\n')}
        </tr>`;
};

const ranked = Object.entries(R.states).sort((a, b) => b[1].pct['fire-based'] - a[1].pct['fire-based']);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Who runs American EMS - ProtoQuiz Research</title>
  <meta name="description" content="A state-by-state record of who provides 911 EMS in the United States: fire departments, private ambulance companies, county third services or hospitals. Built from state licensing rosters.">
  <link rel="canonical" href="https://protoquiz.com/research/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="Who runs American EMS">
  <meta property="og:description" content="A state-by-state record of who provides 911 EMS in the United States, built from state licensing rosters.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://protoquiz.com/research/">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:site_name" content="ProtoQuiz">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${navFor('/research/')}

  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">Early release &middot; ${R.asOf}</div>
      <h1>Who runs American EMS?</h1>
      <p class="lede">In some states a fire department answers the 911 call. In others it is a
      private ambulance company, a county service, or a hospital. Nobody had written that
      down state by state, so we did &mdash; from the states' own licensing rosters.</p>
    </section>

    <section class="res-map-wrap">
${MAP}
      <p class="map-note">The model changes at county lines, not state lines, which is why this is
      drawn by county. The averages below come from a different source &mdash; state licensing
      rosters, which say what kind of agency each one is &mdash; so they answer &ldquo;what share of
      agencies are fire-based&rdquo; rather than &ldquo;who shows up in this county&rdquo;. Five states
      publish no EMS roster and are drawn from a fire-station list instead; they are marked in the
      table and excluded from the national figures.</p>
    </section>

    <section class="res-headline">
      <div class="res-eyebrow">Across ${R.realStates} states with a published EMS roster</div>
      <div class="bar">
${MODELS.map(m => `        <div class="bar-seg m-${m.replace(' ', '')}" style="width:${R.national[m].toFixed(1)}%"><span>${Math.round(R.national[m])}%</span></div>`).join('\n')}
      </div>
      <div class="bar-key">
${MODELS.map(m => `        <span class="key"><i class="m-${m.replace(' ', '')}"></i>${MODEL_LABEL[m]}</span>`).join('\n')}
      </div>
      <p class="headline-note">${R.classified.toLocaleString('en-US')} agencies classified of
      ${R.named.toLocaleString('en-US')} named, across ${R.counties.toLocaleString('en-US')} counties.
      ${R.official.toLocaleString('en-US')} carry the state's own ownership label; the rest are read
      from the agency's name.</p>
    </section>

    <section class="res-table-wrap">
      <h2>By state</h2>
      <div class="table-scroll">
      <table class="res-table">
        <thead>
          <tr><th scope="col">State</th><th scope="col" class="num">Agencies</th>
${MODELS.map(m => `            <th scope="col" class="num">${MODEL_LABEL[m]}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
${ranked.map(stateRow).join('\n')}
        </tbody>
      </table>
      </div>
    </section>

    <section class="res-method">
      <h2>What these words mean</h2>
      <dl>
        <dt>Agency</dt><dd>One licensed EMS service as the state lists it. A department with six
        stations is one agency.</dd>
        <dt>Fire-based</dt><dd>A fire department or fire district provides the EMS, whether or not
        it also transports.</dd>
        <dt>Private</dt><dd>A standalone ambulance company or a volunteer ambulance corps.
        For-profit and non-profit are counted together; states do not label them consistently.</dd>
        <dt>Third service</dt><dd>A county or city EMS agency that is not the fire department.</dd>
        <dt>Hospital</dt><dd>Operated by a hospital or health system.</dd>
      </dl>

      <h2>Where this is thin</h2>
      <p>Five states &mdash; ${R.floorStates.join(', ')} &mdash; publish no publicly readable EMS
      roster. Their rows come from a national fire-station layer, which is mostly fire stations by
      construction, so they read as far more fire-based than they are. They are marked
      <span class="src-flag floor">station list only</span> and left out of the national figures.</p>
      <p>Six more &mdash; ${R.stationStates.join(', ')} &mdash; publish a real list, but it is a list
      of fire <em>stations</em>, which carries the same bias more mildly. Those are marked
      <span class="src-flag">fire-station source</span>.</p>
      <p>Where a state publishes its own ownership field we use it. Where it does not, the model is
      read from the agency's name, which is right about ${R.agreement}% of the time when checked
      against the states that publish both.</p>
      <p>This is a description of who holds the licence, not a judgement about which model is
      better, and not a claim about response times or quality.</p>
    </section>
  </main>

${FOOTER_HTML}
</body>
</html>
`;

mkdirSync('research', { recursive: true });
writeFileSync('research/index.html', html);
console.log(`wrote research/index.html — ${ranked.length} states, ${html.length} bytes`);
