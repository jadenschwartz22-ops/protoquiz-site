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
import { navFor, researchBar, listingStrip, FOOTER_HTML, CHROME_HEAD, assetHash } from './shared-chrome.mjs';

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
).replace('</svg>', '</svg>\n  </div>')
  // Each county's <title> becomes a data-t attribute at build time. Left as <title>,
  // the browser draws its own slow native tooltip over ours, and stripping 3,133 of
  // them in the page script cost a DOM pass on every load.
  .replace(/><title>([^<]*)<\/title><\/path>/g, (_, t) => ` data-t="${t.replace(/"/g, '&quot;')}"></path>`);

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

// By-state groups, most confident source first. Each bar is a 100% stack in the national
// bar's colours; the numbers live in its label and in the table fold below.
const labelled = new Set(R.labelStates || []);
const GROUPS = [
  { name: 'State labels ownership', why: 'the roster carries the state\u2019s own ownership field', open: true,
    states: ranked.filter(([c]) => labelled.has(c)) },
  { name: 'Ownership read from agency names', why: 'roster exists, ownership inferred from names',
    states: ranked.filter(([c]) => !labelled.has(c)) },
  { name: 'Fire-station list, leans fire', why: 'no EMS roster, so fire share runs high',
    states: excluded.filter(([, d]) => d.tag === 'station').sort(byFire) },
  { name: 'Not ranked', why: 'station list only, overstates fire; left out of national figures', line: true,
    states: excluded.filter(([, d]) => d.tag === 'floor') },
];
const stateBar = ([code, d]) => {
  const label = `${code}, ${d.n.toLocaleString('en-US')} agencies: ` + MODELS.filter(m => d.pct[m])
    .map(m => `${Math.round(d.pct[m])}% ${MODEL_LABEL[m].toLowerCase()}`).join(', ');
  return `        <div class="st-item" title="${label}"><b>${code}</b><div class="st-bar" role="img" aria-label="${label}">`
    + MODELS.filter(m => d.pct[m]).map(m => `<i class="m-${m}" style="width:${d.pct[m].toFixed(1)}%"></i>`).join('')
    + '</div></div>';
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The American EMS Atlas - who answers 911, by county</title>
  <meta name="description" content="A state-by-state map of who provides 911 EMS in the United States: fire departments, private ambulance companies, county third services or hospitals. Built from state licensing rosters.">
  <link rel="canonical" href="https://protoquiz.com/research/atlas/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="Who runs American EMS">
  <meta property="og:description" content="A state-by-state map of who provides 911 EMS in the United States, built from state licensing rosters.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://protoquiz.com/research/">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:site_name" content="ProtoQuiz">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css?v=${assetHash('assets/research.css')}">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${navFor('/research/atlas/')}
${researchBar('/research/atlas/')}

  <main id="main">
    <section class="res-hero">
      <div class="res-eyebrow">Early release &middot; ${R.asOf}</div>
      <h1>Who runs American EMS?</h1>
      <p class="lede">In some states a fire department answers the 911 call. In others it is a
      private ambulance company, a county service, or a hospital. This map shows it county by county, from the states' own licensing rosters.</p>
    </section>

    <section class="res-map-wrap">
${mapWithControls(MAP)}
      <p class="map-note">The model changes at county lines, not state lines, which is why this
      is drawn by county. The averages below come from state licensing rosters instead, so they
      answer &ldquo;what share of agencies are fire-based&rdquo;, not &ldquo;who shows up
      here&rdquo;.</p>
    </section>

    <section class="res-headline">
      <div class="res-eyebrow">Across ${R.realStates} states ranked</div>
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
      <div class="bar-key">
${MODELS.map(m => `        <span class="key"><i class="m-${m.replace(' ', '')}"></i>${MODEL_LABEL[m]}</span>`).join('\n')}
      </div>
${GROUPS.map(g => `      <details class="res-fold st-group"${g.open ? ' open' : ''}>
      <summary><h3>${g.name}</h3><span>${g.states.length} states &middot; ${g.why}</span></summary>
${g.line ? `      <p class="res-subnote">${g.states.map(([c]) => c).join(', ')}</p>` : `      <div class="st-grid">
${g.states.map(stateBar).join('\n')}
      </div>`}
      </details>`).join('\n')}
      <details class="res-fold">
      <summary><h3>Show the numbers</h3><span>agency counts and shares, every state</span></summary>
      <div class="table-scroll">
      <table class="res-table">
        <thead>
          <tr><th scope="col">State</th><th scope="col" class="num">Agencies</th>
${MODELS.map(m => `            <th scope="col" class="num">${MODEL_LABEL[m]}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
${ranked.map(stateRow).join('\n')}
${excluded.map(stateRow).join('\n')}
        </tbody>
      </table>
      </div>
      </details>
    </section>

    <section class="res-method">
      <details class="res-fold">
      <summary><h2>About this map</h2><span>what the colors and shading mean</span></summary>
      <h3>Colors: who provides 911 EMS</h3>
      <dl>
        <dt>Fire-based</dt><dd>A fire department or fire district.</dd>
        <dt>Private</dt><dd>An ambulance company or volunteer ambulance corps.</dd>
        <dt>Third service</dt><dd>A county or city EMS agency that is not the fire department.</dd>
        <dt>Hospital</dt><dd>A hospital or health system.</dd>
      </dl>

      <h3>Shading: how sure we are</h3>
      <dl class="tierdl">
        <dt><span class="tierchip t-a"></span>Named</dt><dd>A state or agency record names the provider. The only tier we treat as known.</dd>
        <dt><span class="tierchip t-b"></span>Confirmed biller</dt><dd>A licensed ambulance service in the county bills mostly emergency transports (Medicare).</dd>
        <dt><span class="tierchip t-c"></span>Located here</dt><dd>A licensed ambulance service is based in the county.</dd>
        <dt><span class="tierchip t-d"></span>Billing only</dt><dd>Only Medicare billing points to it. The weakest signal.</dd>
      </dl>
      <p>Anything below Named is a lead, not a fact. Agencies are placed at their license address, so one covering many counties can be misplaced.</p>

      <h3>Known gaps</h3>
      <ul>
        <li>${R.floorStates.join(', ')} publish no EMS roster. Their data comes from fire stations, so it overstates fire-based EMS. <span class="src-flag floor">station list only</span>, left out of national figures.</li>
        <li>${R.stationStates.join(', ')} list fire stations, with the same bias, milder. <span class="src-flag">fire-station source</span></li>
        <li>Ownership is mostly guessed from the agency name, right about ${R.agreement}% of the time. National totals are more reliable than any single row.</li>
      </ul>
      <p>This shows who holds the license, not quality or response times.</p>

      </details>

      <details class="res-fold" id="correct">
      <summary><h2>See a mistake?</h2><span>tell us and we will fix it</span></summary>
      <p>Name the county and who answers its 911 calls. A link helps but is not required.</p>
      <form class="fix-form" id="fix-form" novalidate>
        <label for="fix-where">County and state</label>
        <input type="text" id="fix-where" name="where" required placeholder="Kern County, CA" autocomplete="off" />
        <label for="fix-what">What is wrong, and what is right</label>
        <textarea id="fix-what" name="what" required rows="4" placeholder="The map shows a private company. The county runs its own EMS and has since 2019."></textarea>
        <label for="fix-src">Link to a source <span class="muted">(optional)</span></label>
        <input type="url" id="fix-src" name="src" placeholder="https://" autocomplete="url" />
        <label for="fix-email">Your email <span class="muted">(optional) so we can tell you when it is fixed</span></label>
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
                message: 'REGISTRY CORRECTION\\n\\nCounty: ' + where + '\\n\\n' + what + (src ? '\\n\\nSource: ' + src : ''),
                source: 'research-atlas-correction'
              })
            }).then(function (r) {
              if (!r.ok) throw new Error('bad status');
              f.reset();
              msg.textContent = 'Thank you — this goes straight to a human, and a county we are told about gets checked first.';
            }).catch(function () {
              btn.disabled = false;
              msg.textContent = 'That did not send. Email support@protoquiz.com instead and it will get the same treatment.';
            });
          });
        })();
      </script>
      </details>
    </section>

    <script>
      // The folds hold content that links point into (#correct, the county panel's
      // report button). Open the fold before scrolling to anything inside it.
      function openTo(id) {
        var el = document.getElementById(id), d = el && el.closest('details');
        if (d) d.open = true;
        return el;
      }
      if (location.hash) openTo(location.hash.slice(1));
      addEventListener('hashchange', function () { var el = openTo(location.hash.slice(1)); if (el) el.scrollIntoView(); });
    </script>
    <script>
      (function () {
        var view = document.querySelector('.rm-view');
        if (!view) return;
        var svg = view.querySelector('.rm-svg'), tip = view.querySelector('.rm-tip');
        var z = 1, x = 0, y = 0, hot = null;

        var cty = svg.querySelectorAll('.cty');

        // Geometry is cached, never re-measured per frame. Each county's box is read once
        // in SVG units (getBBox), and the map's own offset and scale once per resize;
        // after that a county's on-screen box is arithmetic on (x, y, z). The old code
        // called getBoundingClientRect on all 3,133 paths on every zoom and every 90ms
        // of a drag -- a forced layout each time, which is what made navigation crawl.
        // ax/ay/az are the transform actually on the SVG, which is what a measurement
        // sees -- x/y/z may already hold the next frame's values.
        var vb = svg.viewBox.baseVal, geo = null, ax = 0, ay = 0, az = 1;
        function measure() {
          if (geo) return geo;
          var vr = view.getBoundingClientRect(), sr = svg.getBoundingClientRect();
          return (geo = { w: view.clientWidth, h: view.clientHeight, s: sr.width / (az * vb.width),
            ox: sr.left - vr.left - ax, oy: sr.top - vr.top - ay });
        }
        if (window.ResizeObserver) new ResizeObserver(function () { geo = null; }).observe(view);
        // A county's box in view coordinates: {l, t, w, h}.
        function box(el) {
          var b = el._b || (el._b = el.getBBox()), g = measure(), k = g.s * z;
          return { l: g.ox + x + k * (b.x - vb.x), t: g.oy + y + k * (b.y - vb.y), w: k * b.width, h: k * b.height };
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
          if (!geo) measure();  // before the transform is written, so it reads a clean layout
          svg.style.transform = 'translate(' + (ax = x) + 'px,' + (ay = y) + 'px) scale(' + (az = z) + ')';
          // Written only on change: a same-value write still dirties layout, which during
          // a pan would turn every compositor-only frame into a full one.
          var zl = (z < 9.95 ? Math.round(z * 10) / 10 : Math.round(z)) + '×';
          if (lvl && lvl.textContent !== zl) lvl.textContent = zl;
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
        // Painted synchronously on zoom. WHILE DRAGGING they are not re-laid out at all:
        // a pan is a pure translation, so the painted layer is just shifted with the map
        // and repainted once on pointerup. Rebuilding them per frame forced a full layout,
        // and with non-scaling-stroke that re-lays out every county path -- the long
        // tasks that made panning stutter. The svg transform alone stays compositor-only.
        var lx = 0, ly = 0;
        function labels() {
          if (down && moved) { layer.style.transform = 'translate(' + (x - lx) + 'px,' + (y - ly) + 'px)'; return; }
          paintLabels();
        }
        function paintLabels() {
          lx = x; ly = y; layer.style.transform = '';
          if (z < LABEL_Z) { if (layer.firstChild) layer.textContent = ''; return; }
          var g = measure();
          var out = [], placed = [], cand = [];
          // Collected first, then sorted by area so the largest county wins any
          // collision -- it is the one with room for the name.
          for (var i = 0; i < cty.length; i++) {
            var el0 = cty[i];
            var r0 = box(el0);
            if (r0.w < MIN_BOX || r0.h < 16) continue;
            var cx0 = r0.l + r0.w / 2, cy0 = r0.t + r0.h / 2;
            if (cx0 < 0 || cy0 < 0 || cx0 > g.w || cy0 > g.h) continue;
            cand.push({ el: el0, x: cx0, y: cy0, a: r0.w * r0.h });
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
          var g = measure(), w = g.w, h = g.h;
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
          var g = measure();
          zoomAt(k === 'in' ? z * 1.5 : z / 1.5, g.w / 2, g.h / 2);
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
          var r = view.getBoundingClientRect();  // read before any write below: no forced layout
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
        // Tier A says which kind of record named the county: a state layer or a local page.
        function tierText(c) { return c.tier === 'A' && c.source === 'local' ? 'Named by a county or agency source' : (TIER[c.tier] || 'Tier ' + c.tier); }

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
            : (own ? own[0] : 'Model not established') + ' · ' + tierText(c).toLowerCase();
          var h = '';
          h += row('Ownership model', own
            ? '<span class="rm-swatch" style="background:' + own[1] + '"></span>' + own[0]
            : 'Not established');
          h += row('Evidence', blank ? 'No usable source' : tierText(c));
          if (typeof c.pop === 'number') h += row('Population', c.pop.toLocaleString('en-US'));
          h += '<p class="rm-panel-note">' + (blank
            ? 'We could not find a source good enough to say who answers here. That is a gap in our reading, not a finding about the county.'
            : !own
              ? 'We found records for this county but could not tell what kind of agency runs the service. The gap is ours, not the county’s.'
              : c.tier === 'A'
                ? (c.source === 'local' ? 'Named directly by a county or agency source.' : 'Named directly by a state record.')
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
          var sec = openTo('correct') || where;
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
          var cr = box(el);
          var onLeft = cr.l + cr.w / 2 < measure().w / 2;
          panel.style.left = onLeft ? 'auto' : '12px';
          panel.style.right = onLeft ? '12px' : 'auto';
          var t = (el.getAttribute('data-t') || '').split(':')[0];
          render(f, t);
          if (!COUNTIES) load().then(function () { if (openF === f) render(f, t); });
        }
        // The county file (~270KB) is fetched the moment a pointer reaches the map, not
        // on the first click, so the first panel opens filled instead of on "Loading...".
        function load() {
          return loading || (loading = fetch('/data/county-911.json')
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (j) { COUNTIES = j; })
            .catch(function () { COUNTIES = {}; }));
        }
        view.addEventListener('pointerenter', load, { once: true });

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
          var r = box(el);
          if (Math.max(r.w, r.h) < 22 && z < 12) {
            var vr = view.getBoundingClientRect();
            zoomAt(z * 2.2, e.clientX - vr.left, e.clientY - vr.top);
          }
          openCounty(el);
        });

        function end(e) {
          var wasDrag = down && moved;
          down = null;
          if (wasDrag) labels();  // the final, synchronous label paint for this pan
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
