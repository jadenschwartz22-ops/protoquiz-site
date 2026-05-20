#!/usr/bin/env node
/**
 * Replace {{PLACEHOLDER}} tokens across all legal docs with values from placeholders.json.
 * Usage: cd "PQ site" && node legal/fill-placeholders.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VALUES = JSON.parse(fs.readFileSync(path.join(__dirname, 'placeholders.json'), 'utf8'));

const TARGETS = [
  'b2b/terms/index.html',
  'b2b/privacy/index.html',
  'legal/msa.html',
  'legal/dpa.html',
  'legal/ach-authorization.html',
  'legal/w9-info.html',
];

const missing = Object.entries(VALUES).filter(([k, v]) => !k.startsWith('_') && (typeof v !== 'string' || v.startsWith('TODO')));
if (missing.length) {
  console.error('Refusing to run. Fill in placeholders.json first:');
  missing.forEach(([k]) => console.error(`  - ${k}`));
  process.exit(1);
}

let totalReplacements = 0;
for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn(`skip (missing): ${rel}`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  let changed = 0;
  for (const [key, value] of Object.entries(VALUES)) {
    if (key.startsWith('_')) continue;
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const matches = content.match(re);
    if (matches) {
      content = content.replace(re, value);
      changed += matches.length;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  [ok] ${rel}: ${changed} replacements`);
    totalReplacements += changed;
  } else {
    console.log(`  [--] ${rel}: no placeholders found`);
  }
}
console.log(`\nDone. Total: ${totalReplacements} replacements across ${TARGETS.length} files.`);
console.log('Review the diffs, then commit.');
