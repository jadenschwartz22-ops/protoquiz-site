// scripts/build-research.mjs — /research/registry, the 911 coverage volume.
//
// This is ONE VOLUME of ProtoQuiz Research, not the arm itself: /research is the
// umbrella (build-research-home.mjs) and links here and to the protocol census.
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

// VOCABULARY.md: "Neither group may stand beside a real roster state." A station-list
// state reads 90-97% fire-based because its SOURCE is a fire-station layer (96.8% fire
// stations, no ownership field), not because its EMS is fire-based. Ranking those rows
// against real rosters puts the artifact at the top of the table and reads as a finding,
// so they are split into a second table that is not sorted by a share at all.
const byFire = (a, b) => b[1].pct['fire-based'] - a[1].pct['fire-based'];
const entries = Object.entries(R.states);
const ranked = entries.filter(([, d]) => !d.tag).sort(byFire);
const excluded = entries.filter(([, d]) => d.tag).sort((a, b) => a[0].localeCompare(b[0]));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Who answers 911 - ProtoQuiz Research</title>
  <meta name="description" content="A state-by-state record of who provides 911 EMS in the United States: fire departments, private ambulance companies, county third services or hospitals. Built from state licensing rosters.">
  <link rel="canonical" href="https://protoquiz.com/research/registry/">
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

      <h3 class="res-sub">Not comparable: ${excluded.length} states whose source is a fire-station list</h3>
      <p class="res-subnote">These states publish no usable EMS roster, so the rows below come from a
      fire-station layer that is 96.8% fire stations and carries no ownership field. Their fire share is
      an artifact of that source &mdash; a ceiling, not a measurement &mdash; so they are listed
      alphabetically, never ranked, and are excluded from every national figure on this page.</p>
      <div class="table-scroll">
      <table class="res-table res-table-excluded">
        <thead>
          <tr><th scope="col">State</th><th scope="col" class="num">Rows in source</th>
${MODELS.map(m => `            <th scope="col" class="num">${MODEL_LABEL[m]}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
${excluded.map(stateRow).join('\n')}
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

      <h2>How a county gets its colour, and how sure we are</h2>
      <p>The map and the table answer different questions from different sources, and are never
      pooled. The <strong>map</strong> asks who answers the 911 call in a given county. The
      <strong>table</strong> asks what share of a state's licensed agencies are fire-based,
      private, third-service or hospital. A state can publish one and not the other.</p>
      <p>Every county on the map carries an evidence tier, and the tier is drawn as opacity rather
      than written in a footnote, so a weak answer looks weak:</p>
      <dl class="tierdl">
        <dt><span class="tierchip t-a"></span>Named</dt>
        <dd>A state or agency record names the provider for that county &mdash; a service area,
        zone, contract or standards-of-cover document. This is the only tier we treat as known.</dd>
        <dt><span class="tierchip t-b"></span>Confirmed biller</dt>
        <dd>A licensed transporting agency is located in the county <em>and</em> Medicare 2024 shows
        it bills mostly emergency transports, a proxy calibrated at 89% recall against
        state-verified 911 transporters.</dd>
        <dt><span class="tierchip t-c"></span>Located here</dt>
        <dd>A licensed transporting agency is registered in the county, unconfirmed. A licence does
        not say who gets dispatched.</dd>
        <dt><span class="tierchip t-d"></span>Billing only</dt>
        <dd>Only a Medicare emergency-majority biller is registered in the county. The weakest
        signal we draw at all.</dd>
      </dl>
      <p><strong>Two known errors of construction, stated rather than hidden.</strong> Below the
      named tier, an agency is placed in the county of its licence or billing address, so a private
      or hospital system with one headquarters and many counties is mislocated. And state rosters
      include interfacility, air and critical-care licences that never answer 911; the Medicare
      emergency test is the only filter, so a volunteer squad that bills no Medicare is invisible
      to it. Both are why anything below the named tier is a lead for us to verify, not a fact to
      cite.</p>

      <h2>Where this is thin</h2>
      <p>Five states &mdash; ${R.floorStates.join(', ')} &mdash; publish no publicly readable EMS
      roster. Their rows come from a national fire-station layer, which is mostly fire stations by
      construction, so they read as far more fire-based than they are. They are marked
      <span class="src-flag floor">station list only</span> and left out of the national figures.</p>
      <p>Six more &mdash; ${R.stationStates.join(', ')} &mdash; publish a real list, but it is a list
      of fire <em>stations</em>, which carries the same bias more mildly. Those are marked
      <span class="src-flag">fire-station source</span>.</p>
      <p><strong>The ownership column is the weakest thing on this page, and here is the size of
      it.</strong> Only ${Math.round((R.official / R.classified) * 100)}% of classified agencies
      (${R.official.toLocaleString('en-US')} of ${R.classified.toLocaleString('en-US')}) carry the
      state's own ownership label. For the other
      ${Math.round(((R.classified - R.official) / R.classified) * 100)}% the model is read from the
      agency's name &mdash; and when that guess is checked against the states that publish a real
      label, it agrees only <strong>${R.agreement}%</strong> of the time. Treat a single derived row
      as a coin flip. The national shares hold up better than any one row, because errors in both
      directions partly cancel, but they are not precise either.</p>
      <p>This is a description of who holds the licence, not a judgement about which model is
      better, and not a claim about response times or quality.</p>

      <h2 id="correct">Tell us we got it wrong</h2>
      <p>If you work in EMS, you know your own county better than any roster does, and a correction
      from you outranks every inference on this page. Name the county and who actually answers the
      911 call there. A link to anything official helps but is not required &mdash; we will find the
      record once we know where to look.</p>
      <form class="fix-form" id="fix-form" novalidate>
        <label for="fix-where">County and state</label>
        <input type="text" id="fix-where" name="where" required placeholder="Kern County, CA" autocomplete="off" />
        <label for="fix-what">What is wrong, and what is right</label>
        <textarea id="fix-what" name="what" required rows="4" placeholder="The map shows a private company. The county runs its own EMS and has since 2019."></textarea>
        <label for="fix-src">Link to a source <span class="muted">(optional)</span></label>
        <input type="url" id="fix-src" name="src" placeholder="https://" autocomplete="url" />
        <label for="fix-email">Your email <span class="muted">(optional &mdash; only so we can tell you when it is fixed)</span></label>
        <input type="email" id="fix-email" name="email" placeholder="you@agency.gov" autocomplete="email" />
        <p class="hp" aria-hidden="true"><label for="fix-hp">Leave this field empty</label><input type="text" id="fix-hp" name="website" tabindex="-1" autocomplete="off" /></p>
        <button type="submit">Send the correction</button>
        <p class="form-msg" id="fix-msg" role="status"></p>
      </form>
      <script>
        (function () {
          var f = document.getElementById('fix-form'), msg = document.getElementById('fix-msg');
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            if (f.elements.website.value) { msg.textContent = 'Thanks — sent.'; return; }
            var where = f.elements.where.value.trim(), what = f.elements.what.value.trim();
            if (!where || !what) { msg.textContent = 'The county and what is wrong are both needed.'; return; }
            var btn = f.querySelector('button');
            btn.disabled = true; msg.textContent = 'Sending...';
            var src = f.elements.src.value.trim();
            fetch('https://api.protoquiz.com/api/monitor?type=contactForm', {
              // Accept:application/json is REQUIRED: without it the handler answers a
              // plain form POST with a 302 back to the referer, which this fetch would
              // read as a failure and report to a user whose correction actually landed.
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({
                email: f.elements.email.value.trim() || undefined,
                message: 'REGISTRY CORRECTION\n\nCounty: ' + where + '\n\n' + what + (src ? '\n\nSource: ' + src : ''),
                source: 'research-registry-correction'
              })
            }).then(function (r) {
              if (!r.ok) throw new Error('bad status');
              f.reset();
              msg.textContent = 'Thank you — this goes straight to a human, and a county we are told about gets checked first.';
            }).catch(function () {
              btn.disabled = false;
              msg.textContent = 'That did not send. Email research@protoquiz.com instead and it will get the same treatment.';
            });
          });
        })();
      </script>
    </section>
  </main>

${FOOTER_HTML}
</body>
</html>
`;

mkdirSync('research/registry', { recursive: true });
writeFileSync('research/registry/index.html', html);
console.log(`wrote research/registry/index.html — ${ranked.length} ranked + ${excluded.length} not-comparable states, ${html.length} bytes`);
