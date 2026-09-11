// scripts/build-app.mjs — generates /app/index.html.
//
// The page is generated rather than hand-written for one reason: the nav and footer
// must be byte-identical to every other page on the site, and pasting them by hand is
// how they drift. Live numbers come from data/, never from a doc.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { navFor, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';

const stats = JSON.parse(readFileSync('data/firestore-stats.json', 'utf8')).raw;
const MAP = readFileSync('assets/reach-map.html', 'utf8');
const reach = JSON.parse(readFileSync('data/reach-stats.json', 'utf8'));

const APPLE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.6-3.6zM14.2 5.9c.6-.8 1-1.9.9-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z"/></svg>`;
const PLAY = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 2.3c-.3.3-.4.7-.4 1.3v16.8c0 .6.1 1 .4 1.3l.1.1 9.4-9.4v-.2L3.7 2.2l-.1.1z" fill="oklch(72% 0.16 155)"/><path d="M16.3 15.6l-3.2-3.2v-.2l3.2-3.2.1.1 3.7 2.1c1.1.6 1.1 1.6 0 2.2l-3.8 2.2z" fill="oklch(80% 0.15 85)"/><path d="M16.4 15.5L13.1 12.3 3.6 21.8c.4.4 1 .4 1.7.1l11.1-6.4" fill="oklch(62% 0.19 25)"/><path d="M16.4 9.1L5.3 2.8c-.7-.4-1.3-.3-1.7.1l9.5 9.4 3.3-3.2z" fill="oklch(72% 0.15 200)"/></svg>`;
const STAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="oklch(74% 0.16 78)" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>`;

const STEPS = [
  ['01', "Upload your agency's PDF", 'The document your medical director signed, however many hundreds of pages it runs.'],
  ['02', 'We extract the structure', 'Drugs, doses, routes and decision points, each tied back to the page it came from.'],
  ['03', 'Quiz, learn, compete', 'Pharmacology, algorithms, adaptive scenarios and spaced repetition on your own protocols.'],
];

const REVIEWS = [
  ['Game changer', "Finally something that quizzes me on my own protocols instead of generic registry questions."],
  ['Super fun scenarios', 'The adaptive scenarios actually feel like running a call.'],
];

const FAQ = [
  ['What protocols does it work with?',
   "Any full-length protocol document: medication formulary, treatment protocols, algorithms, procedures. That's what powers the scenarios, pharmacology quizzes and algorithm tests. No preloaded NREMT filler. Your protocol set, exactly."],
  ['Is it accurate?',
   'Every answer cites the exact page in your PDF. One tap and you are at the source. Nothing is generated outside the document you uploaded. In our testing it runs about 90% accuracy across the board on any EMS protocol, which is why you can edit any extraction and data yourself to fix errors.'],
  ['What kinds of quizzes are there?',
   'Four kinds. Pharmacology quizzes cover adult and pediatric doses, indications, contraindications, routes, mechanisms and adverse effects. Algorithm tests are pulled from your protocol flowcharts. Adaptive patient scenarios respond to your decisions. Learn Mode runs spaced repetition on the meds you keep missing.'],
  ['What does it cost?',
   'Free, ad-supported. An optional paid upgrade clears the ads. No features are paywalled behind premium.'],
  ['Is it on Android?',
   'Yes. ProtoQuiz runs on both iOS and Android, and both carry the same two themes: Night Shift and Day Shift.'],
];

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProtoQuiz for EMTs and Paramedics - Protocol Study App</title>
  <meta name="description" content="Upload your agency's protocol PDF. Quiz yourself on pharmacology, algorithms and adaptive patient scenarios. Page-cited answers. Free on iOS and Android.">
  <link rel="canonical" href="https://protoquiz.com/app/">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="ProtoQuiz - EMS Protocol Quizzes and Scenarios">
  <meta property="og:description" content="Upload your agency's protocol PDF. Quiz yourself on pharmacology, algorithms and adaptive patient scenarios. Page-cited answers.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://protoquiz.com/app/">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="ProtoQuiz - turn your protocol PDF into quizzes and scenarios.">
  <meta property="og:site_name" content="ProtoQuiz">
  <meta property="og:locale" content="en_US">
  <meta name="theme-color" content="#f6f7f9">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="ProtoQuiz - EMS Protocol Quizzes and Scenarios">
  <meta name="twitter:description" content="Upload your protocol PDF. Quiz yourself on pharmacology, algorithms and adaptive patient scenarios.">
  <meta name="twitter:image" content="https://protoquiz.com/og-image.png">
  <meta name="twitter:image:alt" content="ProtoQuiz - turn your protocol PDF into quizzes and scenarios.">
  <meta name="apple-itunes-app" content="app-id=6753611139">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=4">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/conveyor.css">
  <link rel="stylesheet" href="/assets/app.css?v=6651072d">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${navFor('/app/')}

  <main id="main">
    <section class="app-hero">
      <div class="app-hero-grid">
        <div>
          <div class="eyebrow">For providers</div>
          <h1>Master your EMS protocols.</h1>
          <p class="lede">Upload your agency's protocol PDF. Quizzes, adaptive scenarios and drug lookups built from that document, every answer cited to its page.</p>
          <div class="stores">
            <a class="store" href="https://apps.apple.com/app/id6753611139">
              ${APPLE}
              <span><span class="store-sm">Download on the</span><br><span class="store-lg">App Store</span></span>
            </a>
            <a class="store" href="https://play.google.com/store/apps/details?id=com.tmtl.emsprotoquiz">
              ${PLAY}
              <span><span class="store-sm">Get it on</span><br><span class="store-lg">Google Play</span></span>
            </a>
          </div>
          <div class="stores-note">Free to start &middot; no card required</div>
        </div>

        <div class="shot-col">
          <div class="toggles">
            <div class="toggle" role="group" aria-label="Platform">
              <button type="button" data-set="platform:ios" aria-pressed="true">${APPLE.replace('width="20" height="20"','width="13" height="13"')}<span>iOS</span></button>
              <button type="button" data-set="platform:android" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 9.5l1.4-2.4a.3.3 0 00-.5-.3L17 9.2a9.6 9.6 0 00-8.1 0L7.4 6.8a.3.3 0 00-.5.3l1.4 2.4A8.3 8.3 0 004 16h16a8.3 8.3 0 00-2.4-6.5zM8.5 13.4a.8.8 0 110-1.6.8.8 0 010 1.6zm7 0a.8.8 0 110-1.6.8.8 0 010 1.6z"/></svg><span>Android</span></button>
            </div>
            <div class="toggle" role="group" aria-label="Theme">
              <button type="button" data-set="shift:night" aria-pressed="false"><span class="dot dot-night"></span><span>Night</span></button>
              <button type="button" data-set="shift:day" aria-pressed="true"><span class="dot dot-day"></span><span>Day</span></button>
            </div>
          </div>
          <div class="phone" data-phone>
            <img data-shot src="/app-shots/day-study-hub.png" alt="The ProtoQuiz study hub in Day Shift" width="250" height="543">
          </div>
          <div class="shot-caption" data-shot-caption>iPhone &middot; Day Shift</div>
        </div>
      </div>
    </section>

    <section class="belt-wrap">
      <div class="conveyor">
      <p class="conveyor-eyebrow">
      <span class="green-dot" aria-hidden="true"></span><span class="live">LIVE</span>
      <span class="dot" aria-hidden="true"></span><span>indexing protocols across the US &amp; the world</span>
      </p>
      <div class="belt" aria-hidden="true">
      <div class="track">
      <div class="doc s1"><div class="doc-eyebrow">Los Angeles Co</div><div class="doc-title">LA County Treatment Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">412p</span></div></div>
      <div class="doc c2 s4"><div class="doc-eyebrow">New York State</div><div class="doc-title">REMAC Unified Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>v26.1</span><span class="pg">356p</span></div></div>
      <div class="doc c3 s2"><div class="doc-eyebrow">Massachusetts</div><div class="doc-title">MA OEMS Statewide</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">284p</span></div></div>
      <div class="doc s3"><div class="doc-eyebrow">New Jersey</div><div class="doc-title">NJ EMS Clinical Practice</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">241p</span></div></div>
      <div class="doc c4 s5"><div class="doc-eyebrow">Washington</div><div class="doc-title">EMT WA Protocol Set</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">198p</span></div></div>
      <div class="doc c5 s6"><div class="doc-eyebrow">Maryland</div><div class="doc-title">MD Medical Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">327p</span></div></div>
      <div class="doc s7"><div class="doc-eyebrow">Utah</div><div class="doc-title">Utah EMS Guidelines</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">219p</span></div></div>
      <div class="doc c2 s8"><div class="doc-eyebrow">Pennsylvania</div><div class="doc-title">PA BLS Protocols v23.1</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">176p</span></div></div>
      <div class="doc c3 s1"><div class="doc-eyebrow">San Diego Co</div><div class="doc-title">SD Protocol Packet</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>25-26</span><span class="pg">381p</span></div></div>
      <div class="doc s4"><div class="doc-eyebrow">West Virginia</div><div class="doc-title">WV State Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">304p</span></div></div>
      <div class="doc c4 s2"><div class="doc-eyebrow">Alabama</div><div class="doc-title">AL Master Protocols 11e</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">422p</span></div></div>
      <div class="doc c5 s3"><div class="doc-eyebrow">Indiana</div><div class="doc-title">IN EMS Scope of Practice</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">167p</span></div></div>
      <div class="doc s5"><div class="doc-eyebrow">Santa Cruz Co</div><div class="doc-title">Santa Cruz EMS Policies</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">289p</span></div></div>
      <div class="doc c2 s6"><div class="doc-eyebrow">Greater Miami</div><div class="doc-title">Miami-Dade Fire Rescue</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">344p</span></div></div>
      <div class="doc c3 s7"><div class="doc-eyebrow">Snohomish Co</div><div class="doc-title">Snohomish Co Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">213p</span></div></div>
      <div class="doc s8"><div class="doc-eyebrow">Mayo Clinic</div><div class="doc-title">Mayo Clinic Ambulance PCG</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">156p</span></div></div>
      <div class="doc c4 s1"><div class="doc-eyebrow">Aurora South WI</div><div class="doc-title">Aurora EMS Pre-Hospital</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">223p</span></div></div>
      <div class="doc c5 s4"><div class="doc-eyebrow">DC FEMS</div><div class="doc-title">DC Fire EMS Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">278p</span></div></div>
      <div class="doc s2"><div class="doc-eyebrow">Thurston Co WA</div><div class="doc-title">Thurston County Field</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">192p</span></div></div>
      <div class="doc c2 s3"><div class="doc-eyebrow">Clark County</div><div class="doc-title">Clark Co Office of EMS</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">289p</span></div></div>
      <div class="doc s1"><div class="doc-eyebrow">Los Angeles Co</div><div class="doc-title">LA County Treatment Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">412p</span></div></div>
      <div class="doc c2 s4"><div class="doc-eyebrow">New York State</div><div class="doc-title">REMAC Unified Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>v26.1</span><span class="pg">356p</span></div></div>
      <div class="doc c3 s2"><div class="doc-eyebrow">Massachusetts</div><div class="doc-title">MA OEMS Statewide</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">284p</span></div></div>
      <div class="doc s3"><div class="doc-eyebrow">New Jersey</div><div class="doc-title">NJ EMS Clinical Practice</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">241p</span></div></div>
      <div class="doc c4 s5"><div class="doc-eyebrow">Washington</div><div class="doc-title">EMT WA Protocol Set</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">198p</span></div></div>
      <div class="doc c5 s6"><div class="doc-eyebrow">Maryland</div><div class="doc-title">MD Medical Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">327p</span></div></div>
      <div class="doc s7"><div class="doc-eyebrow">Utah</div><div class="doc-title">Utah EMS Guidelines</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">219p</span></div></div>
      <div class="doc c2 s8"><div class="doc-eyebrow">Pennsylvania</div><div class="doc-title">PA BLS Protocols v23.1</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">176p</span></div></div>
      <div class="doc c3 s1"><div class="doc-eyebrow">San Diego Co</div><div class="doc-title">SD Protocol Packet</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>25-26</span><span class="pg">381p</span></div></div>
      <div class="doc s4"><div class="doc-eyebrow">West Virginia</div><div class="doc-title">WV State Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">304p</span></div></div>
      <div class="doc c4 s2"><div class="doc-eyebrow">Alabama</div><div class="doc-title">AL Master Protocols 11e</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">422p</span></div></div>
      <div class="doc c5 s3"><div class="doc-eyebrow">Indiana</div><div class="doc-title">IN EMS Scope of Practice</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">167p</span></div></div>
      <div class="doc s5"><div class="doc-eyebrow">Santa Cruz Co</div><div class="doc-title">Santa Cruz EMS Policies</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">289p</span></div></div>
      <div class="doc c2 s6"><div class="doc-eyebrow">Greater Miami</div><div class="doc-title">Miami-Dade Fire Rescue</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">344p</span></div></div>
      <div class="doc c3 s7"><div class="doc-eyebrow">Snohomish Co</div><div class="doc-title">Snohomish Co Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">213p</span></div></div>
      <div class="doc s8"><div class="doc-eyebrow">Mayo Clinic</div><div class="doc-title">Mayo Clinic Ambulance PCG</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">156p</span></div></div>
      <div class="doc c4 s1"><div class="doc-eyebrow">Aurora South WI</div><div class="doc-title">Aurora EMS Pre-Hospital</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">223p</span></div></div>
      <div class="doc c5 s4"><div class="doc-eyebrow">DC FEMS</div><div class="doc-title">DC Fire EMS Protocols</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2026</span><span class="pg">278p</span></div></div>
      <div class="doc s2"><div class="doc-eyebrow">Thurston Co WA</div><div class="doc-title">Thurston County Field</div><div class="doc-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">192p</span></div></div>
      <div class="doc c2 s3"><div class="doc-eyebrow">Clark County</div><div class="doc-title">Clark Co Office of EMS</div><div class="doc-lines"><i></i><i></i><i></i><i></i></div><div class="doc-pages"><span>2025</span><span class="pg">289p</span></div></div>
      </div>
    </section>

    <section class="reach-wrap">
      <div class="reach-inner">
        <div class="section-eyebrow" style="text-align:center">Real EMTs and paramedics, from across the country</div>
${MAP}
      </div>
    </section>

    <section class="section">
      <div class="section-eyebrow">How it works</div>
      <div class="steps">
${STEPS.map(([n, h, p]) => `        <div class="step">
          <div class="step-num">${n}</div>
          <h3>${h}</h3>
          <p>${p}</p>
        </div>`).join('\n')}
      </div>
    </section>

    <section class="section">
      <div class="section-eyebrow">Reviews</div>
      <div class="reviews">
        <div class="review-card">
          <div class="review-head">
            <span class="store-name">${APPLE.replace('width="20" height="20"','width="17" height="17"')}App Store</span>
            <span class="rating">
              <span class="stars">${STAR.repeat(5)}</span>
              <span class="rating-n">${stats.appStoreRating}</span>
              <span class="rating-count">&middot; ${stats.appStoreRatingCount} ratings</span>
            </span>
          </div>
${REVIEWS.map(([t, b]) => `          <div class="review">
            <h3>${t}</h3>
            <p>${b}</p>
          </div>`).join('\n')}
        </div>
        <div class="review-card pending">
          <div class="review-head"><span class="store-name">${PLAY.replace('width="20" height="20"','width="17" height="17"')}Google Play</span></div>
          <div class="pending-body">
            <h3>Reviews coming soon</h3>
            <p>The Android app is newly released. Ratings will show here once Play has collected enough of them.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="stats">
        <div><span class="stat-n">${stats.appStoreDownloads.toLocaleString('en-US')}</span><span class="stat-l">providers</span></div>
        <div><span class="stat-n">${reach.statesRepresented}</span><span class="stat-l">states</span></div>
        <div><span class="stat-n">${reach.pagesProcessed.toLocaleString('en-US')}</span><span class="stat-l">pages read</span></div>
        <div><span class="stat-n">${stats.appStoreRating}</span><span class="stat-l">App Store rating</span></div>
      </div>
    </section>

    <section class="section">
      <div class="section-eyebrow">FAQ</div>
      <div class="faq">
${FAQ.map(([q, a]) => `        <details>
          <summary>${q}</summary>
          <p>${a}</p>
        </details>`).join('\n')}
      </div>
    </section>
  </main>

${FOOTER_HTML}
  <script src="/assets/app-toggle.js" defer></script>
</body>
</html>
`;

mkdirSync('app', { recursive: true });
writeFileSync('app/index.html', html);
console.log('wrote app/index.html', html.length, 'bytes');
