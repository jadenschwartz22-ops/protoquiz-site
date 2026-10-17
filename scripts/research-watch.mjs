#!/usr/bin/env node
// Monthly research watch: new PubMed papers on EMS protocol variation / formularies / 911 system structure,
// triaged against what the census (/census) and the 911 county map (/research/atlas) can answer.
// Usage: node scripts/research-watch.mjs [--since YYYY-MM-DD]   -> scratch/research-watch/YYYY-MM.md + state.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'research-watch');
const STATE = join(DIR, 'state.json');
const EU = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const ID = 'tool=protoquiz&email=jaden@protoquiz.com';
const EMS = '("emergency medical services"[MeSH] OR "emergency medical services"[tiab] OR prehospital[tiab] OR "pre-hospital"[tiab] OR paramedic*[tiab] OR "EMS"[ti])';

export const QUERIES = [
  `${EMS} AND (protocol*[ti] OR guideline*[ti]) AND (variation[tiab] OR variability[tiab] OR statewide[tiab] OR "state-level"[tiab] OR "across states"[tiab] OR "among states"[tiab] OR "all 50 states"[tiab] OR "state protocols"[tiab] OR compar*[ti] OR characteriz*[ti] OR analysis[ti] OR review[ti])`,
  `${EMS} AND (formulary[tiab] OR "scope of practice"[tiab] OR "medication availability"[tiab] OR "medication list"[tiab] OR "drug availability"[tiab]) AND (state*[tiab] OR agenc*[tiab] OR protocol*[tiab])`,
  `${EMS} AND protocol*[tiab] AND ("do not resuscitate"[tiab] OR "DNR"[tiab] OR refusal[tiab] OR "against medical advice"[tiab] OR hospice[tiab] OR palliative[tiab] OR "termination of resuscitation"[tiab] OR stroke[ti] OR "triage"[ti]) AND (variation[tiab] OR variability[tiab] OR statewide[tiab] OR states[tiab] OR agencies[tiab] OR "protocol review"[tiab])`,
  `"emergency medical services"[tiab] AND (county[tiab] OR counties[tiab] OR "service model"[tiab] OR "agency type"[tiab] OR "who provides"[tiab] OR "essential service"[tiab] OR "governance"[tiab] OR "911 dispatch"[tiab] OR "service area"[tiab]) AND (organization[tiab] OR structure[tiab] OR "state EMS"[tiab] OR "across the United States"[tiab] OR nationwide[tiab] OR "state laws"[tiab] OR "state regulation"[tiab])`,
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(path, params) {
  const wait = 400 - (Date.now() - last); // <= 3 req/s without a key
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const r = await fetch(`${EU}/${path}?${ID}&${params}`);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r;
}
const ymd = (d) => d.toISOString().slice(0, 10);
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

function triage(t, a) {
  const s = `${t} ${a}`.toLowerCase();
  const tl = t.toLowerCase();
  const ems = /\bems\b|emergency medical services|prehospital|pre-hospital|paramedic|ambulance/.test(s);
  if (!ems || /(review|meta-analysis|study|trial)\W+protocol|protocol for (a|an|the)\b|:\s*protocol\b|protocol\.?$/.test(tl)) return ['NO', 'Not EMS-specific, or a study protocol rather than a protocol comparison.'];
  if (!/protocol|guideline|formulary|medication|county|counties|agenc|service model|911|state/.test(tl)) return ['NO', 'Outcome/clinical study; not a protocol or system-structure comparison.'];
  if (/position statement|consensus|delphi|nurses'|experiences and perspectives|training program/.test(tl)) return ['MAYBE', 'Guidance or opinion piece; our census can show what protocols actually print on the topic.'];
  const prot = /protocol|guideline|formulary|medication|drug|dos(e|ing)|scope of practice/.test(s);
  const multi = /statewide|state-level|states\b|state ems|agencies|county|counties|nationwide|50 states|across|variation|variability|compar/.test(s);
  const outcome = /randomi[sz]ed|cohort|retrospective|survival|mortality|cost-effective|machine learning|simulation|survey of (paramedics|emts)|trial/.test(s);
  const sys = /\b(count(y|ies)|service model|agency type|essential service|911|governance|ems system|provider of record|state ems office)/.test(s);
  if (prot && multi && /(protocol|guideline|formulary)s?\b.{0,80}(review|analysis|compar|variation|variab|characteri|content)|(review|analysis|compar|variation|variab|characteri).{0,80}(protocol|guideline|formulary)/.test(s) && !outcome)
    return ['YES', 'Census: full protocol text per document (820 docs, 204 agencies) lets us code the same item (indication, dose, route, criteria) across agencies and states.'];
  if (/formulary|medication (list|availab)|drug (list|availab)/.test(s) && multi)
    return ['YES', 'Census: doses/routes/indications per agency give formulary and medication availability directly.'];
  if (sys && /(provider|service|agency|organization|model|structure|coverage|governance|regulation)/.test(s) && !outcome)
    return ['YES', 'Atlas: provider-of-record by county answers who provides 911 EMS and the service model.'];
  if (prot && multi && !outcome)
    return ['MAYBE', 'Protocol topic, but the specific item may need extraction we have not coded; check census text for it.'];
  if (sys) return ['MAYBE', 'System-structure topic; atlas covers provider of record only, not the measure studied.'];
  return ['NO', 'Outcome/clinical study; not a protocol or system-structure comparison.'];
}

function oneLine(abs) {
  const m = abs.match(/(?:objective|aim|purpose|goal)s?:?\s*(.+?\.)(?:\s|$)/i);
  const s = (m ? m[1] : abs.split(/(?<=\.)\s/)[0] || '').trim();
  return s.length > 240 ? s.slice(0, 237) + '...' : s;
}

async function main() {
  mkdirSync(DIR, { recursive: true });
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { lastRun: null, seen: {} };
  const now = new Date();
  const back = new Date(now); back.setMonth(back.getMonth() - 24);
  const since = arg('--since') || state.lastRun || ymd(back);
  const until = ymd(now);

  const ids = new Set();
  for (const q of QUERIES) {
    const j = await (await get('esearch.fcgi', `db=pubmed&retmode=json&retmax=200&datetype=pdat&mindate=${since.replaceAll('-', '/')}&maxdate=${until.replaceAll('-', '/')}&term=${encodeURIComponent(q)}`)).json();
    for (const id of j.esearchresult.idlist) ids.add(id);
  }
  const fresh = [...ids].filter((id) => !state.seen[id]);
  const rows = [];
  for (let i = 0; i < fresh.length; i += 50) {
    const chunk = fresh.slice(i, i + 50).join(',');
    const sum = (await (await get('esummary.fcgi', `db=pubmed&retmode=json&id=${chunk}`)).json()).result;
    const xml = await (await get('efetch.fcgi', `db=pubmed&retmode=xml&id=${chunk}`)).text();
    const abs = {};
    for (const art of xml.split('<PubmedArticle>').slice(1)) {
      const pmid = art.match(/<PMID[^>]*>(\d+)/)[1];
      abs[pmid] = [...art.matchAll(/<AbstractText[^>]*?(?:Label="([^"]*)")?[^>]*>([\s\S]*?)<\/AbstractText>/g)]
        .map((m) => (m[1] ? `${m[1]}: ` : '') + m[2].replace(/<[^>]+>/g, '')).join(' ');
    }
    for (const id of fresh.slice(i, i + 50)) {
      const s = sum[id]; if (!s) continue;
      const a = abs[id] || '';
      const [tag, how] = triage(s.title, a);
      const doi = (s.articleids || []).find((x) => x.idtype === 'doi')?.value || '';
      rows.push({ id, tag, how, title: s.title.replace(/\.$/, ''), journal: s.source, date: s.pubdate, first: s.authors?.[0]?.name || 'n/a', doi, q: oneLine(a) || '(no abstract)' });
      state.seen[id] = { tag, title: s.title, firstSeen: until };
    }
  }
  const order = { YES: 0, MAYBE: 1, NO: 2 };
  rows.sort((x, y) => order[x.tag] - order[y.tag]);
  const cnt = (t) => rows.filter((r) => r.tag === t).length;
  let md = `# Research watch ${until.slice(0, 7)}\n\nSince ${since}. New papers: ${rows.length} (YES ${cnt('YES')}, MAYBE ${cnt('MAYBE')}, NO ${cnt('NO')}).\nTriage is rule-based on title+abstract; confirm before outreach.\n`;
  for (const r of rows.filter((x) => x.tag !== 'NO'))
    md += `\n## ${r.tag}: ${r.title}\n- ${r.journal}, ${r.date}; first author ${r.first}\n- https://pubmed.ncbi.nlm.nih.gov/${r.id}/ (PMID ${r.id})${r.doi ? `; DOI https://doi.org/${r.doi}` : ''}\n- Question: ${r.q}\n- Our data: ${r.how}\n`;
  md += `\n## NO (title only)\n${rows.filter((r) => r.tag === 'NO').map((r) => `- ${r.title} (PMID ${r.id})`).join('\n')}\n`;
  const out = join(DIR, `${until.slice(0, 7)}.md`);
  writeFileSync(out, md);
  state.lastRun = until;
  writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.log(`${out}\nnew=${rows.length} YES=${cnt('YES')} MAYBE=${cnt('MAYBE')} NO=${cnt('NO')}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
