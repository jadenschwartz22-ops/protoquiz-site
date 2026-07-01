#!/usr/bin/env node
// Ping IndexNow (Bing/Yandex/etc — feeds ChatGPT Search + Copilot via Bing's index).
// Run after each production deploy: node scripts/indexnow-ping.mjs [url ...]
// With no args, submits the core pages + sitemap-listed blog posts.
const KEY = '8b35c18e9a5be2a5d49fd2996c45ff6b';
const HOST = 'protoquiz.com';

const args = process.argv.slice(2);
let urls = args;
if (!urls.length) {
  const xml = await fetch(`https://${HOST}/sitemap.xml`).then(r => r.text());
  urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls })
});
console.log(`IndexNow: ${res.status} ${res.statusText} — ${urls.length} URLs submitted`);
if (!res.ok) process.exit(1);
