import { writeFileSync } from 'node:fs';
import { NAV_HTML, FOOTER_HTML, CHROME_HEAD } from './shared-chrome.mjs';

const check = c => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><path d="M4 12.5l5 5L20 6.5"/></svg>`;

const LANES = [
  { cls: 'lane', num: '01', title: 'For providers',
    icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18.5h2"/>',
    stroke: 'var(--accent)',
    body: "Upload your agency's protocol PDF and study what you'll actually be held to on shift, not a national average.",
    points: ['Page-cited answers', 'Scoped to your cert level', 'Free to start'],
    note: 'iOS &amp; Android', cta: 'Get the app', href: '/app/', ghost: false },
  { cls: 'lane', num: '02', title: 'For agencies',
    icon: '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9.5 21v-6h5v6"/>',
    stroke: 'var(--accent)',
    body: 'Load your protocols once. Every crew member trains on the current version, and you see who’s behind before QA does.',
    points: ['Medical-director sign-off', 'Compliance dashboard', 'Your own subdomain'],
    note: '$100 / provider / yr', cta: 'See how it works', href: '/agency/', ghost: false },
  { cls: 'lane lane-census', num: '03', title: 'EMS Census',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
    stroke: 'var(--census-red)',
    body: 'A public, versioned record of what American EMS agencies carry, rebuilt nightly from the documents they publish themselves.',
    points: ['Compare agencies side by side', 'Sourced to the original PDF', 'Open for research and press'],
    note: 'Free &amp; open', cta: 'Explore the data', href: '/census/', ghost: true },
];

const lane = l => `      <div class="${l.cls}">
        <div class="lane-icon">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${l.stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${l.icon}</svg>
        </div>
        <div class="lane-num">${l.num}</div>
        <h2>${l.title}</h2>
        <p>${l.body}</p>
        <ul>
${l.points.map(p => `          <li>${check(l.stroke)}<span>${p}</span></li>`).join('\n')}
        </ul>
        <div class="lane-spacer"></div>
        <div class="lane-note">${l.note}</div>
        <a href="${l.href}" class="lane-cta${l.ghost ? ' ghost' : ''}">${l.cta}</a>
      </div>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProtoQuiz - Protocol training for EMS</title>
  <meta name="description" content="Protocol training for EMS. An app for individual providers, a platform for agencies, and a public record of what American EMS agencies carry.">
  <link rel="canonical" href="https://protoquiz.com/">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <link rel="alternate" hreflang="en" href="https://protoquiz.com/">
  <link rel="alternate" hreflang="x-default" href="https://protoquiz.com/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="ProtoQuiz - Protocol training for EMS">
  <meta property="og:description" content="An app for individual providers, a platform for agencies, and a public record of what American EMS agencies carry.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://protoquiz.com/">
  <meta property="og:image" content="https://protoquiz.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="ProtoQuiz - protocol training for EMS.">
  <meta property="og:site_name" content="ProtoQuiz">
  <meta property="og:locale" content="en_US">
  <meta name="theme-color" content="#f6f7f9">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="ProtoQuiz - Protocol training for EMS">
  <meta name="twitter:description" content="An app for individual providers, a platform for agencies, and a public record of what American EMS agencies carry.">
  <meta name="twitter:image" content="https://protoquiz.com/og-image.png">
  <meta name="twitter:image:alt" content="ProtoQuiz - protocol training for EMS.">
  <link rel="icon" href="/favicon.ico?v=4" sizes="any">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=4">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=4">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png?v=4">
  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=4">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
${CHROME_HEAD}
  <link rel="stylesheet" href="/assets/home.css">
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
${NAV_HTML}

  <main id="main">
    <section class="hero">
      <div class="hero-eyebrow">Protocol training for EMS</div>
      <h1>Welcome to ProtoQuiz.</h1>
      <p>An app for individual providers, a platform for agencies, and a public record of what American EMS agencies carry.</p>
    </section>

    <section class="lanes">
${LANES.map(lane).join('\n\n')}
    </section>
  </main>

${FOOTER_HTML}
</body>
</html>
`;

writeFileSync('index.html', html);
console.log('wrote index.html', html.length, 'bytes');
