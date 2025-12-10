/**
 * Pull Firestore Stats for Blog Posts
 * Fetches anonymous aggregate statistics from ProtoQuiz Firebase
 */

import admin from 'firebase-admin';
import fs from 'fs/promises';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/tmp/firebase-key.json';

  try {
    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'ems-protoquiz-tracking'
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly');
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Get current month key (YYYY-MM format)
 */
function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Dev user ID to exclude from stats
 */
const DEV_USER_ID = 'UQLMSLQZ'; // Prefix match

/**
 * Get active users count (last 30 days) - excluding dev user
 */
async function getActiveUsersCount() {
  try {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const snapshot = await db.collection('users')
      .where('lastActive', '>=', thirtyDaysAgo)
      .get();

    // Filter out dev user manually
    const realUsers = snapshot.docs.filter(doc => !doc.id.startsWith(DEV_USER_ID));

    return realUsers.length;
  } catch (error) {
    console.warn('⚠️  Could not fetch active users:', error.message);
    return null;
  }
}

/**
 * Get all-time stats from Firestore tracking
 */
async function getAllTimeStats() {
  try {
    // Get successful protocol uploads from protocol_uploads_success collection
    const successfulUploadsSnapshot = await db.collection('protocol_uploads_success').get();
    const realSuccessfulUploads = successfulUploadsSnapshot.docs.filter(doc => {
      const userId = doc.data().userId;
      return !userId || !userId.startsWith(DEV_USER_ID);
    });
    const protocolsUploaded = realSuccessfulUploads.length;

    // Get all events for counting
    const currentMonth = getMonthKey();
    const allEventCollections = [];

    // Get current and recent month events (adjust as needed)
    for (let monthsAgo = 0; monthsAgo < 12; monthsAgo++) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      const monthKey = getMonthKey(date);
      try {
        const monthEvents = await db.collection('events').doc(monthKey).collection('events').get();
        allEventCollections.push(monthEvents);
      } catch (e) {
        // Month might not exist yet
      }
    }

    let quizzesGenerated = 0;
    let scenariosCompleted = 0;
    let algorithmQuizzes = 0;

    // Count events from all months
    allEventCollections.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const { category, action, userId } = data;

        // Skip dev user events
        if (userId && userId.startsWith(DEV_USER_ID)) return;

        if (category === 'quiz' && (action === 'quiz_completed' || action === 'quiz_started')) {
          quizzesGenerated++;
        } else if (category === 'scenario' && (action === 'scenario_completed' || action === 'generation_completed')) {
          scenariosCompleted++;
        } else if (category === 'algorithm_quiz' && (action === 'completed' || action === 'algorithm_completed')) {
          algorithmQuizzes++;
        }
      });
    });

    // Also check scenario_generations collection for scenarios
    const scenarioGensSnapshot = await db.collection('scenario_generations').get();
    const realScenarioGens = scenarioGensSnapshot.docs.filter(doc => {
      const userId = doc.data().userId;
      return !userId || !userId.startsWith(DEV_USER_ID);
    });

    // Use the higher count between events and scenario_generations
    scenariosCompleted = Math.max(scenariosCompleted, realScenarioGens.length);

    // Check algorithm_quiz_generations collection
    const algoQuizSnapshot = await db.collection('algorithm_quiz_generations').get();
    const realAlgoQuizzes = algoQuizSnapshot.docs.filter(doc => {
      const userId = doc.data().userId;
      return !userId || !userId.startsWith(DEV_USER_ID);
    });

    // Use the higher count
    algorithmQuizzes = Math.max(algorithmQuizzes, realAlgoQuizzes.length);

    return {
      protocolsUploaded,
      quizzesGenerated,
      scenariosCompleted,
      algorithmQuizzes
    };
  } catch (error) {
    console.warn('⚠️  Could not fetch stats:', error.message);
    return {
      protocolsUploaded: 0,
      quizzesGenerated: 0,
      scenariosCompleted: 0,
      algorithmQuizzes: 0
    };
  }
}

/**
 * Get total users count (all time) - excluding dev user
 * Counts unique userIds from events and protocol_uploads (not just users collection)
 */
async function getTotalUsersCount() {
  try {
    // Get unique users from events
    const eventsSnapshot = await db.collection('events').get();
    const eventUsers = new Set();
    eventsSnapshot.docs.forEach(doc => {
      const userId = doc.data().userId;
      if (userId && !userId.startsWith(DEV_USER_ID)) {
        eventUsers.add(userId);
      }
    });

    // Get unique users from protocol uploads
    const uploadsSnapshot = await db.collection('protocol_uploads').get();
    const uploadUsers = new Set();
    uploadsSnapshot.docs.forEach(doc => {
      const userId = doc.data().userId;
      if (userId && !userId.startsWith(DEV_USER_ID)) {
        uploadUsers.add(userId);
      }
    });

    // Combine both sets
    const allUsers = new Set([...eventUsers, ...uploadUsers]);

    return allUsers.size;
  } catch (error) {
    console.warn('⚠️  Could not fetch total users:', error.message);
    return null;
  }
}

/**
 * Get upload success rate (last 30 days) - excluding dev user
 */
async function getUploadSuccessRate() {
  try {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const allUploads = await db.collection('protocol_uploads')
      .where('timestamp', '>=', thirtyDaysAgo)
      .get();

    if (allUploads.empty) {
      return null;
    }

    // Filter out dev user uploads
    const realUploads = allUploads.docs.filter(doc => {
      const userId = doc.data().userId;
      return !userId || !userId.startsWith(DEV_USER_ID);
    });

    if (realUploads.length === 0) {
      return null;
    }

    const total = realUploads.length;
    const successful = realUploads.filter(doc => doc.data().status === 'success').length;

    return Math.round((successful / total) * 100);
  } catch (error) {
    console.warn('⚠️  Could not fetch upload success rate:', error.message);
    return null;
  }
}

/**
 * Get top 3 protocol names (anonymized - no user data) - excluding dev user
 */
async function getTopProtocols() {
  try {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const uploads = await db.collection('protocol_uploads')
      .where('status', '==', 'success')
      .where('timestamp', '>=', thirtyDaysAgo)
      .get();

    if (uploads.empty) {
      return [];
    }

    // Filter out dev user and count protocol names
    const protocolCounts = {};
    uploads.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;

      // Skip dev user uploads
      if (userId && userId.startsWith(DEV_USER_ID)) {
        return;
      }

      const name = data.protocolName || 'Unknown';
      protocolCounts[name] = (protocolCounts[name] || 0) + 1;
    });

    // Sort by count and get top 3
    const sorted = Object.entries(protocolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return sorted;
  } catch (error) {
    console.warn('⚠️  Could not fetch top protocols:', error.message);
    return [];
  }
}

/**
 * Get App Store download count (Firebase users + offset)
 * Offset accounts for users who downloaded but haven't opened the app yet
 * Gap as of Nov 29, 2024: 398 (App Store) - 276 (Firebase) = 122
 */
async function getAppStoreDownloads() {
  try {
    // Get real Firebase user count
    const firebaseUsers = await getTotalUsersCount();

    if (!firebaseUsers) {
      console.warn('⚠️  Could not fetch Firebase users for download count');
      return null;
    }

    // Add offset for users who downloaded but haven't opened app
    // This keeps the number aligned with App Store Connect analytics
    const DOWNLOAD_OFFSET = 122;

    return firebaseUsers + DOWNLOAD_OFFSET;
  } catch (error) {
    console.warn('⚠️  Could not calculate App Store downloads:', error.message);
    return null;
  }
}

/**
 * Round numbers to generic ranges for public display
 */
function roundToGenericRange(num) {
  if (num === null || num === undefined || num === 0) return 0;

  // For smaller numbers, round to nearest 50
  if (num < 200) {
    return Math.floor(num / 50) * 50;
  }

  // For medium numbers, round to nearest 100
  if (num < 1000) {
    return Math.floor(num / 100) * 100;
  }

  // For large numbers, round to nearest 500
  return Math.floor(num / 500) * 500;
}

/**
 * Format number for display (adds + for rounded numbers)
 */
function formatStatDisplay(num, exact = false) {
  if (num === null || num === undefined) return 'N/A';
  if (num === 0) return '0';

  if (exact) {
    return num.toString();
  }

  const rounded = roundToGenericRange(num);
  return rounded > 0 ? `${rounded}+` : '0';
}

/**
 * Main function - pull all stats
 */
async function pullStats() {
  console.log('📊 Pulling Firestore stats...\n');

  const rawStats = {
    appStoreDownloads: await getAppStoreDownloads(),
    activeUsers: await getActiveUsersCount(),
    allTime: await getAllTimeStats(),
    uploadSuccessRate: await getUploadSuccessRate(),
    topProtocols: await getTopProtocols()
  };

  // Create both raw and display versions
  const stats = {
    generatedAt: new Date().toISOString(),
    raw: {
      appStoreDownloads: rawStats.appStoreDownloads,
      activeUsers: rawStats.activeUsers,
      protocolsUploaded: rawStats.allTime.protocolsUploaded,
      quizzesGenerated: rawStats.allTime.quizzesGenerated,
      scenariosCompleted: rawStats.allTime.scenariosCompleted,
      algorithmQuizzes: rawStats.allTime.algorithmQuizzes,
      uploadSuccessRate: rawStats.uploadSuccessRate
    },
    display: {
      appStoreDownloads: formatStatDisplay(rawStats.appStoreDownloads),
      activeUsers: formatStatDisplay(rawStats.activeUsers),
      protocolsUploaded: formatStatDisplay(rawStats.allTime.protocolsUploaded),
      quizzesGenerated: formatStatDisplay(rawStats.allTime.quizzesGenerated),
      scenariosCompleted: formatStatDisplay(rawStats.allTime.scenariosCompleted),
      algorithmQuizzes: formatStatDisplay(rawStats.allTime.algorithmQuizzes),
      uploadSuccessRate: rawStats.uploadSuccessRate
    },
    topProtocols: rawStats.topProtocols
  };

  // Save to tmp directory
  await fs.mkdir('tmp', { recursive: true });
  await fs.writeFile('tmp/firestore-stats.json', JSON.stringify(stats, null, 2));

  console.log('✅ Stats pulled successfully:\n');
  console.log(`   📱 Total Downloads: ${stats.display.appStoreDownloads}`);
  console.log(`   👥 Active Users (30d): ${stats.display.activeUsers}`);
  console.log(`   📄 Protocols Uploaded: ${stats.display.protocolsUploaded}`);
  console.log(`   📝 Quizzes Generated: ${stats.display.quizzesGenerated}`);
  console.log(`   🎬 Scenarios Completed: ${stats.display.scenariosCompleted}`);
  console.log(`   🧠 Algorithm Quizzes: ${stats.display.algorithmQuizzes}`);
  console.log(`   ✅ Upload Success Rate: ${stats.display.uploadSuccessRate}%`);
  console.log(`   🔝 Top Protocols: ${stats.topProtocols.join(', ') || 'N/A'}`);
  console.log('\n📁 Saved to: tmp/firestore-stats.json\n');

  return stats;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await pullStats();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

export { pullStats };
