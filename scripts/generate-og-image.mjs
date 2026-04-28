import sharp from 'sharp';
import fs from 'fs/promises';

const W = 1200, H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#05080c"/>
      <stop offset="60%" stop-color="#0a0f1a"/>
      <stop offset="100%" stop-color="#101626"/>
    </linearGradient>
    <radialGradient id="glowCyan" cx="20%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#06d6e0" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#06d6e0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowViolet" cx="85%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#b45cf6" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#b45cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06d6e0"/>
      <stop offset="100%" stop-color="#b45cf6"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowCyan)"/>
  <rect width="${W}" height="${H}" fill="url(#glowViolet)"/>

  <g font-family="-apple-system, 'Inter', system-ui, sans-serif">
    <!-- Pill -->
    <g transform="translate(80, 110)">
      <rect x="0" y="0" width="170" height="36" rx="18" fill="rgba(6,214,224,0.10)" stroke="rgba(6,214,224,0.35)" stroke-width="1"/>
      <text x="85" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#06d6e0" letter-spacing="2">FOR EMS</text>
    </g>

    <!-- Headline -->
    <text x="80" y="260" font-size="92" font-weight="800" fill="#ffffff" letter-spacing="-2">Quiz your local</text>
    <text x="80" y="360" font-size="92" font-weight="800" fill="url(#brand)" letter-spacing="-2">protocols.</text>

    <!-- Subheadline -->
    <text x="80" y="430" font-size="28" font-weight="500" fill="#9aa4b2">Pharmacology, algorithms, and scenarios</text>
    <text x="80" y="468" font-size="28" font-weight="500" fill="#9aa4b2">straight from your agency's PDF.</text>

    <!-- Footer band -->
    <text x="80" y="560" font-size="22" font-weight="700" fill="#e6edf7">EMS ProtoQuiz</text>
    <text x="270" y="560" font-size="22" font-weight="500" fill="#9aa4b2">protoquiz.com</text>
    <text x="${W - 80}" y="560" text-anchor="end" font-size="22" font-weight="600" fill="#06d6e0">4.7 stars on the App Store</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ quality: 90 })
  .toFile('og-image.png');

const stat = await fs.stat('og-image.png');
console.log(`Wrote og-image.png (${(stat.size / 1024).toFixed(1)} KB, ${W}x${H})`);
