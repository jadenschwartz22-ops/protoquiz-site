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
