#!/usr/bin/env node
/**
 * Generate hero images for ProtoQuiz blog posts via gemini-2.5-flash-image.
 *
 * Mirrors SleepMedic blog's backfill-images.mjs approach but tuned for EMS content.
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/gen-blog-images.mjs           # only missing
 *   GEMINI_API_KEY=xxx node scripts/gen-blog-images.mjs --force   # regenerate all
 *
 * Output: blog/images/posts/{slug}.png
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
const FORCE = process.argv.includes('--force');

if (!API_KEY) { console.error('Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY)'); process.exit(1); }

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const OUT_DIR = 'blog/images/posts';

const BASE_RULES = `Professional editorial blog cover photograph, landscape 16:9, photorealistic.
Hard constraints (MUST all be true):
- No text, no typography, no watermarks, no logos, no UI overlays.
- No visible human faces; hands, silhouettes, or backs of heads are OK.
- No extra fingers, no melted or impossible geometry, no AI artifacts.
- Calm, professional editorial aesthetic. Shallow depth of field OK.
- Color palette skews dark and modern (deep navy, slate, indigo accents OK).
- EMS / paramedic / fire-medic / training-room context where relevant.`;

const SLUGS = {
  'introducing-protoquiz':
    'A clean modern phone screen lying on a fire-station kitchen table, displaying a study app interface (no readable text), beside a coffee cup and a stethoscope, soft morning window light, editorial product photography mood.',

  'first-month':
    'A modern ambulance bay at dusk with the bay door half-open, low purple-orange light, a paramedic uniform jacket draped on a chair in the foreground, contemplative atmosphere, photorealistic editorial.',

  'protoquiz-2-upgrades':
    'An abstract glass desk surface with subtle data graph reflections in indigo and emerald glow, dark professional UI aesthetic implied through reflection, no actual readable text, sleek studio product photography.',

  'ems-training-compliance':
    'A clipboard stacked on a stethoscope on a fire-rescue administrative desk, training records folder in the background slightly out of focus, soft warm desk lamp light, professional documentary photography, no readable text.',

  'ems-pharmacology':
    'An open paramedic medication kit on a stretcher, neatly arranged vials and labeled compartments (labels blurred), syringe in the foreground, clinical lighting, shallow depth of field, professional medical documentary photography, no readable text.',

  'spaced-repetition':
    'A wooden hourglass beside a stack of medical reference books and a smartphone face-up on the books showing an abstract flashcard interface (no readable text), warm desk lamp light, focused study aesthetic, editorial photography.',

  'how-to-study-protocols':
    'A protocol binder open on a fire-station kitchen table, hands of a paramedic in uniform turning a page (face not visible), natural daylight from a window, candid editorial documentary photography, no readable text on pages.',

  'why-protoquiz-free':
    'Two open hands offering an open book against a soft blue and emerald gradient background, abstract symbolic photography, clean welcoming editorial aesthetic, no text.'
};

async function generate(slug, scene) {
  const prompt = `${scene}\n\n${BASE_RULES}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'] }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData?.data);
  if (!imgPart) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 300)}`);
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let ok = 0, skipped = 0, failed = 0;
  for (const [slug, scene] of Object.entries(SLUGS)) {
    const out = path.join(OUT_DIR, `${slug}.png`);
    if (!FORCE && existsSync(out)) {
      console.log(`SKIP (exists): ${slug}`);
      skipped++;
      continue;
    }
    try {
      console.log(`Generating: ${slug}...`);
      const buf = await generate(slug, scene);
      await fs.writeFile(out, buf);
      const kb = (buf.length / 1024).toFixed(1);
      console.log(`OK ${slug} (${kb} KB)`);
      ok++;
    } catch (err) {
      console.error(`FAIL ${slug}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\nDone. ${ok} generated, ${skipped} skipped, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
