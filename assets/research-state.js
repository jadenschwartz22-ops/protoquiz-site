// /research/atlas/?state=XX: one state at full size, with finer county outlines (Census
// 1:500,000), the agencies on record per county, and a searchable county table.
// Data: /data/atlas/geo/<ST>.json (outlines) + /data/atlas/<ST>.json (answers), both
// written by scratch/ems-services (state_geo.py, county_911_all.py).
(function () {
  var NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
  window.ATLAS_STATES = NAMES;
  var OWN = { public: ['Public', '#0072B2'], private: ['Private', '#D55E00'], hospital: ['Hospital', '#009E73'], mixed: ['Mixed', '#8C6BB1'] };
  var OPA = { A: 1, B: 0.85, C: 0.62, D: 0.38 };
  var TIER = { A: 'Named by a state record', B: 'Inferred, strong sourcing', C: 'Inferred', D: 'Inferred, weak sourcing' };
  var pick = document.getElementById('st-pick');
  if (pick) {
    Object.keys(NAMES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = NAMES[k]; pick.appendChild(o); });
    pick.addEventListener('change', function () { location.href = pick.value ? '?state=' + pick.value : location.pathname; });
  }
  var want = (new URLSearchParams(location.search).get('state') || '').toUpperCase();
  var host = document.getElementById('state-view');
  if (host && /^[A-Z]{2}$/.test(want) && !NAMES[want]) {
    document.documentElement.classList.remove('state-mode');
    host.hidden = false;
    host.innerHTML = '<p class="ss-bad">There is no state called &ldquo;' + want + '&rdquo; on this map. Choose one from the list above, or click a county below.</p>';
    return;
  }
  if (!NAMES[want] || !host) return;
  if (pick) pick.value = want;
  document.documentElement.classList.add('state-mode');
  host.hidden = false;
  var name = NAMES[want];
  document.title = name + ' - The American EMS Atlas';

  var eyebrow = '<p class="res-eyebrow"><a href="' + location.pathname + '">&larr; All states</a>'
    + ((window.CENSUS_STATES || []).indexOf(want.toLowerCase()) >= 0 ? ' &nbsp;&middot;&nbsp; <a href="/census/states/' + want.toLowerCase() + '/">Protocol census: ' + name + ' &rarr;</a>' : '') + '</p>';

  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var tierText = function (c) { return c.tier === 'A' ? (c.source === 'local' ? 'Named by a county or agency source' : TIER.A) : (c.tier === '-' ? 'No usable source' : TIER[c.tier]); };
  var ownLabel = function (c) { return OWN[c.ownership] ? OWN[c.ownership][0] : 'Not established'; };
  var n0 = function (n) { return n.toLocaleString('en-US'); };

  // Same skeleton as the loaded page (eyebrow, title, a map-shaped box), so nothing moves when the data lands.
  host.innerHTML = eyebrow + '<h1>' + name + '</h1><p class="lede ss-skel-line">&nbsp;<br>&nbsp;</p><div class="ss-skel"></div>';

  Promise.all(window.__atlas || ['/data/atlas/geo/' + want + '.json', '/data/atlas/' + want + '.json'].map(function (u) {
    return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  })).then(function (res) { render(res[0], res[1]); }).catch(function () {
    host.querySelector('.lede').textContent = 'This state could not be loaded. Try again in a moment.';
  });

  function render(geo, D) {
    var F = Object.keys(D).sort(function (a, b) { return D[b].pop - D[a].pop; });
    var tot = F.reduce(function (s, f) { return s + D[f].pop; }, 0);
    var named = F.filter(function (f) { return D[f].tier === 'A'; });
    var namedPop = named.reduce(function (s, f) { return s + D[f].pop; }, 0);
    var none = F.filter(function (f) { return D[f].tier === '-'; }).length;
    var inferred = F.length - named.length - none;
    var cnt = {}; F.forEach(function (f) { var o = D[f].tier === '-' ? null : D[f].ownership; if (OWN[o]) cnt[o] = (cnt[o] || 0) + 1; });
    var nogrey = F.filter(function (f) { return D[f].tier === '-' || !OWN[D[f].ownership]; }).length;
    var withOwn = Object.keys(cnt).reduce(function (s, k) { return s + cnt[k]; }, 0);

    var lede = named.length
      ? named.length + ' of ' + F.length + ' counties are named directly by a state or agency record, covering ' + Math.round(100 * namedPop / tot) + '% of residents. '
        + (inferred ? inferred + ' more are inferred from licensing rosters and Medicare billing' : 'The rest have no usable source') + (inferred && none ? '; ' + none + ' have no usable source' : '') + '.'
      : (F.length === 1 ? 'The county in ' : 'No county in ') + name + ' is named directly by a state or agency record yet. ' + inferred + ' of ' + F.length + (F.length === 1 ? ' county is' : ' counties are') + ' inferred from licensing rosters and Medicare billing'
        + (none ? '; ' + none + ' have no usable source' : '') + '. An inferred county is a lead, not a fact.';

    host.classList.add('ss-in');
    host.innerHTML =
      eyebrow
      + '<h1>' + name + '</h1><p class="lede">' + esc(lede) + '</p>'
      + '<div class="ss-bar" role="img" aria-label="Counties by ownership of the agency that answers">'
      + Object.keys(OWN).filter(function (k) { return cnt[k]; }).map(function (k) { return '<i style="width:' + (100 * cnt[k] / withOwn).toFixed(1) + '%;background:' + OWN[k][1] + '"><span>' + Math.round(100 * cnt[k] / withOwn) + '%</span></i>'; }).join('')
      + '</div>'
      + '<div class="bar-key">' + Object.keys(OWN).filter(function (k) { return cnt[k]; }).map(function (k) { return '<span class="key"><i style="background:' + OWN[k][1] + '"></i>' + OWN[k][0] + ' &middot; ' + cnt[k] + '</span>'; }).join('') + '<span class="key ss-faint"><i></i>fainter = weaker evidence</span>' + (nogrey ? '<span class="key"><i style="background:#e4e0d6"></i>No source or model not established &middot; ' + nogrey + '</span>' : '') + '</div>'
      + '<div class="ss-grid"><div class="ss-mapbox"><div class="rm-tip" role="presentation"></div>'
      + '<svg class="ss-svg" viewBox="0 0 ' + geo.vb[0] + ' ' + geo.vb[1] + '" role="img" aria-label="' + esc(name) + ' counties coloured by who owns the agency that answers 911">'
      + F.map(function (f) {
          var c = D[f], o = OWN[c.ownership];
          return '<path class="cty" data-f="' + f + '" d="' + (geo.c[f] || '') + '" fill="' + (c.tier === '-' || !o ? '#e4e0d6' : o[1]) + '" fill-opacity="' + (OPA[c.tier] || 1) + '"/>';
        }).join('') + '</svg></div>'
      + '<aside class="ss-card" aria-live="polite"></aside></div>'
      + '<div class="ss-tools"><input type="search" id="ss-q" placeholder="Find a county or an agency" aria-label="Find a county or an agency" autocomplete="off"></div>'
      + '<p class="ss-none" role="status" hidden></p>'
      + '<div class="table-scroll"><table class="res-table ss-table"><thead><tr><th scope="col">County</th><th scope="col" class="num">Residents</th><th scope="col">Who answers / on record</th><th scope="col">Evidence</th></tr></thead><tbody>'
      + F.map(function (f) {
          var c = D[f], o = OWN[c.ownership];
          return '<tr data-f="' + f + '" tabindex="0"><th scope="row">' + esc(c.name) + '</th><td class="num">' + n0(c.pop) + '</td><td>'
            + (c.tier === '-' ? '<span class="ss-mute">No usable source</span>' : (o ? '<span class="rm-swatch" style="background:' + o[1] + ';opacity:' + (OPA[c.tier] || 1) + '"></span>' + o[0] : '<span class="ss-mute">Not established</span>'))
            + (c.a.length ? '<span class="ss-ag">' + (c.tier === 'A' ? '' : '<em>' + (c.tier === 'D' ? 'Medicare billing name, unconfirmed:' : 'On record, unconfirmed:') + '</em> ') + esc(c.a.slice(0, 2).join(', ')) + (c.n > 2 ? ' +' + (c.n - 2) : '') + '</span>' : '') + '</td><td>' + tierText(c) + (c.partial ? ' (some towns)' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';

    var svg = host.querySelector('.ss-svg'), tip = host.querySelector('.rm-tip'), card = host.querySelector('.ss-card'), box = host.querySelector('.ss-mapbox');
    var paths = {}; Array.prototype.forEach.call(svg.querySelectorAll('.cty'), function (p) { paths[p.getAttribute('data-f')] = p; });
    var rows = {}; Array.prototype.forEach.call(host.querySelectorAll('tbody tr'), function (r) { rows[r.getAttribute('data-f')] = r; });
    var sel = null;

    function cardHtml(f) {
      var c = D[f], o = OWN[c.ownership], blank = c.tier === '-';
      var h = '<h3>' + esc(c.name) + '</h3><p class="rm-panel-sub">' + (blank ? 'No usable source' : (o ? o[0] : 'Model not established') + ' &middot; ' + tierText(c).toLowerCase()) + '</p>';
      h += '<dl><div class="rm-row"><dt>Residents</dt><dd>' + n0(c.pop) + '</dd></div></dl>';
      if (c.a.length) {
        h += '<h4>' + (c.tier === 'A' ? 'Named as answering' : c.tier === 'D' ? 'Billing names (Medicare), not confirmed' : 'On record here, not confirmed') + '</h4><ul>'
          + c.a.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>'
          + (c.n > c.a.length ? '<p class="ss-mute">and ' + (c.n - c.a.length) + ' more</p>' : '');
      }
      h += '<p class="rm-panel-note">' + (blank
        ? 'We could not find a source good enough to say who answers here. That is a gap in our reading, not a finding about the county.'
        : c.tier === 'A' ? (c.source === 'local' ? 'Named directly by a county or agency source.' : 'Named directly by a state record.')
        : (c.partial ? 'A record names the provider for some towns here, not the whole county. ' : '')
          + 'Agencies are listed by licence address or Medicare billing, which is not proof they answer 911 in this county. An inferred county is a lead, not a fact.') + '</p>'
        + '<button type="button" class="rm-report">This is wrong &mdash; tell us</button>'
        + '<button type="button" class="rm-link">Copy link to this county</button>';
      return h;
    }
    var hint = 'Select a county on the map, or a row below, to see the agencies on record.';
    function clear() {
      if (!sel) return;
      paths[sel].classList.remove('is-sel'); rows[sel].classList.remove('is-sel'); sel = null;
      svg.classList.remove('has-sel'); card.classList.remove('on');
      card.innerHTML = '<p class="ss-mute">' + hint + '</p>';
      history.replaceState(null, '', location.pathname + location.search);
    }
    function select(f, scroll) {
      if (f === sel) return clear();
      if (sel) { paths[sel].classList.remove('is-sel'); rows[sel].classList.remove('is-sel'); }
      sel = f; paths[f].classList.add('is-sel'); rows[f].classList.add('is-sel');
      svg.appendChild(paths[f]);  // draw the picked county last so no neighbour covers its outline
      svg.classList.add('has-sel');
      card.innerHTML = cardHtml(f); card.classList.add('on');
      var lk = card.querySelector('.rm-link');
      lk.addEventListener('click', function () {
        var u = location.href.split('#')[0] + '#' + f, done = function () { lk.textContent = 'Link copied'; setTimeout(function () { lk.textContent = 'Copy link to this county'; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, function () { prompt('Copy this link', u); }); else prompt('Copy this link', u);
      });
      history.replaceState(null, '', '#' + f);
      card.querySelector('.rm-report').addEventListener('click', function () {
        var where = document.getElementById('fix-where'), what = document.getElementById('fix-what');
        var d = document.getElementById('correct'), fold = d && d.closest('details');
        if (fold) fold.open = true;
        if (where) where.value = D[f].name + ', ' + want;
        if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (what) setTimeout(function () { what.focus({ preventScroll: true }); }, 420);
      });
      if (scroll) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    card.innerHTML = '<p class="ss-mute">' + hint + '</p>';

    svg.addEventListener('pointermove', function (e) {
      var p = e.target.closest && e.target.closest('.cty');
      if (!p) { tip.classList.remove('on'); return; }
      var c = D[p.getAttribute('data-f')], r = box.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(c.name) + '</b><span>' + (c.tier === '-' ? 'No usable source' : ownLabel(c) + ' &middot; ' + tierText(c).toLowerCase()) + '</span>';
      tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.classList.add('on');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') clear(); });
    svg.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    svg.addEventListener('click', function (e) { var p = e.target.closest && e.target.closest('.cty'); if (p) select(p.getAttribute('data-f'), true); });
    host.querySelector('tbody').addEventListener('click', function (e) { var r = e.target.closest('tr'); if (r) select(r.getAttribute('data-f'), false); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    host.querySelector('tbody').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('tr')) select(e.target.getAttribute('data-f'), false); });

    var q = host.querySelector('#ss-q'), none = host.querySelector('.ss-none');
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase(), hits = 0;
      F.forEach(function (f) {
        var c = D[f], hit = !t || (c.name + ' ' + c.a.join(' ')).toLowerCase().indexOf(t) >= 0;
        if (hit) hits++;
        rows[f].hidden = !hit; paths[f].classList.toggle('is-dim', !hit);
      });
      none.hidden = hits > 0;
      if (!hits) { none.innerHTML = 'No county or agency in ' + esc(want) + ' matches &ldquo;' + esc(q.value.trim()) + '&rdquo;. <button type="button">Clear search</button>'; none.querySelector('button').onclick = function () { q.value = ''; q.dispatchEvent(new Event('input')); q.focus(); }; }
    });
    var h0 = location.hash.slice(1);
    if (D[h0]) select(h0, false), box.scrollIntoView({ block: 'nearest' });
  }
})();
