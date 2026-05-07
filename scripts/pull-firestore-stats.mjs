/**
 * Pull Firestore Stats — accurate, no floors, no fake offsets.
 *
 * Sources (in priority order):
 *   1. users/{uid} per-user counters maintained by iOS UserDocumentService
 *      (totalProtocolsUploaded, totalQuizzesCompleted, totalScenariosGenerated, ...).
 *      These are authoritative — they survive event-tracker bugs.
 *   2. Top-level collection counts (protocol_uploads, scenario_generations, ...) as
 *      cross-checks.
 *   3. Flat `events` collection (each doc is `${YYYY-MM}_evt_${id}`) for category
 *      breakdowns and active-user windows.
 *
 * Active users come from users.lastActiveAt (note: NOT lastActive — old script bug).
 */

import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';

const KEY_PATH = process.env.SERVICE_ACCOUNT_JSON
  || '/Users/jadenschwartz/.secrets/protoquiz/ems-protoquiz-tracking-firebase-adminsdk-fbsvc-658d1741a4.json';

if (!admin.apps.length) {
  const sa = JSON.parse(await fs.readFile(KEY_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'ems-protoquiz-tracking' });
}
const db = admin.firestore();
const DEV_USER_ID = 'UQLMSLQZ';
const isDev = (u) => typeof u === 'string' && u.startsWith(DEV_USER_ID);

async function getUserDocAggregates() {
  const snap = await db.collection('users').get();
  const totals = {
    protocolsUploaded: 0,
    quizzesCompleted: 0,
    scenariosGenerated: 0,
    cardsReviewed: 0,
    learnSessions: 0,
    sessions: 0,
    usersWithDoc: 0,
    premiumUsers: 0
  };
  snap.docs.forEach(d => {
    if (isDev(d.id)) return;
    const x = d.data();
    totals.usersWithDoc++;
    totals.protocolsUploaded += x.totalProtocolsUploaded || 0;
    totals.quizzesCompleted += x.totalQuizzesCompleted || 0;
    totals.scenariosGenerated += x.totalScenariosGenerated || 0;
    totals.cardsReviewed += x.totalCardsReviewed || 0;
    totals.learnSessions += x.totalLearnModeSessions || 0;
    totals.sessions += x.totalSessions || 0;
    if (x.isPremium) totals.premiumUsers++;
  });
  return totals;
}

async function getActiveUserCounts() {
  const now = Date.now();
  const win = (days) => admin.firestore.Timestamp.fromDate(new Date(now - days * 86400000));
  const [d30, d7, d1] = await Promise.all([
    db.collection('users').where('lastActiveAt', '>=', win(30)).get(),
    db.collection('users').where('lastActiveAt', '>=', win(7)).get(),
    db.collection('users').where('lastActiveAt', '>=', win(1)).get()
  ]);
  return {
    active30d: d30.docs.filter(d => !isDev(d.id)).length,
    active7d: d7.docs.filter(d => !isDev(d.id)).length,
    active1d: d1.docs.filter(d => !isDev(d.id)).length
  };
}

async function getCollectionCounts() {
  const cols = ['protocol_uploads', 'protocol_uploads_success', 'scenario_generations', 'algorithm_quiz_generations'];
  const out = {};
  for (const c of cols) {
    const snap = await db.collection(c).get();
    out[c] = snap.docs.filter(d => !isDev(d.data().userId)).length;
  }
  return out;
}

async function getEventStats() {
  const snap = await db.collection('events').get();
  const cat = {}, catAct = {}, users = new Set();
  let dev = 0;
  for (const d of snap.docs) {
    const x = d.data();
    if (isDev(x.userId)) { dev++; continue; }
    if (x.userId) users.add(x.userId);
    cat[x.category || 'unknown'] = (cat[x.category || 'unknown'] || 0) + 1;
    const k = `${x.category || 'unknown'}/${x.action || 'unknown'}`;
    catAct[k] = (catAct[k] || 0) + 1;
  }
  return { totalEvents: snap.size, devEvents: dev, eventUsers: users, byCategory: cat, byCatAction: catAct };
}

async function getAppStoreRating(appId = '6753611139') {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=us`);
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r) return null;
    return {
      rating: r.averageUserRating != null ? Math.round(r.averageUserRating * 10) / 10 : null,
      count: r.userRatingCount ?? null
    };
  } catch (e) {
    console.warn('App Store rating fetch failed:', e.message);
    return null;
  }
}

async function getUploadSuccessRate30d() {
  const since = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 86400000));
  const snap = await db.collection('protocol_uploads').where('timestamp', '>=', since).get();
  const real = snap.docs.filter(d => !isDev(d.data().userId));
  if (real.length === 0) return null;
  const ok = real.filter(d => d.data().status === 'success').length;
  return Math.round((ok / real.length) * 100);
}

function displayBucket(n) {
  if (n == null) return null;
  if (n === 0) return '0';
  if (n < 100) return `${Math.floor(n / 10) * 10}+`;
  if (n < 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n < 10000) return `${Math.floor(n / 1000)}000+`;
  return `${Math.floor(n / 10000)}0000+`;
}

// Filename -> US state heuristic. First match wins. Returns null if unknown.
const STATE_RULES = [
  [/\bdcems\b|\bdc[\s_-]?fems\b|\bdhs[\s_-]?ems\b|fems[\s_-]protocols/i, 'DC'],
  [/\bla[\s_-]?county\b|los[\s_-]?angeles|\blacoun?ty\b|laems|lacountytreatment/i, 'CA'],
  [/san[\s_-]?diego/i, 'CA'],
  [/santa[\s_-]?cruz/i, 'CA'],
  [/orange[\s_-]?county|\boc[\s_-]?ems\b/i, 'CA'],
  [/sacramento|sac[\s_-]?county/i, 'CA'],
  [/\bsan[\s_-]?francisco\b|\bsf[\s_-]?ems\b|sfems/i, 'CA'],
  [/aurora[\s_-]?south[\s_-]?wi/i, 'WI'],
  [/\bma[\s_-]?ems\b|\bma[\s_-]?oems\b|massachusetts|\bma[\s_-]protocols\b|boston[\s_-]?ems/i, 'MA'],
  [/\bnj[\s_-]?ems\b|new[\s_-]?jersey/i, 'NJ'],
  [/\bnys?\b[\s_-]?coll|new[\s_-]?york|\bremac\b|fdny|nyc[\s_-]?ems|ny[\s_-]?colla?b|ny_collab/i, 'NY'],
  [/\bmd[\s_-]?med|maryland/i, 'MD'],
  [/\bpa[\s_-]?bls\b|\bpa[\s_-]?als\b|pennsylvania|philadelphia|philly/i, 'PA'],
  [/\bwa[\s_-]?protocol|washington|king[\s_-]?county|snohomish|thurston|emt[\s_-]?wa\b/i, 'WA'],
  [/utah|\but[\s_-]?ems\b/i, 'UT'],
  [/west[\s_-]?virginia|\bwv\b/i, 'WV'],
  [/alabama|\bal[\s_-]?protocol/i, 'AL'],
  [/indiana|\bin[\s_-]?ems\b/i, 'IN'],
  [/greater[\s_-]?miami|miami|florida|\bfl[\s_-]?bureau/i, 'FL'],
  [/\bclark[\s_-]?county\b|nevada|las[\s_-]?vegas/i, 'NV'],
  [/maricopa|phoenix|arizona|\baz[\s_-]?protocol/i, 'AZ'],
  [/houston|texas|austin[\s_-]?travis|\btx[\s_-]?ems\b|\beprip\b|erip[\s_-]?tx/i, 'TX'],
  [/portland|multnomah|oregon|\bor[\s_-]?ems\b/i, 'OR'],
  [/nashville|tennessee|\btn[\s_-]?oems\b|middle[\s_-]?tn/i, 'TN'],
  [/minneapolis|minnesota|hennepin|\bmn\b/i, 'MN'],
  [/atlanta|georgia|grady|region[\s_-]?iii|\bga\b/i, 'GA'],
  [/mayo[\s_-]?clinic|mayoclinic/i, 'MN'],
  [/\bdenver\b|colorado|\bco[\s_-]?ems\b|dmemsmd|denver[\s_-]?metro/i, 'CO'],
  [/chicago|\bil[\s_-]?ems\b|illinois|cfd|region[\s_-]?xi|nwc[\s_-]?ems/i, 'IL'],
  [/ohio|\boh[\s_-]?ems\b/i, 'OH'],
  [/connecticut|\bct[\s_-]?ems\b/i, 'CT'],
  [/\brhode[\s_-]?island\b/i, 'RI'],
  [/\bnh[\s_-]?ems\b|new[\s_-]?hampshire/i, 'NH'],
  [/vermont|\bvt[\s_-]?ems\b/i, 'VT'],
  [/maine|\bme[\s_-]?ems\b/i, 'ME'],
  [/delaware|\bde[\s_-]?bls\b/i, 'DE'],
  [/virginia(?!\s*-?\s*ems[\s_-]?bureau)|\bva[\s_-]?oems\b/i, 'VA'],
  [/north[\s_-]?carolina|\bnc[\s_-]?oems\b|craven/i, 'NC'],
  [/south[\s_-]?carolina|\bsc[\s_-]?ems\b/i, 'SC'],
  [/kentucky|\bkbems\b|\bky[\s_-]?ems\b/i, 'KY'],
  [/mississippi|\bms[\s_-]?bureau/i, 'MS'],
  [/louisiana|\bla[\s_-]?ems[\s_-]?bureau/i, 'LA'],
  [/oklahoma|\bok[\s_-]?ems\b/i, 'OK'],
  [/arkansas|\bar[\s_-]?ems\b/i, 'AR'],
  [/\bmissouri\b|\bmo[\s_-]?ems\b/i, 'MO'],
  [/\biowa\b|\bia[\s_-]?ems\b/i, 'IA'],
  [/\bkansas\b|\bks[\s_-]?ems\b/i, 'KS'],
  [/nebraska|\bne[\s_-]?ems\b/i, 'NE'],
  [/\bsouth[\s_-]?dakota\b|\bsd[\s_-]?ems\b/i, 'SD'],
  [/\bnorth[\s_-]?dakota\b|\bnd[\s_-]?ems\b/i, 'ND'],
  [/wisconsin|\bwi[\s_-]?ems\b/i, 'WI'],
  [/michigan|\bmi[\s_-]?mca\b/i, 'MI'],
  [/montana|\bmt[\s_-]?ems\b/i, 'MT'],
  [/idaho|\bid[\s_-]?ems\b/i, 'ID'],
  [/wyoming|\bwy[\s_-]?ems\b/i, 'WY'],
  [/alaska|\bak[\s_-]?ems\b/i, 'AK'],
  [/hawaii|\bhi[\s_-]?ems\b/i, 'HI'],
  [/\bnew[\s_-]?mexico\b|\bnm[\s_-]?ems\b/i, 'NM'],
  [/tcems|tucson/i, 'AZ'],
];

function classifyState(name) {
  for (const [rx, state] of STATE_RULES) if (rx.test(name)) return state;
  return null;
}

async function getReachStats() {
  const snap = await db.collection('protocol_uploads').where('status', '==', 'success').get();
  const nameCounts = new Map();
  const userIds = new Set();
  let total = 0;
  let pages = 0;
  for (const d of snap.docs) {
    const x = d.data();
    if (isDev(x.userId)) continue;
    total++;
    if (x.userId) userIds.add(x.userId);
    if (typeof x.pageCount === 'number') pages += x.pageCount;
    else if (typeof x.pages === 'number') pages += x.pages;
    const n = (x.protocolName || '').trim();
    if (n) nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
  }
  const stateCounts = new Map();
  for (const [name, count] of nameCounts) {
    const st = classifyState(name);
    if (st) stateCounts.set(st, (stateCounts.get(st) || 0) + count);
  }
  return {
    generatedAt: new Date().toISOString(),
    totalUploads: total,
    distinctProtocols: nameCounts.size,
    activeStudiers: userIds.size,
    pagesProcessed: pages,
    statesRepresented: stateCounts.size,
    byState: Object.fromEntries([...stateCounts.entries()].sort((a, b) => b[1] - a[1])),
  };
}

async function main() {
  console.log('Pulling Firestore stats...\n');

  const [userTotals, active, colCounts, events, successRate, appStore] = await Promise.all([
    getUserDocAggregates(),
    getActiveUserCounts(),
    getCollectionCounts(),
    getEventStats(),
    getUploadSuccessRate30d(),
    getAppStoreRating()
  ]);

  // Combined unique users: users with a doc + anyone seen in events
  const allUsers = new Set([...events.eventUsers]);
  // Add user-doc IDs (need to re-query just IDs, cheap):
  const userDocsSnap = await db.collection('users').select().get();
  userDocsSnap.docs.forEach(d => { if (!isDev(d.id)) allUsers.add(d.id); });
  const ups = await db.collection('protocol_uploads').select('userId').get();
  ups.docs.forEach(d => { const u = d.data().userId; if (u && !isDev(u)) allUsers.add(u); });

  const uniqueUsers = allUsers.size;

  // Final canonical numbers — prefer user-doc aggregates, fall back to event counts
  const protocolsUploaded = Math.max(
    userTotals.protocolsUploaded,
    events.byCatAction['protocol/upload_completed'] || 0,
    colCounts.protocol_uploads || 0
  );
  const quizzesCompleted = Math.max(
    userTotals.quizzesCompleted,
    events.byCatAction['quiz/quiz_completed'] || 0
  );
  const scenariosGenerated = Math.max(
    userTotals.scenariosGenerated,
    events.byCatAction['scenario/generation_completed'] || 0,
    colCounts.scenario_generations || 0
  );

  const stats = {
    generatedAt: new Date().toISOString(),
    raw: {
      appStoreRating: appStore?.rating ?? null,
      appStoreRatingCount: appStore?.count ?? null,
      appStoreDownloads: uniqueUsers,
      uniqueUsers,
      activeUsers30d: active.active30d,
      activeUsers7d: active.active7d,
      activeUsers1d: active.active1d,
      protocolsUploaded,
      quizzesCompleted,
      scenariosGenerated,
      cardsReviewed: userTotals.cardsReviewed,
      totalSessions: userTotals.sessions,
      premiumUsers: userTotals.premiumUsers,
      usersWithDoc: userTotals.usersWithDoc,
      totalEventsTracked: events.totalEvents,
      uploadSuccessRate: successRate,
      collectionCounts: colCounts
    },
    display: {
      appStoreRating: appStore?.rating != null ? appStore.rating.toFixed(1) : null,
      appStoreDownloads: displayBucket(uniqueUsers),
      activeUsers30d: displayBucket(active.active30d),
      protocolsUploaded: displayBucket(protocolsUploaded),
      scenariosGenerated: displayBucket(scenariosGenerated),
      quizzesCompleted: displayBucket(quizzesCompleted),
      uploadSuccessRate: successRate
    },
    topCategories: Object.fromEntries(
      Object.entries(events.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10)
    )
  };

  // Write to canonical location served by the site
  const outDir = path.resolve(process.cwd(), 'data');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'firestore-stats.json'), JSON.stringify(stats, null, 2));

  // Reach stats — separate file consumed by homepage hero/reach section
  const reach = await getReachStats();
  await fs.writeFile(path.join(outDir, 'reach-stats.json'), JSON.stringify(reach, null, 2));
  console.log(`\nReach: ${reach.statesRepresented} states · ${reach.distinctProtocols} protocols · ${reach.activeStudiers} studiers · ${reach.pagesProcessed} pages`);

  console.log('Stats:');
  console.log(`  App Store rating:    ${appStore?.rating ?? 'n/a'} (${appStore?.count ?? 0} ratings)`);
  console.log(`  Unique users:        ${uniqueUsers}`);
  console.log(`  Active 30d / 7d / 1d: ${active.active30d} / ${active.active7d} / ${active.active1d}`);
  console.log(`  Protocols uploaded:  ${protocolsUploaded}`);
  console.log(`  Quizzes completed:   ${quizzesCompleted}`);
  console.log(`  Scenarios generated: ${scenariosGenerated}`);
  console.log(`  Sessions:            ${userTotals.sessions}`);
  console.log(`  Total events:        ${events.totalEvents}`);
  console.log(`\nWrote ${path.join(outDir, 'firestore-stats.json')}`);
  return stats;
}

try { await main(); process.exit(0); }
catch (e) { console.error('Fatal:', e); process.exit(1); }

export { main as pullStats };
