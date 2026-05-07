import sharp from 'sharp';
import fs from 'fs/promises';

const W = 1200, H = 630;

// Amber CAD-console aesthetic to match the current site.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="amber-glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#ffb000" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#ffb000" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#ffb000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="3" height="3">
      <rect width="3" height="3" fill="transparent"/>
      <rect width="3" height="1" y="2" fill="#ffb000" fill-opacity="0.025"/>
    </pattern>
  </defs>

  <!-- Base background: near-black with warm tint -->
  <rect width="${W}" height="${H}" fill="#06050a"/>

  <!-- Centered amber radial glow -->
  <rect width="${W}" height="${H}" fill="url(#amber-glow)"/>

  <!-- CRT scanlines overlay -->
  <rect width="${W}" height="${H}" fill="url(#scanlines)"/>

  <!-- Vignette -->
  <rect width="${W}" height="${H}" fill="black" fill-opacity="0.18"/>

  <!-- Corner CAD brackets -->
  <g stroke="#ffb000" stroke-width="2" fill="none" opacity="0.55">
    <path d="M 60 60 L 60 100 M 60 60 L 100 60"/>
    <path d="M ${W-60} 60 L ${W-60} 100 M ${W-60} 60 L ${W-100} 60"/>
    <path d="M 60 ${H-60} L 60 ${H-100} M 60 ${H-60} L 100 ${H-60}"/>
    <path d="M ${W-60} ${H-60} L ${W-60} ${H-100} M ${W-60} ${H-60} L ${W-100} ${H-60}"/>
  </g>

  <g font-family="-apple-system, 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace">
    <!-- Incident header strip -->
    <g transform="translate(110, 130)">
      <circle cx="8" cy="8" r="6" fill="#ff3b30"/>
      <text x="28" y="14" font-size="18" font-weight="700" fill="#ffb000" letter-spacing="3">INCIDENT 26-7777 &#183; ALS PRIORITY 1</text>
    </g>

    <!-- Headline line 1: MASTER YOUR EMS -->
    <text x="110" y="290" font-size="86" font-weight="700" fill="#f4f1ea" letter-spacing="-2">MASTER YOUR EMS</text>

    <!-- Headline line 2: PROTOCOLS. with amber highlight bar -->
    <rect x="100" y="320" width="600" height="92" fill="#ffb000"/>
    <text x="110" y="385" font-size="86" font-weight="700" fill="#06050a" letter-spacing="-2">PROTOCOLS.</text>

    <!-- Sub-line in amber -->
    <text x="110" y="448" font-size="22" font-weight="700" fill="#ffb000" letter-spacing="2">YES, THE ONES YOU ACTUALLY NEED TO KNOW</text>
    <text x="110" y="478" font-size="22" font-weight="700" fill="#ffb000" letter-spacing="2">TO DO YOUR JOB.</text>
  </g>

  <g font-family="-apple-system, 'Inter', system-ui, sans-serif">
    <!-- Footer divider + brand row -->
    <line x1="110" y1="538" x2="${W-110}" y2="538" stroke="#1c1a14" stroke-width="1"/>
    <text x="110" y="578" font-size="22" font-weight="700" fill="#f4f1ea" letter-spacing="2">EMS PROTOQUIZ</text>
    <text x="320" y="578" font-size="22" font-weight="500" fill="#a8a399">protoquiz.com</text>
    <text x="${W - 110}" y="578" text-anchor="end" font-size="22" font-weight="600" fill="#ffb000">&#9733; 4.7 ON THE APP STORE</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile('og-image.png');
const stat = await fs.stat('og-image.png');
console.log(`Wrote og-image.png (${(stat.size / 1024).toFixed(1)} KB, ${W}x${H})`);
