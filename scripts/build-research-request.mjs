#!/usr/bin/env node
// Builds /research/request/: the one form for adding, fixing or removing anything in the
// census or the 911 atlas. Every "add / fix / remove" link on the site points here, with
// ?type= (and optionally &agency=) to preset it. Posts to the general contact endpoint
// (b2b-ingest `contactForm`: {name, email, phone, message, source}) as one readable message.
import { writeFileSync, mkdirSync } from 'node:fs';
import { navFor, researchBar, FOOTER_HTML, CHROME_HEAD, assetHash } from './shared-chrome.mjs';

const ENDPOINT = 'https://api.protoquiz.com/api/monitor?type=contactForm';
const CONTACT = 'support@protoquiz.com';
export const REQUEST_TYPES = [
  ['add', 'Add our protocol'],
  ['fix', 'Fix a census listing'],
  ['remove', 'Remove our agency'],
  ['county', 'Fix a county on the 911 map'],
  ['other', 'Something else'],
];

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Add, fix, or remove - ProtoQuiz Research</title>
  <meta name="description" content="Add your agency's protocol to the EMS Protocol Census, fix or remove a listing, or correct a county on the 911 map. Handled the same day.">
  <link rel="canonical" href="https://protoquiz.com/research/request/">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/research.css?v=${assetHash('assets/research.css')}">
  <style>
    .rq{max-width:640px;margin:0 auto;padding:20px 24px 56px;box-sizing:border-box}
    .rq h1{font-size:1.75rem;letter-spacing:-.02em;margin:0 0 6px}
    .rq .lede{margin:0 0 18px}
    .rq form{display:grid;gap:14px}
    .rq fieldset{border:0;padding:0;margin:0;display:grid;gap:6px}
    .rq legend,.rq label.f{font-size:.8125rem;font-weight:600;color:var(--ink);margin:0 0 4px;padding:0}
    .rq .opt{display:flex;gap:8px;align-items:center;padding:8px 12px;border:1px solid var(--rule);border-radius:var(--r);cursor:pointer;font-size:.9375rem}
    .rq .opt:has(input:checked){border-color:var(--link);background:color-mix(in oklch,var(--link) 6%,var(--ground))}
    .rq input[type=text],.rq input[type=url],.rq input[type=email],.rq textarea{width:100%;box-sizing:border-box;font:inherit;font-size:1rem;padding:9px 11px;border:1px solid var(--rule);border-radius:var(--r);background:#fff;color:var(--ink)}
    .rq textarea{min-height:110px;resize:vertical}
    .rq .muted{font-weight:400;color:var(--muted)}
    .rq button{justify-self:start;font:inherit;font-weight:600;padding:10px 22px;border:0;border-radius:var(--r);background:#0072B2;color:#fff;cursor:pointer}
    .rq button[disabled]{opacity:.5}
    .rq .msg{margin:0;font-size:.9375rem;min-height:1.4em}
    .rq .done{padding:16px;border:1px solid var(--rule);border-radius:var(--r);background:var(--panel);font-size:1rem}
    .rq .hp{position:absolute;left:-9999px}
    .rq .alt{font-size:.875rem;color:var(--muted);margin:18px 0 0}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
${navFor('/research/')}
${researchBar('/research/')}
  <main id="main" class="rq">
    <h1>Add, fix, or remove</h1>
    <p class="lede">For the protocol census and the 911 map. A person reads every request, and it is handled the same day.</p>
    <form id="rq" novalidate>
      <fieldset>
        <legend>Request</legend>
${REQUEST_TYPES.map(([v, l], i) => `        <label class="opt"><input type="radio" name="type" value="${v}"${i ? '' : ' checked'}> ${l}</label>`).join('\n')}
      </fieldset>
      <div><label class="f" for="rq-agency">Agency or county</label><input type="text" id="rq-agency" name="agency" autocomplete="organization"></div>
      <div><label class="f" for="rq-link">Link <span class="muted">(optional) protocol URL or census page</span></label><input type="url" id="rq-link" name="link" placeholder="https://"></div>
      <div><label class="f" for="rq-email">Your email <span class="muted">(optional) so we can tell you when it is done</span></label><input type="email" id="rq-email" name="email" autocomplete="email"></div>
      <div><label class="f" for="rq-details">Details</label><textarea id="rq-details" name="details"></textarea></div>
      <p class="hp" aria-hidden="true"><label>Leave empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>
      <button type="submit">Send</button>
      <p class="msg" id="rq-msg" role="status"></p>
    </form>
    <p class="alt">Rather email? <a href="mailto:${CONTACT}">${CONTACT}</a></p>
  </main>
  <script>
  (function () {
    var f = document.getElementById('rq'), msg = document.getElementById('rq-msg'), q = new URLSearchParams(location.search);
    var labels = ${JSON.stringify(Object.fromEntries(REQUEST_TYPES))};
    if (labels[q.get('type')]) f.elements.type.value = q.get('type');
    if (q.get('agency')) f.elements.agency.value = q.get('agency');
    if (q.get('link')) f.elements.link.value = q.get('link');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements.website.value) return;
      var v = function (n) { return f.elements[n].value.trim(); };
      if (!v('agency') && !v('details') && !v('link')) { msg.textContent = 'Tell us which agency or county, or add a detail.'; return; }
      var email = v('email');
      if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { msg.textContent = 'That email does not look right.'; return; }
      var parts = ['[' + labels[f.elements.type.value] + ']'];
      [['Agency', 'agency'], ['Link', 'link'], ['Details', 'details']].forEach(function (p) { if (v(p[1])) parts.push(p[0] + ': ' + v(p[1])); });
      var btn = f.querySelector('button');
      btn.disabled = true; msg.textContent = 'Sending...';
      fetch('${ENDPOINT}', {
        // Accept: JSON, or the handler answers with a 302 to the referer and fetch reads it as failure.
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email || undefined, message: (parts[0] + ' ' + parts.slice(1).join(' | ')).slice(0, 5000), source: 'research-request' })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        f.outerHTML = '<p class="done" role="status">Got it. Handled the same day.' + (email ? ' We will email you when it is done.' : '') + '</p>';
      }).catch(function () {
        btn.disabled = false;
        msg.innerHTML = 'That did not send. Email <a href="mailto:${CONTACT}">${CONTACT}</a> and it is handled the same way.';
      });
    });
  })();
  </script>
${FOOTER_HTML}
</body>
</html>
`;

mkdirSync('research/request', { recursive: true });
writeFileSync('research/request/index.html', html);
console.log(`wrote research/request/index.html (${html.length} bytes)`);
