// scripts/build-research.mjs — /research/atlas, the 911 coverage volume.
//
// This is ONE VOLUME of ProtoQuiz Research, not the arm itself: /research is the
// umbrella (build-research-home.mjs) and links here and to the protocol census.
//
// Same discipline as the census: say what each word means, show where the data is
// thin, and never let a sourcing artifact read as a finding. Three of the states
// with the highest "fire-based" share are high because their only source is a fire
// STATION list, and the page says so on the row rather than in a footnote.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';

// NOTE: this input lives in scratch/, which is gitignored, so a fresh clone cannot
// build this page until research.json is regenerated from the ems-services pipeline.
// The committed research/index.html is therefore the artifact of record for now.
const R = JSON.parse(readFileSync('scratch/ems-services/research.json', 'utf8'));
const MAP = readFileSync('assets/research-map.html', 'utf8');

// The map asset is a 947KB generated file of county paths. Rather than regenerate it to
// add interaction, the viewport, tooltip and zoom controls are wrapped around the <svg>
// here: one place, and the asset stays the pipeline's to own.
//
// The SVG is NOT given role="application" or a tabindex. It keeps role="img" and its
// label, so a screen reader still reads one titled image instead of announcing 3,144
// unreachable paths; the pan/zoom is a sighted-pointer convenience over a static map
// that already reads correctly without it. The data in each <title> is the same data
// in the table below, which is where keyboard and screen-reader users get it.
const mapWithControls = map => map.replace(
  /(<svg\b[^>]*class="rm-svg"[^>]*>)/,
  `<div class="rm-view">
    <div class="rm-ctl">
      <button type="button" data-z="in" aria-label="Zoom in">+</button>
      <button type="button" data-z="out" aria-label="Zoom out">&minus;</button>
      <button type="button" data-z="reset" aria-label="Reset the map">&#8634;</button>
      <div class="rm-zoomlvl" aria-hidden="true">1&times;</div>
    </div>
    <div class="rm-tip" role="presentation"></div>
    <div class="rm-panel" role="dialog" aria-modal="false" aria-labelledby="rm-panel-t" hidden>
      <div class="rm-panel-hd">
        <div>
          <h3 id="rm-panel-t"></h3>
          <p class="rm-panel-sub"></p>
        </div>
        <button type="button" class="rm-panel-x" aria-label="Close">&times;</button>
      </div>
      <div class="rm-panel-bd"></div>
    </div>
    <p class="rm-hint">Scroll to zoom &middot; drag to pan &middot; click a county</p>
    $1`,
).replace('</svg>', '</svg>\n  </div>');

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
  <title>The American EMS Atlas - who answers 911, by county</title>
  <meta name="description" content="A state-by-state record of who provides 911 EMS in the United States: fire departments, private ambulance companies, county third services or hospitals. Built from state licensing rosters.">
  <link rel="canonical" href="https://protoquiz.com/research/atlas/">
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
${researchBar('/research/atlas/')}

  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">Early release &middot; ${R.asOf}</div>
      <h1>Who runs American EMS?</h1>
      <p class="lede">In some states a fire department answers the 911 call. In others it is a
      private ambulance company, a county service, or a hospital. We are mapping it county by
      county, from the states' own licensing rosters.</p>
    </section>

    <section class="res-map-wrap">
${mapWithControls(MAP)}
      <p class="map-note">The model changes at county lines, not state lines, which is why this
      is drawn by county. The averages below come from state licensing rosters instead, so they
      answer &ldquo;what share of agencies are fire-based&rdquo;, not &ldquo;who shows up
      here&rdquo;.</p>
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
      <p>Map and table answer different questions from different sources, and are never pooled.
      The <strong>map</strong> asks who answers the 911 call in a county; the <strong>table</strong>
      asks what share of a state's licensed agencies are fire-based, private, third-service or
      hospital. Every county carries an evidence tier, drawn as opacity so a weak answer looks
      weak:</p>
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
      <p><strong>Two known errors, stated rather than hidden.</strong> Below the named tier an
      agency sits in the county of its licence address, so a system with one headquarters and
      many counties is mislocated. And rosters include interfacility, air and critical-care
      licences that never answer 911, while a volunteer squad billing no Medicare is invisible
      to our only filter. Both are why anything below &ldquo;named&rdquo; is a lead, not a
      fact.</p>

      <h2>Where this is thin</h2>
      <p>Five states &mdash; ${R.floorStates.join(', ')} &mdash; publish no readable EMS roster.
      Their rows come from a fire-station layer, so they read as far more fire-based than they
      are. Marked <span class="src-flag floor">station list only</span> and left out of the
      national figures. Six more &mdash; ${R.stationStates.join(', ')} &mdash; publish a real
      list, but of fire <em>stations</em>, carrying the same bias more mildly:
      <span class="src-flag">fire-station source</span>.</p>
      <p><strong>The ownership column is the weakest thing here, and this is the size of
      it.</strong> Only ${Math.round((R.official / R.classified) * 100)}%
      (${R.official.toLocaleString('en-US')} of ${R.classified.toLocaleString('en-US')}) carry the
      state's own ownership label. The rest are read from the agency's name, and against states
      that publish a real label that guess agrees only <strong>${R.agreement}%</strong> of the
      time. Treat a single derived row as a coin flip; the national shares hold up better,
      because errors partly cancel, but are not precise either.</p>
      <p>This describes who holds the licence &mdash; not which model is better, and not
      response times or quality.</p>

      <h2 id="correct">Tell us we got it wrong</h2>
      <p>If you work in EMS you know your county better than any roster does, and your correction
      outranks every inference here. Name the county and who actually answers the 911 call. A
      link helps but is not required &mdash; we will find the record.</p>
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
                source: 'research-atlas-correction'
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

    <script>
      (function () {
        var view = document.querySelector('.rm-view');
        if (!view) return;
        var svg = view.querySelector('.rm-svg'), tip = view.querySelector('.rm-tip');
        var z = 1, x = 0, y = 0, hot = null;

        // Each county's text already lives in its <title>. Read it once, then REMOVE the
        // element: left in place the browser draws its own slow native tooltip on top of
        // ours. The text is kept on the node so the map stays self-describing.
        var cty = svg.querySelectorAll('.cty');
        for (var i = 0; i < cty.length; i++) {
          var t = cty[i].querySelector('title');
          if (t) { cty[i].setAttribute('data-t', t.textContent); t.remove(); }
        }

        var lvl = view.querySelector('.rm-zoomlvl');
        var btnIn = view.querySelector('[data-z=in]'), btnOut = view.querySelector('[data-z=out]');
        // closest() on an SVG element is not reliable everywhere, and the old code fell
        // back to null when it was missing -- which silently turned every click into a
        // no-op instead of failing loudly. Walking parentNode works on SVG and HTML alike.
        function up(node, cls) {
          for (var n = node; n && n !== view; n = n.parentNode) {
            if (n.getAttribute && (' ' + (n.getAttribute('class') || '') + ' ').indexOf(' ' + cls + ' ') > -1) return n;
          }
          return null;
        }

        function draw() {
          svg.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
          if (lvl) lvl.textContent = (z < 9.95 ? Math.round(z * 10) / 10 : Math.round(z)) + '×';
          if (btnIn) btnIn.disabled = z >= 12;
          if (btnOut) btnOut.disabled = z <= 1;
          labels();
        }

        // ---- County name labels ---------------------------------------------------
        // Drawn only past LABEL_Z, and only for counties big enough on screen to hold
        // their own name. Labels are HTML over the map rather than <text> inside the
        // SVG: inside, the transform would scale the type along with the map, so names
        // would balloon as you zoom. Only counties currently IN VIEW are measured --
        // laying out all 3,133 on every frame would make panning crawl.
        var LABEL_Z = 3.4, MIN_BOX = 46;
        var layer = document.createElement('div');
        layer.className = 'rm-labels';
        layer.setAttribute('aria-hidden', 'true');  // the names are in each path's data-t
        view.appendChild(layer);
        // Painted synchronously on zoom, and only deferred WHILE DRAGGING, where the
        // cost per frame matters. An earlier version deferred every paint to
        // requestAnimationFrame, which never ran in a background tab or a headless
        // render -- the labels simply never appeared.
        var labelTimer = null;
        function labels() {
          if (down && moved) {
            if (labelTimer) return;
            labelTimer = setTimeout(function () { labelTimer = null; paintLabels(); }, 90);
            return;
          }
          if (labelTimer) { clearTimeout(labelTimer); labelTimer = null; }
          paintLabels();
        }
        function paintLabels() {
          if (z < LABEL_Z) { if (layer.firstChild) layer.textContent = ''; return; }
          var vr = view.getBoundingClientRect();
          var out = [], placed = [], cand = [];
          // One layout read per county, collected first, then sorted by area so the
          // largest county wins any collision -- it is the one with room for the name.
          for (var i = 0; i < cty.length; i++) {
            var el0 = cty[i];
            var r0 = el0.getBoundingClientRect();
            if (r0.width < MIN_BOX || r0.height < 16) continue;
            var cx0 = r0.left + r0.width / 2 - vr.left, cy0 = r0.top + r0.height / 2 - vr.top;
            if (cx0 < 0 || cy0 < 0 || cx0 > vr.width || cy0 > vr.height) continue;
            cand.push({ el: el0, x: cx0, y: cy0, a: r0.width * r0.height });
          }
          cand.sort(function (a, b) { return b.a - a.a; });
          for (var i = 0; i < cand.length; i++) {
            var el = cand[i].el, cxp = cand[i].x, cyp = cand[i].y;
            var t = el.getAttribute('data-t') || '';
            // Doubled backslashes: this string is written out THROUGH a template literal,
            // so a single \\s would reach the page as a bare "s" and match the letter.
            var name = t.split(':')[0]
              .replace(/,\\s*[A-Z]{2}$/, '')
              .replace(/\\s+(County|Parish|Borough|Census Area|Municipality|City and Borough)$/, '');
            // Drop a label that would overlap one already placed. Width is estimated
            // from the character count rather than measured: measuring means a layout
            // read per label, which is the slow path, and an estimate is enough to tell
            // a collision from a near miss. Bigger counties are laid out first, so the
            // name that survives a collision is the one with more room to hold it.
            var w = name.length * 5.6 + 6;
            var clash = false;
            for (var j = 0; j < placed.length; j++) {
              var p = placed[j];
              if (Math.abs(p.x - cxp) < (p.w + w) / 2 + 2 && Math.abs(p.y - cyp) < 13) { clash = true; break; }
            }
            if (clash) continue;
            placed.push({ x: cxp, y: cyp, w: w });
            out.push('<span class="rm-label" style="left:' + Math.round(cxp) + 'px;top:' + Math.round(cyp) + 'px">'
              + name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>');
          }
          layer.innerHTML = out.join('');
        }

        // Clamp so the map can never be dragged off its own viewport. At z=1 there is no
        // slack and both bounds collapse to 0, which pins it exactly.
        function clamp() {
          var w = view.clientWidth, h = view.clientHeight;
          var mx = w * (z - 1), my = h * (z - 1);
          if (x > 0) x = 0; if (x < -mx) x = -mx;
          if (y > 0) y = 0; if (y < -my) y = -my;
        }

        // Zoom about a point: keep whatever is under (px,py) under it afterwards.
        function zoomAt(nz, px, py) {
          nz = Math.max(1, Math.min(12, nz));
          var k = nz / z;
          x = px - k * (px - x);
          y = py - k * (py - y);
          z = nz;
          clamp(); draw();
        }

        view.addEventListener('wheel', function (e) {
          e.preventDefault();
          view.classList.add('touched');
          var r = view.getBoundingClientRect();
          zoomAt(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top);
        }, { passive: false });

        view.querySelector('.rm-ctl').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          var k = b.getAttribute('data-z');
          if (k === 'reset') { z = 1; x = 0; y = 0; draw(); return; }
          zoomAt(k === 'in' ? z * 1.5 : z / 1.5, view.clientWidth / 2, view.clientHeight / 2);
        });

        // Pointer events cover mouse, touch and pen in one path. The drag is only a pan
        // once it passes 3px, so a click that wobbles still counts as a hover, not a drag.
        var down = null, moved = false;
        view.addEventListener('pointerdown', function (e) {
          down = { x: e.clientX, y: e.clientY, ox: x, oy: y }; moved = false;
          // Capture is taken only ONCE THE DRAG STARTS (in pointermove), never here.
          // Capturing on pointerdown retargets every later event -- including the click
          // -- to this container, so e.target became the div and closest('.cty') found
          // nothing: the click did nothing at all. Safari retargets most aggressively.
        });
        view.addEventListener('pointermove', function (e) {
          if (down) {
            var dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (!moved && Math.abs(dx) + Math.abs(dy) > 3) {
              moved = true;
              view.classList.add('is-panning', 'touched');
              tip.classList.remove('on');
              // Now that this IS a drag, capture so it keeps tracking outside the map.
              try { view.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
            }
            if (moved) { x = down.ox + dx; y = down.oy + dy; clamp(); draw(); }
            return;
          }
          var el = up(e.target, 'cty');
          if (!el) { if (hot) { hot.classList.remove('is-hot'); hot = null; } tip.classList.remove('on'); return; }
          if (el !== hot) {
            if (hot) hot.classList.remove('is-hot');
            hot = el; hot.classList.add('is-hot');
            // "Kent County, DE: Mixed - tier D, inferred" -> bold place, muted detail.
            var s = el.getAttribute('data-t') || '', i = s.indexOf(':');
            tip.innerHTML = '';
            var b = document.createElement('b');
            b.textContent = i < 0 ? s : s.slice(0, i);
            tip.appendChild(b);
            if (i >= 0) { var sp = document.createElement('span'); sp.textContent = s.slice(i + 1).trim(); tip.appendChild(sp); }
          }
          var r = view.getBoundingClientRect();
          tip.style.left = (e.clientX - r.left) + 'px';
          tip.style.top = (e.clientY - r.top) + 'px';
          tip.classList.add('on');
        });
        // ---- Detail panel -------------------------------------------------------
        // Everything shown here is already on the page or in a file the site already
        // publishes. The panel NEVER says a county has no EMS: an unknown tier means
        // no usable source was found, which is a gap in our reading, not a fact about
        // the county. Same rule as the census: absence of evidence is not evidence.
        var panel = view.querySelector('.rm-panel');
        var pTitle = panel.querySelector('#rm-panel-t');
        var pSub = panel.querySelector('.rm-panel-sub');
        var pBody = panel.querySelector('.rm-panel-bd');
        var COUNTIES = null, loading = null, openF = null;

        var OWN = { public: ['Public', '#0072B2'], private: ['Private', '#D55E00'],
                    hospital: ['Hospital', '#009E73'], mixed: ['Mixed', '#8C6BB1'] };
        var TIER = { A: 'Named by a state record', B: 'Inferred, strong sourcing',
                     C: 'Inferred', D: 'Inferred, weak sourcing' };

        function closePanel() { panel.classList.remove('on'); panel.hidden = true; openF = null; }
        panel.querySelector('.rm-panel-x').addEventListener('click', closePanel);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

        function row(k, v) {
          return '<dl class="rm-row"><dt>' + k + '</dt><dd>' + v + '</dd></dl>';
        }
        function render(f, fallbackTitle) {
          var c = COUNTIES && COUNTIES[f];
          if (!c) { // the file is still loading, or this county is not in it
            pTitle.textContent = fallbackTitle || 'This county';
            pSub.textContent = '';
            pBody.textContent = COUNTIES ? 'No record published for this county.' : 'Loading...';
            return;
          }
          var own = OWN[c.ownership], blank = c.tier === '-';
          pTitle.textContent = c.name + ', ' + c.st;
          // 146 counties have a usable tier but no ownership we could classify. They
          // are NOT the same as the 299 with no source at all, and neither is the
          // county lacking a service -- both are gaps in our reading.
          pSub.textContent = blank ? 'No usable source'
            : own ? own[0] + ' · ' + (TIER[c.tier] || 'tier ' + c.tier).toLowerCase()
            : 'Model not established · ' + (TIER[c.tier] || 'tier ' + c.tier).toLowerCase();
          var h = '';
          h += row('Ownership model', own
            ? '<span class="rm-swatch" style="background:' + own[1] + '"></span>' + own[0]
            : 'Not established');
          h += row('Evidence', blank ? 'No usable source' : (TIER[c.tier] || 'Tier ' + c.tier));
          if (typeof c.pop === 'number') h += row('Population', c.pop.toLocaleString('en-US'));
          h += '<p class="rm-panel-note">' + (blank
            ? 'We could not find a source good enough to say who answers here. That is a gap in our reading, not a finding about the county.'
            : !own
              ? 'We found records for this county but could not tell what kind of agency runs the service. The gap is ours, not the county’s.'
              : c.tier === 'A'
                ? 'Named directly by a state or agency record.'
                : 'Inferred from licensing rosters and Medicare billing. An inferred county is a lead, not a fact.')
            + '</p>';
          // The correction form is the one that already exists further down the page --
          // this link scrolls to it and fills the county in, so a reader who spots a bad
          // row reports it from where they saw it instead of hunting for the form.
          h += '<button type="button" class="rm-report">This is wrong &mdash; tell us</button>';
          pBody.innerHTML = h;
          var rep = pBody.querySelector('.rm-report');
          if (rep) rep.addEventListener('click', function () { report(c); });
        }

        // Hand the county to the correction form and put the cursor in the box that asks
        // what is wrong -- the reader has already told us WHERE by clicking, so the form
        // should not ask them to type it again.
        function report(c) {
          var where = document.getElementById('fix-where');
          var what = document.getElementById('fix-what');
          if (!where || !what) { location.hash = '#correct'; return; }
          where.value = c ? c.name + ', ' + c.st : '';
          var sec = document.getElementById('correct') || where;
          if (sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus after the scroll settles, or the browser jumps to the field instantly
          // and the smooth scroll never happens.
          setTimeout(function () { what.focus({ preventScroll: true }); }, 420);
        }

        function openCounty(el) {
          var f = el.getAttribute('data-f');
          if (!f) return;
          openF = f;
          view.classList.add('touched');
          panel.hidden = false; panel.classList.add('on');
          // Sit on whichever side the county is NOT, so the panel never covers what was
          // just clicked. Anchored bottom-left or bottom-right rather than chasing the
          // cursor, so it does not jitter as you move between neighbouring counties.
          var vr = view.getBoundingClientRect(), cr = el.getBoundingClientRect();
          var onLeft = (cr.left + cr.width / 2) - vr.left < vr.width / 2;
          panel.style.left = onLeft ? 'auto' : '12px';
          panel.style.right = onLeft ? '12px' : 'auto';
          var t = (el.getAttribute('data-t') || '').split(':')[0];
          render(f, t);
          if (COUNTIES || loading) { if (loading) loading.then(function () { if (openF === f) render(f, t); }); return; }
          loading = fetch('/data/county-911.json')
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (j) { COUNTIES = j; })
            .catch(function () { COUNTIES = {}; });
          loading.then(function () { if (openF === f) render(f, t); });
        }

        // A click only counts when the pointer did not travel: otherwise the end of
        // every pan would pop a panel open over the county you dragged to.
        //
        // At 1x the median county is about 12 CSS px across and the smallest are under
        // 7 -- too small to hit on purpose, which is what made clicking feel broken. So
        // a click while zoomed out ALSO zooms toward the county, which both magnifies it
        // and makes the next click on its neighbour an easy target. Once the county is
        // big enough to aim at, clicking stops moving the map and just opens the panel.
        view.addEventListener('click', function (e) {
          if (moved) return;
          var el = up(e.target, 'cty');
          if (!el) { if (!up(e.target, 'rm-panel') && !up(e.target, 'rm-ctl')) closePanel(); return; }
          var r = el.getBoundingClientRect();
          if (Math.max(r.width, r.height) < 22 && z < 12) {
            var vr = view.getBoundingClientRect();
            zoomAt(z * 2.2, e.clientX - vr.left, e.clientY - vr.top);
          }
          openCounty(el);
        });

        function end(e) {
          down = null;
          view.classList.remove('is-panning');
          if (e && e.pointerId != null) {
            try { if (view.hasPointerCapture && view.hasPointerCapture(e.pointerId)) view.releasePointerCapture(e.pointerId); }
            catch (err) { /* already released */ }
          }
          // moved is cleared on the NEXT pointerdown, not here: the click event fires
          // after pointerup, and it needs to know whether this gesture was a drag.
        }
        view.addEventListener('pointerup', end);
        view.addEventListener('pointercancel', end);
        view.addEventListener('pointerleave', function () {
          end();
          if (hot) { hot.classList.remove('is-hot'); hot = null; }
          tip.classList.remove('on');
        });
      })();
    </script>
  </main>

${FOOTER_HTML}
</body>
</html>
`;

mkdirSync('research/atlas', { recursive: true });
writeFileSync('research/atlas/index.html', html);
console.log(`wrote research/atlas/index.html — ${ranked.length} ranked + ${excluded.length} not-comparable states, ${html.length} bytes`);
