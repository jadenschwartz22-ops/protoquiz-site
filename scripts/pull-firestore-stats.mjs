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
import fsSync from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const KEY_PATH = process.env.SERVICE_ACCOUNT_JSON
  || '/Users/jadenschwartz/.secrets/protoquiz/ems-protoquiz-tracking-firebase-adminsdk-fbsvc-658d1741a4.json';

if (!admin.apps.length) {
  const sa = JSON.parse(await fs.readFile(KEY_PATH, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'ems-protoquiz-tracking' });
}
const db = admin.firestore();
// Dev/test account — its uploads must never count toward public stats.
// Was 'UQLMSLQZ' (wrong: not even a prefix of the real UID, and case-mismatched),
// so ~17 dev uploads silently inflated totalUploads + activeStudiers. The real
// anonymous-auth UID is in PQ-B2C/CLAUDE.md. Matched case-insensitively as a guard.
const DEV_USER_ID = 'UqLmSIqzm9bNDnuS6ily2pUX5n22';
const isDev = (u) => typeof u === 'string'
  && u.toLowerCase().startsWith(DEV_USER_ID.toLowerCase());

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
      // Truncate, don't round — the App Store listing shows 4.66667 as 4.6
      rating: r.averageUserRating != null ? Math.floor(r.averageUserRating * 10) / 10 : null,
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
  [/tcems|tucson/i, 'AZ'], // catch-all if city rules miss
];

function classifyState(name) {
  for (const [rx, state] of STATE_RULES) if (rx.test(name)) return state;
  return null;
}

// City-level rules. Positions are real lat/lon, projected onto the SVG at
// startup by latLonToSVG (see the calibration note there). Never hand-place
// x/y pixels — that is how Vegas ended up in Arizona.
const CITY_RULES = [
  [/\bla[\s_-]?county\b|los[\s_-]?angeles|\blacoun?ty\b|laems|lacountytreatment/i, { state:'CA', city:'Los Angeles',     lat:34.0522, lon:-118.2437 }],
  [/san[\s_-]?diego/i,                                { state:'CA', city:'San Diego',       lat:32.7157, lon:-117.1611 }],
  [/santa[\s_-]?cruz/i,                               { state:'CA', city:'Santa Cruz',      lat:36.9741, lon:-122.0308 }],
  [/orange[\s_-]?county|\boc[\s_-]?ems\b/i,           { state:'CA', city:'Orange County',   lat:33.7175, lon:-117.8311 }],
  [/sacramento|sac[\s_-]?county/i,                    { state:'CA', city:'Sacramento',      lat:38.5816, lon:-121.4944 }],
  [/\bsan[\s_-]?francisco\b|\bsf[\s_-]?ems\b|sfems/i, { state:'CA', city:'San Francisco',   lat:37.7749, lon:-122.4194 }],
  [/king[\s_-]?county/i,                              { state:'WA', city:'Seattle',         lat:47.6062, lon:-122.3321 }],
  [/snohomish/i,                                      { state:'WA', city:'Snohomish County',lat:47.9790, lon:-122.2021 }],
  [/thurston/i,                                       { state:'WA', city:'Olympia',         lat:47.0379, lon:-122.9007 }],
  [/emt[\s_-]?wa\b|\bwa[\s_-]?protocol|\bwa[\s_-]?bls/i,{ state:'WA', city:'Statewide WA',  lat:47.3826, lon:-120.4472 }],
  [/dmemsmd|denver[\s_-]?metro|\bdenver\b/i,          { state:'CO', city:'Denver',          lat:39.7392, lon:-104.9903 }],
  [/boco|boulder/i,                                   { state:'CO', city:'Boulder',         lat:40.0150, lon:-105.2705 }],
  [/loveland|larimer|tvems/i,                         { state:'CO', city:'Loveland',        lat:40.3978, lon:-105.0748 }],
  [/colorado[\s_-]?springs/i,                         { state:'CO', city:'Colorado Springs',lat:38.8339, lon:-104.8214 }],
  [/west[\s_-]?palm[\s_-]?beach|\bwpb\b/i,            { state:'FL', city:'West Palm Beach', lat:26.7153, lon:-80.0534 }],
  [/palm[\s_-]?beach[\s_-]?gardens/i,                 { state:'FL', city:'Palm Beach Gardens', lat:26.8234, lon:-80.1387 }],
  [/fdny|nyc[\s_-]?ems/i,                             { state:'NY', city:'NYC',             lat:40.7128, lon:-74.0060 }],
  [/\bnys?\b[\s_-]?coll|\bremac\b|ny[\s_-]?colla?b|ny_collab|new[\s_-]?york/i, { state:'NY', city:'New York', lat:40.7128, lon:-74.0060 }],
  [/austin[\s_-]?travis|\beprip\b|erip[\s_-]?tx/i,    { state:'TX', city:'Austin',          lat:30.2672, lon:-97.7431 }],
  [/houston/i,                                        { state:'TX', city:'Houston',         lat:29.7604, lon:-95.3698 }],
  [/dallas/i,                                         { state:'TX', city:'Dallas',          lat:32.7767, lon:-96.7970 }],
  [/portland/i,                                       { state:'OR', city:'Portland',        lat:45.5152, lon:-122.6784 }],
  [/multnomah/i,                                      { state:'OR', city:'Multnomah Co',    lat:45.5152, lon:-122.6784 }],
  [/maricopa|phoenix|tcems/i,                         { state:'AZ', city:'Phoenix',         lat:33.4484, lon:-112.0740 }],
  [/tucson/i,                                         { state:'AZ', city:'Tucson',          lat:32.2226, lon:-110.9747 }],
  [/\bclark[\s_-]?county\b|las[\s_-]?vegas/i,         { state:'NV', city:'Las Vegas',       lat:36.1699, lon:-115.1398 }],
  [/greater[\s_-]?miami|miami/i,                      { state:'FL', city:'Miami',           lat:25.7617, lon:-80.1918 }],
  [/orlando/i,                                        { state:'FL', city:'Orlando',         lat:28.5384, lon:-81.3789 }],
  [/jacksonville/i,                                   { state:'FL', city:'Jacksonville',    lat:30.3322, lon:-81.6557 }],
  [/atlanta|grady/i,                                  { state:'GA', city:'Atlanta',         lat:33.7490, lon:-84.3880 }],
  [/region[\s_-]?iii/i,                               { state:'GA', city:'Region III',      lat:33.7490, lon:-84.3880 }],
  [/region[\s_-]?xi|cfd|nwc[\s_-]?ems|chicago/i,      { state:'IL', city:'Chicago',         lat:41.8781, lon:-87.6298 }],
  [/mayo[\s_-]?clinic|mayoclinic|rochester[\s_-]?mn/i,{ state:'MN', city:'Rochester',       lat:44.0121, lon:-92.4802 }],
  [/minneapolis|hennepin/i,                           { state:'MN', city:'Minneapolis',     lat:44.9778, lon:-93.2650 }],
  [/nashville|middle[\s_-]?tn/i,                      { state:'TN', city:'Nashville',       lat:36.1627, lon:-86.7816 }],
  [/memphis/i,                                        { state:'TN', city:'Memphis',         lat:35.1495, lon:-90.0490 }],
  [/boston[\s_-]?ems/i,                               { state:'MA', city:'Boston',          lat:42.3601, lon:-71.0589 }],
  [/dcems|\bdc[\s_-]?fems\b|\bdhs[\s_-]?ems\b|fems[\s_-]protocols/i, { state:'DC', city:'Washington, D.C.', lat:38.9072, lon:-77.0369 }],
  [/baltimore/i,                                      { state:'MD', city:'Baltimore',       lat:39.2904, lon:-76.6122 }],
  [/aurora[\s_-]?south[\s_-]?wi/i,                    { state:'WI', city:'Aurora',          lat:43.0167, lon:-88.0070 }],
  [/milwaukee/i,                                      { state:'WI', city:'Milwaukee',       lat:43.0389, lon:-87.9065 }],
  [/philadelphia|philly/i,                            { state:'PA', city:'Philadelphia',    lat:39.9526, lon:-75.1652 }],
  [/charleston[\s_-]?wv|\bcharleston\b/i,             { state:'WV', city:'Charleston',      lat:38.3498, lon:-81.6326 }],
  [/charlotte/i,                                      { state:'NC', city:'Charlotte',       lat:35.2271, lon:-80.8431 }],
  [/raleigh/i,                                        { state:'NC', city:'Raleigh',         lat:35.7796, lon:-78.6382 }],
  [/craven/i,                                         { state:'NC', city:'Craven',          lat:35.1085, lon:-77.0441 }],
  [/indianapolis/i,                                   { state:'IN', city:'Indianapolis',    lat:39.7684, lon:-86.1581 }],
  [/newark|\bnj[\s_-]?ems\b|new[\s_-]?jersey/i,       { state:'NJ', city:'Newark',          lat:40.7357, lon:-74.1724 }],
  [/birmingham|alabama|\bal[\s_-]?protocol|master\.alabama/i, { state:'AL', city:'Birmingham', lat:33.5186, lon:-86.8104 }],
  [/salt[\s_-]?lake|utah|\but[\s_-]?ems\b/i,          { state:'UT', city:'Salt Lake City',  lat:40.7608, lon:-111.8910 }],
  [/west[\s_-]?virginia|\bwv\b/i,                     { state:'WV', city:'Charleston',      lat:38.3498, lon:-81.6326 }],
  [/maryland|\bmd[\s_-]?med/i,                        { state:'MD', city:'Baltimore',       lat:39.2904, lon:-76.6122 }],
];

function classifyCity(name) {
  for (const [rx, info] of CITY_RULES) if (rx.test(name)) return info;
  return null;
}

// World map projection (index.html .reach-svg-world, viewBox 0 0 950 620,
// Mercator). Constants fitted 2026-08-05 against the map's OWN landmass
// polygons (contiguous-US bbox = lon [-125,-66.9] lat [49,24.5]); Mexico's
// polygon independently confirms the fit to ~2px. NEVER hand-place world x/y —
// add lat/lon (plus a dx/dy nudge only where the simplified map shifts a
// landmass, e.g. New Zealand).
function latLonToWorldSVG(lat, lon, dx = 0, dy = 0) {
  const merc = Math.log(Math.tan(Math.PI/4 + (lat * Math.PI/180) / 2));
  return {
    x: Math.round(2.6506*lon + 460.33 + dx),
    y: Math.round(339.6 - 184.57*merc + dy),
  };
}

// International city registry: one canonical entry per region, keyed for both
// the AI path (country|state) and the filename-regex fallback.
const INTL_CITIES = {
  'CA|BC': { country:'CA', countryName:'Canada',      city:'Vancouver, BC', lat:49.2827, lon:-123.1207 },
  'CA|AB': { country:'CA', countryName:'Canada',      city:'Calgary, AB',   lat:51.0447, lon:-114.0719 },
  'CA|ON': { country:'CA', countryName:'Canada',      city:'Toronto, ON',   lat:43.6532, lon:-79.3832 },
  'CA|QC': { country:'CA', countryName:'Canada',      city:'Montreal, QC',  lat:45.5019, lon:-73.5674 },
  'GB|*':  { country:'GB', countryName:'UK',          city:'London',        lat:51.5074, lon:-0.1278 },
  'DE|*':  { country:'DE', countryName:'Germany',     city:'Berlin',        lat:52.52,   lon:13.405 },
  'IE|*':  { country:'IE', countryName:'Ireland',     city:'Dublin',        lat:53.3498, lon:-6.2603 },
  'FR|*':  { country:'FR', countryName:'France',      city:'Paris',         lat:48.8566, lon:2.3522 },
  'AU|VIC':{ country:'AU', countryName:'Australia',   city:'Melbourne, VIC',lat:-37.8136,lon:144.9631 },
  'AU|*':  { country:'AU', countryName:'Australia',   city:'Sydney, NSW',   lat:-33.8688,lon:151.2093 },
  // Map's simplified NZ sits south/west of true projection; nudge onto land.
  'NZ|*':  { country:'NZ', countryName:'New Zealand', city:'Auckland',      lat:-36.8485,lon:174.7633, dx:-8, dy:19 },
  'IN|*':  { country:'IN', countryName:'India',       city:'Delhi',         lat:28.6139, lon:77.209 },
  'ZA|*':  { country:'ZA', countryName:'South Africa',city:'Cape Town',     lat:-33.9249,lon:18.4241 },
};
for (const info of Object.values(INTL_CITIES)) {
  Object.assign(info, latLonToWorldSVG(info.lat, info.lon, info.dx || 0, info.dy || 0));
}
// AI-classified docs resolve country+state -> region entry -> country default.
function intlCityFor(country, state) {
  return INTL_CITIES[`${country}|${state}`] || INTL_CITIES[`${country}|*`] || null;
}

// Filename-regex fallback for legacy docs with no AI classification.
const INTL_RULES = [
  [/\bbcehs\b|british[\s_-]?columbia/i, INTL_CITIES['CA|BC']],
  [/\balberta\b/i, INTL_CITIES['CA|AB']],
  [/\bmoh[\s_-]?als|moh[\s_-]?standards|ontario|toronto|land[\s_-]?ambulance/i, INTL_CITIES['CA|ON']],
  [/coll[èe]ge[\s_-]?ellis|chimie[\s_-]?du[\s_-]?vivant|quebec|qu[ée]bec|montreal/i, INTL_CITIES['CA|QC']],
  [/\bnhs\b|united[\s_-]?kingdom|\bjrcalc\b|glyceryl[\s_-]?trinitrate/i, INTL_CITIES['GB|*']],
  [/bradykardie|bradykardia|deutschland|notarzt|\bdivi\b/i, INTL_CITIES['DE|*']],
  [/avcpg|ambulance[\s_-]?victoria/i, INTL_CITIES['AU|VIC']],
  [/clinical-procedures-and-guidelines|st[\s_-]?john[\s_-]?nz/i, INTL_CITIES['NZ|*']],
];

function classifyIntl(name) {
  for (const [rx, info] of INTL_RULES) if (rx.test(name)) return info;
  return null;
}

// Default representative city per US state (lat/lon, projected at startup).
// New states automatically render as a dot when they show up.
// AK/HI keep fixed pixel coords: the map has no AK/HI shapes, so they render
// at hand-picked inset spots the projection can't produce.
const STATE_CITIES = {
  AL: { city: "Birmingham",      lat:33.5186, lon:-86.8104 },
  AK: { city: "Anchorage",       x:110, y:575 },
  AZ: { city: "Phoenix",         lat:33.4484, lon:-112.0740 },
  AR: { city: "Little Rock",     lat:34.7465, lon:-92.2896 },
  CA: { city: "Los Angeles",     lat:34.0522, lon:-118.2437 },
  CO: { city: "Denver",          lat:39.7392, lon:-104.9903 },
  CT: { city: "Hartford",        lat:41.7658, lon:-72.6734 },
  DE: { city: "Wilmington",      lat:39.7391, lon:-75.5398 },
  DC: { city: "Washington, D.C.",lat:38.9072, lon:-77.0369 },
  FL: { city: "Miami",           lat:25.7617, lon:-80.1918 },
  GA: { city: "Atlanta",         lat:33.7490, lon:-84.3880 },
  HI: { city: "Honolulu",        x:280, y:575 },
  ID: { city: "Boise",           lat:43.6150, lon:-116.2023 },
  IL: { city: "Chicago",         lat:41.8781, lon:-87.6298 },
  IN: { city: "Indianapolis",    lat:39.7684, lon:-86.1581 },
  IA: { city: "Des Moines",      lat:41.5868, lon:-93.6250 },
  KS: { city: "Wichita",         lat:37.6872, lon:-97.3301 },
  KY: { city: "Louisville",      lat:38.2527, lon:-85.7585 },
  LA: { city: "New Orleans",     lat:29.9511, lon:-90.0715 },
  ME: { city: "Portland",        lat:43.6591, lon:-70.2568 },
  MD: { city: "Baltimore",       lat:39.2904, lon:-76.6122 },
  MA: { city: "Boston",          lat:42.3601, lon:-71.0589 },
  MI: { city: "Detroit",         lat:42.3314, lon:-83.0458 },
  MN: { city: "Minneapolis",     lat:44.9778, lon:-93.2650 },
  MS: { city: "Jackson",         lat:32.2988, lon:-90.1848 },
  MO: { city: "Kansas City",     lat:39.0997, lon:-94.5786 },
  MT: { city: "Billings",        lat:45.7833, lon:-108.5007 },
  NE: { city: "Omaha",           lat:41.2565, lon:-95.9345 },
  NV: { city: "Las Vegas",       lat:36.1699, lon:-115.1398 },
  NH: { city: "Manchester",      lat:42.9956, lon:-71.4548 },
  NJ: { city: "Newark",          lat:40.7357, lon:-74.1724 },
  NM: { city: "Albuquerque",     lat:35.0844, lon:-106.6504 },
  NY: { city: "New York",        lat:40.7128, lon:-74.0060 },
  NC: { city: "Charlotte",       lat:35.2271, lon:-80.8431 },
  ND: { city: "Bismarck",        lat:46.8083, lon:-100.7837 },
  OH: { city: "Columbus",        lat:39.9612, lon:-82.9988 },
  OK: { city: "Oklahoma City",   lat:35.4676, lon:-97.5164 },
  OR: { city: "Portland",        lat:45.5152, lon:-122.6784 },
  PA: { city: "Philadelphia",    lat:39.9526, lon:-75.1652 },
  RI: { city: "Providence",      lat:41.8240, lon:-71.4128 },
  SC: { city: "Columbia",        lat:34.0007, lon:-81.0348 },
  SD: { city: "Sioux Falls",     lat:43.5460, lon:-96.7313 },
  TN: { city: "Nashville",       lat:36.1627, lon:-86.7816 },
  TX: { city: "Houston",         lat:29.7604, lon:-95.3698 },
  UT: { city: "Salt Lake City",  lat:40.7608, lon:-111.8910 },
  VT: { city: "Burlington",      lat:44.4759, lon:-73.2121 },
  VA: { city: "Richmond",        lat:37.5407, lon:-77.4360 },
  WA: { city: "Seattle",         lat:47.6062, lon:-122.3321 },
  WV: { city: "Charleston",      lat:38.3498, lon:-81.6326 },
  WI: { city: "Milwaukee",       lat:43.0389, lon:-87.9065 },
  WY: { city: "Cheyenne",        lat:41.1400, lon:-104.8202 },
};

// Aliases collapse synonyms into a single canonical city so they don't render
// as two stacked dots. Key: `${state}|${cityLowercase}` -> canonical city.
const CITY_ALIASES = {
  'NY|new york city': 'New York',
  'NY|nyc':           'New York',
  'NY|manhattan':     'New York',
  'NY|brooklyn':      'New York',
  'NY|bronx':         'New York',
  'NY|queens':        'New York',
  'UT|salt lake':     'Salt Lake City',
  'DC|washington':    'Washington, D.C.',
};
function canonicalCity(city, state) {
  if (!city) return city;
  return CITY_ALIASES[`${state}|${city.toLowerCase()}`] || city;
}

// Albers equal-area conic → SVG (viewBox 0 0 959 593).
// Affine params least-squares-fitted 2026-07-26 against the map's OWN state
// polygons: SVG area centroid of all 48 CONUS states + DC vs each state's
// geographic centroid (anchor RMS 0.4px; 74/79 test cities land inside the
// right state, the 5 misses are border cities <=1px outside). Do not re-fit
// against hand-placed city pixels — that is what skewed the previous fit.
const _d2r = Math.PI / 180;
const _n = (Math.sin(29.5*_d2r) + Math.sin(45.5*_d2r)) / 2;
const _C = Math.cos(29.5*_d2r)**2 + 2*_n*Math.sin(29.5*_d2r);
const _rho0 = Math.sqrt(_C - 2*_n*Math.sin(38*_d2r)) / _n;
function latLonToSVG(lat, lon) {
  const phi = lat*_d2r, lam = lon*_d2r;
  const rho = Math.sqrt(_C - 2*_n*Math.sin(phi)) / _n;
  const theta = _n * (lam - (-96*_d2r));
  const ax = rho*Math.sin(theta), ay = _rho0 - rho*Math.cos(theta);
  return {
    x: Math.round(1265.5764*ax + 0.1009*ay + 480.7351),
    y: Math.round(0.3620*ax + -1261.0220*ay + 304.1855),
  };
}

// Project the lat/lon tables into SVG pixels once at startup. Entries that
// already carry x/y (AK/HI insets) are left alone.
for (const info of [...CITY_RULES.map(([, i]) => i), ...Object.values(STATE_CITIES)]) {
  if (info.lat != null) Object.assign(info, latLonToSVG(info.lat, info.lon));
}

// --- State-shape validation (generation-time guard) ---
// Parses the state outline paths from the site's own index.html so every dot
// can be checked against the polygon it claims to be in. Border cities can
// legitimately project a couple px outside their shape, hence the tolerance.
const _SITE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let _statePolys = null;
function statePolys() {
  if (_statePolys) return _statePolys;
  _statePolys = {};
  try {
    const html = fsSync.readFileSync(path.join(_SITE_ROOT, 'index.html'), 'utf8');
    for (const m of html.matchAll(/<path class="state s-([a-z]{2})" d="([^"]+)"/g)) {
      const toks = m[2].match(/[a-zA-Z]|-?\d*\.?\d+/g);
      const polys = []; let poly = [], x = 0, y = 0, sx = 0, sy = 0, cmd = null, i = 0;
      const num = () => parseFloat(toks[i++]);
      while (i < toks.length) {
        if (/[a-zA-Z]/.test(toks[i])) {
          cmd = toks[i++];
          if (cmd.toLowerCase() === 'z') { if (poly.length > 2) polys.push(poly); poly = []; x = sx; y = sy; continue; }
        }
        switch (cmd) {
          case 'm': x += num(); y += num(); poly = [[x, y]]; sx = x; sy = y; cmd = 'l'; break;
          case 'M': x = num(); y = num(); poly = [[x, y]]; sx = x; sy = y; cmd = 'L'; break;
          case 'l': x += num(); y += num(); poly.push([x, y]); break;
          case 'L': x = num(); y = num(); poly.push([x, y]); break;
          case 'h': x += num(); poly.push([x, y]); break;
          case 'H': x = num(); poly.push([x, y]); break;
          case 'v': y += num(); poly.push([x, y]); break;
          case 'V': y = num(); poly.push([x, y]); break;
          default: i++;
        }
      }
      if (poly.length > 2) polys.push(poly);
      _statePolys[m[1].toUpperCase()] = polys;
    }
  } catch (e) { console.warn('[reach] state-shape guard unavailable:', e.message); }
  return _statePolys;
}
function _inPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// true if (x,y) is inside state's shape or within tolPx of its outline.
// Unknown shapes (AK/HI, bad state code) pass — the guard only rejects when
// it positively knows the point is wrong.
function insideState(x, y, state, tolPx = 4) {
  const polys = statePolys()[state];
  if (!polys || !polys.length) return true;
  for (const p of polys) if (_inPoly(x, y, p)) return true;
  let best = Infinity;
  for (const p of polys) for (const [px, py] of p) best = Math.min(best, Math.hypot(px - x, py - y));
  return best <= tolPx;
}

// Geocode cache: scripts/data/geocode-cache.json
const __dir = path.dirname(fileURLToPath(import.meta.url));
const GEO_CACHE_PATH = path.join(__dir, 'data', 'geocode-cache.json');
let _geoCache = {};
try {
  const raw = JSON.parse(fsSync.readFileSync(GEO_CACHE_PATH, 'utf8'));
  // Migrate: recompute x/y from the cached lat/lon so entries projected with
  // an older calibration self-heal; drop entries with no lat/lon, and drop
  // poisoned entries whose point isn't in the state the key claims — both
  // re-geocode through the current guards.
  for (const [k, v] of Object.entries(raw)) {
    if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;
    const sv = { ...v, ...latLonToSVG(v.lat, v.lon) };
    const state = k.split('|')[0];
    if (!insideState(sv.x, sv.y, state)) {
      console.warn(`[reach] dropping poisoned cache entry ${k} (${sv.x},${sv.y})`);
      continue;
    }
    _geoCache[k] = sv;
  }
} catch {}

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',
  IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
  WI:'Wisconsin',WY:'Wyoming',
};

async function geocodeToSVG(city, state) {
  const key = `${state}|${city}`;
  if (_geoCache[key]) return _geoCache[key];
  try {
    // Structured query (city= & state=) — unlike free-text q=, it returns empty
    // instead of fuzzy-matching a same-named city in the wrong state
    // ("Springfield, MT" → Springfield, MO). Empty → state-default fallback.
    const search = (params) =>
      fetch(`https://nominatim.openstreetmap.org/search?${params}&state=${encodeURIComponent(state)}&format=json&limit=1&countrycodes=us`, {
        headers: { 'User-Agent': 'ProtoQuiz-ReachMap/1.0' }
      }).then(r => r.json());
    let data = await search(`city=${encodeURIComponent(city)}`);
    if (!data.length && /county$/i.test(city)) {
      await new Promise(r => setTimeout(r, 1100));
      data = await search(`county=${encodeURIComponent(city)}`);
    }
    if (!data.length) return null;
    // Nominatim silently drops the state constraint when nothing matches in it
    // (e.g. "Las Vegas, WA" → Las Vegas, Puerto Rico). Require the requested
    // state's name in the result before trusting it.
    const stateName = STATE_NAMES[state];
    if (stateName && !data[0].display_name.includes(stateName)) {
      console.warn(`[reach] geocode wrong-state for ${city}, ${state}: "${data[0].display_name}" — using state default`);
      return null;
    }
    const { lat, lon } = data[0];
    const sv = latLonToSVG(parseFloat(lat), parseFloat(lon));
    sv.lat = parseFloat(lat); sv.lon = parseFloat(lon);
    // Reject results that project off the CONUS canvas (e.g. Nominatim matching
    // "Las Vegas, WA" to Las Vegas, Puerto Rico) — clamping parks a dot in the
    // corner. Null falls back to the state's default city.
    if (sv.x < 0 || sv.x > 959 || sv.y < 0 || sv.y > 593) {
      console.warn(`[reach] geocode off-map for ${city}, ${state} (${lat},${lon}) — using state default`);
      return null;
    }
    // Strongest guard: the projected point must land in (or within a few px
    // of) the claimed state's actual SVG shape.
    if (!insideState(sv.x, sv.y, state)) {
      console.warn(`[reach] geocode outside ${state} shape for ${city} (${sv.x},${sv.y}) — using state default`);
      return null;
    }
    _geoCache[key] = sv;
    await new Promise(r => setTimeout(r, 1100)); // Nominatim 1 req/s
    return sv;
  } catch (e) {
    console.warn(`[reach] geocode failed for ${city}, ${state}:`, e.message);
    return null;
  }
}

function flushGeoCache() {
  try {
    const dir = path.dirname(GEO_CACHE_PATH);
    if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
    fsSync.writeFileSync(GEO_CACHE_PATH, JSON.stringify(_geoCache, null, 2));
  } catch (e) { console.warn('[reach] cache write failed:', e.message); }
}

// SVG coords for the US-states viewBox 0 0 959 593.
// Priority: CITY_RULES regex → geocode → state default.
const _pendingGeocodes = [];
function coordsForCity(city, state) {
  const canon = canonicalCity(city, state);
  for (const [, info] of CITY_RULES) {
    if (info.state === state && info.city.toLowerCase() === (canon || '').toLowerCase()) {
      return { x: info.x, y: info.y, canonicalCity: canon };
    }
  }
  const geoKey = `${state}|${canon || city}`;
  if (_geoCache[geoKey]) {
    const c = _geoCache[geoKey];
    return { x: c.x, y: c.y, canonicalCity: canon };
  }
  if (canon && state) _pendingGeocodes.push({ city: canon, state });
  const sc = STATE_CITIES[state];
  if (!sc) return null;
  if (!canon || canon.toLowerCase() === sc.city.toLowerCase()) {
    return { x: sc.x, y: sc.y, fallbackCity: sc.city, canonicalCity: canon };
  }
  return { x: sc.x, y: sc.y, fallbackCity: sc.city, canonicalCity: canon };
}

async function getReachStats() {
  // Source of truth: protocol_uploads_v2 where status='success'.
  // Each doc carries its own location (locationCity/State/Country) once tagged
  // by monitor.js's classifyAndPersistLocation handler. Filename regex remains
  // a fallback for older docs without a PDF reference.
  // Switched 2026-05-09 from legacy protocol_uploads_success (still dual-written
  // for ~30d as backup); pre-cutover docs were backfilled to v2 via
  // scripts/backfill-uploads-v2.mjs. Legacy `protocol_uploads` is dead since Nov 2025.
  const snap = await db.collection('protocol_uploads_v2').where('status', '==', 'success').get();
  let aiHits = 0, regexHits = 0, locUnknown = 0;

  const nameCounts = new Map();
  const userIds = new Set();
  let total = 0;
  let pages = 0;

  const stateCounts = new Map();
  const countryCounts = new Map();
  const cityData = new Map();   // "STATE|CITY|x|y" -> { count, protocols: Map }
  const intlData = new Map();   // "COUNTRY|CITY|x|y" -> { count, protocols, countryName }
  const ensureCity = (k) => { if (!cityData.has(k)) cityData.set(k, { count: 0, protocols: new Map() }); return cityData.get(k); };
  const ensureIntl = (k) => { if (!intlData.has(k)) intlData.set(k, { count: 0, protocols: new Map() }); return intlData.get(k); };

  // Per-doc loop. AI takes priority; regex is fallback per upload (not per filename).
  for (const d of snap.docs) {
    const x = d.data();
    if (isDev(x.userId)) continue;
    total++;
    // Studier count = distinct real people who uploaded a protocol.
    // Legacy backfilled docs (Nov 2025, ~66 of them) all carry the placeholder
    // userId 'anonymous' — their original per-user identity was never recorded.
    // Collapsing them to one studier under-counts ~10-27 real early adopters,
    // so for those rows we key the studier set on the protocol name instead
    // (each distinct legacy protocol ≈ at least one real medic/agency).
    if (x.userId === 'anonymous' || x.userId === 'unknown') {
      const pn = (x.protocolName || '').trim().toLowerCase();
      userIds.add(pn ? `legacy:${pn}` : `legacy:${d.id}`);
    } else if (x.userId) {
      userIds.add(x.userId);
    }
    if (typeof x.pageCount === 'number') pages += x.pageCount;
    else if (typeof x.pages === 'number') pages += x.pages;
    const name = (x.protocolName || '').trim();
    if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);

    // Read AI-classified location directly from this doc
    const ai = (x.locationStatus === 'classified' && (x.locationState || x.locationCountry))
      ? {
          country: x.locationCountry || 'US',
          state: x.locationState || null,
          city: x.locationCity || null,
          agency: x.locationAgency || null,
          confidence: x.locationConfidence || 'low',
        }
      : null;

    let placed = false;
    if (ai) {
      if (ai.country && ai.country !== 'US') {
        const meta = intlCityFor(ai.country, ai.state);
        if (meta) {
          const k = `${ai.country}|${meta.city}|${meta.x}|${meta.y}`;
          const e = ensureIntl(k);
          e.count += 1;
          if (name) e.protocols.set(name, (e.protocols.get(name) || 0) + 1);
          e.countryName = meta.countryName;
          countryCounts.set(ai.country, (countryCounts.get(ai.country) || 0) + 1);
          aiHits++; placed = true;
        }
      } else if (ai.state) {
        const coords = coordsForCity(ai.city, ai.state);
        if (coords) {
          const cityName = coords.canonicalCity || ai.city || coords.fallbackCity || ai.state;
          const k = `${ai.state}|${cityName}|${coords.x}|${coords.y}`;
          const e = ensureCity(k);
          e.count += 1;
          if (name) e.protocols.set(name, (e.protocols.get(name) || 0) + 1);
          stateCounts.set(ai.state, (stateCounts.get(ai.state) || 0) + 1);
          aiHits++; placed = true;
        }
      }
    }

    // Fallback: filename regex (legacy path) per doc
    if (!placed && name) {
      const intl = classifyIntl(name);
      if (intl) {
        const k = `${intl.country}|${intl.city}|${intl.x}|${intl.y}`;
        const e = ensureIntl(k);
        e.count += 1;
        e.protocols.set(name, (e.protocols.get(name) || 0) + 1);
        e.countryName = intl.countryName;
        countryCounts.set(intl.country, (countryCounts.get(intl.country) || 0) + 1);
        regexHits++; placed = true;
      } else {
        const cityInfo = classifyCity(name);
        if (cityInfo) {
          const k = `${cityInfo.state}|${cityInfo.city}|${cityInfo.x}|${cityInfo.y}`;
          const e = ensureCity(k);
          e.count += 1;
          e.protocols.set(name, (e.protocols.get(name) || 0) + 1);
          stateCounts.set(cityInfo.state, (stateCounts.get(cityInfo.state) || 0) + 1);
          regexHits++; placed = true;
        } else {
          const st = classifyState(name);
          if (st) {
            const c = STATE_CITIES[st];
            if (c) {
              const k = `${st}|${c.city}|${c.x}|${c.y}`;
              const e = ensureCity(k);
              e.count += 1;
              e.protocols.set(name, (e.protocols.get(name) || 0) + 1);
            }
            stateCounts.set(st, (stateCounts.get(st) || 0) + 1);
            regexHits++; placed = true;
          }
        }
      }
    }
    if (!placed) locUnknown++;
  }
  console.log(`[reach] uploads=${total} ai=${aiHits} regex=${regexHits} unknown=${locUnknown}`);
  // Tier helper for dot/label sizing.
  const tier = (c) => (c >= 30 ? "hot" : c >= 5 ? "warm" : c >= 2 ? "on" : "tiny");

  // Pretty-print a filename to a human-readable protocol title
  function prettifyName(s) {
    if (!s) return "";
    let t = s.trim();
    // Strip extension
    t = t.replace(/\.(pdf|docx?|vsdx)+$/i, "");
    // Replace separators
    t = t.replace(/[_\-]+/g, " ");
    // Collapse multi-space
    t = t.replace(/\s+/g, " ");
    // Strip noisy date suffixes / version numbers in trailing position
    t = t.replace(/\s+v\d+(\.\d+)*$/i, "");
    t = t.replace(/\s+\d{6,}$/i, "");
    // URL-decode
    try { t = decodeURIComponent(t); } catch (_) {}
    // Collapse again after decode
    t = t.replace(/\s+/g, " ").trim();
    // Truncate
    if (t.length > 64) t = t.slice(0, 61).trimEnd() + "…";
    return t;
  }

  // Resolve pending geocodes for cities the AI classified but we have no coords for.
  if (_pendingGeocodes.length) {
    const unique = [...new Map(_pendingGeocodes.map(g => [`${g.state}|${g.city}`, g])).values()];
    console.log(`[reach] geocoding ${unique.length} unknown cities...`);
    for (const { city, state } of unique) {
      const sv = await geocodeToSVG(city, state);
      if (sv) console.log(`[reach]   ${city}, ${state} → (${sv.x}, ${sv.y})`);
      else console.warn(`[reach]   ${city}, ${state} → FAILED`);
    }
    flushGeoCache();
    // Re-resolve any cityData entries that used state defaults
    for (const [k, data] of [...cityData.entries()]) {
      const [state, city, x, y] = k.split('|');
      const sc = STATE_CITIES[state];
      if (!sc) continue;
      const geoKey = `${state}|${city}`;
      const cached = _geoCache[geoKey];
      if (cached && (Number(x) === sc.x || Math.abs(Number(x)-sc.x) < 25) && Number(x) !== cached.x) {
        cityData.delete(k);
        const newK = `${state}|${city}|${cached.x}|${cached.y}`;
        const existing = cityData.get(newK);
        if (existing) {
          existing.count += data.count;
          for (const [p, c] of data.protocols) existing.protocols.set(p, (existing.protocols.get(p)||0)+c);
        } else {
          cityData.set(newK, data);
        }
      }
    }
  }

  const locales = [...cityData.entries()]
    .map(([k, { count, protocols }]) => {
      const [state, city, x, y] = k.split('|');
      const topProtocols = [...protocols.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, n]) => ({ title: prettifyName(name), count: n }));
      return {
        state, city, x: Number(x), y: Number(y), count, tier: tier(count), topProtocols
      };
    })
    .sort((a, b) => b.count - a.count);

  // Final safety net: fan out any locales that still share an exact pixel.
  // Highest-count locale keeps the pin; the rest get pushed onto a ring around
  // it (deterministic by city name). Logs a warning so we know to add proper
  // coords. Never silently overlaps again.
  {
    const byCoord = new Map();
    for (const l of locales) {
      const k = `${l.x},${l.y}`;
      if (!byCoord.has(k)) byCoord.set(k, []);
      byCoord.get(k).push(l);
    }
    for (const [k, group] of byCoord) {
      if (group.length < 2) continue;
      console.warn(`[reach] coord collision at ${k}: ${group.map(g => `${g.state}|${g.city}=${g.count}`).join(', ')} -- fanning out (add coords to CITY_RULES)`);
      group.sort((a, b) => b.count - a.count);
      const [anchor, ...rest] = group;
      rest.forEach((l, i) => {
        const ang = (i / rest.length) * Math.PI * 2 + (i === 0 ? -Math.PI / 2 : 0);
        const rad = 14;
        l.x = Math.round(anchor.x + Math.cos(ang) * rad);
        l.y = Math.round(anchor.y + Math.sin(ang) * rad);
      });
    }
  }

  // Final audit: every US dot must sit in (or hug the border of) its state's
  // SVG shape. Warn-only — positions come from verified lat/lons, so a hit
  // here means a table or classifier regression that needs a human look.
  for (const l of locales) {
    if (l.state !== 'AK' && l.state !== 'HI' && !insideState(l.x, l.y, l.state, 8)) {
      console.warn(`[reach] AUDIT: ${l.city}, ${l.state} (${l.x},${l.y}) is outside its state shape`);
    }
  }

  // International locales for world view (viewBox 0 0 950 620, latLonToWorldSVG)
  const internationalLocales = [...intlData.entries()]
    .map(([k, { count, protocols, countryName }]) => {
      const [country, city, x, y] = k.split('|');
      const topProtocols = [...protocols.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, n]) => ({ title: prettifyName(name), count: n }));
      return {
        country, countryName, city, x: Number(x), y: Number(y), count, tier: tier(count), topProtocols
      };
    })
    .sort((a, b) => b.count - a.count);
  const internationalUploads = internationalLocales.reduce((s, l) => s + l.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalUploads: total,
    distinctProtocols: nameCounts.size,
    activeStudiers: userIds.size,
    pagesProcessed: pages,
    statesRepresented: stateCounts.size,
    countriesRepresented: countryCounts.size,
    internationalUploads,
    byState: Object.fromEntries([...stateCounts.entries()].sort((a, b) => b[1] - a[1])),
    byCountry: Object.fromEntries([...countryCounts.entries()].sort((a, b) => b[1] - a[1])),
    locales,
    internationalLocales,
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
