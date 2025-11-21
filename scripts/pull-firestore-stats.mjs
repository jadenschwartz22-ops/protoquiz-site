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
 * Get monthly event aggregates
 * Events are stored as: events/2025-11_evt_abc123
 */
async function getMonthlyEvents() {
  try {
    const monthKey = getMonthKey();

    // Query all events for this month (startsWith monthKey)
    const snapshot = await db.collection('events')
      .where(admin.firestore.FieldPath.documentId(), '>=', `${monthKey}_`)
      .where(admin.firestore.FieldPath.documentId(), '<', `${monthKey}_\uf8ff`)
      .get();

    if (snapshot.empty) {
      console.warn(`⚠️  No events found for ${monthKey}`);
      return {
        protocolsUploaded: 0,
        quizzesGenerated: 0,
        scenariosCompleted: 0,
        algorithmQuizzes: 0
      };
    }

    // Count events by category/action
    // Real event names from Firestore:
    // - protocol/upload_completed
    // - protocol/extraction_completed
    // - quiz/generated or quiz/completed
    // - scenario/generation_completed
    // - quiz/algorithm_completed
    let protocolsUploaded = 0;
    let quizzesGenerated = 0;
    let scenariosCompleted = 0;
    let algorithmQuizzes = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const { category, action, userId } = data;

      // Skip dev user events
      if (userId && userId.startsWith(DEV_USER_ID)) {
        return;
      }

      if (category === 'protocol' && (action === 'upload_completed' || action === 'extraction_completed')) {
        protocolsUploaded++;
      } else if (category === 'quiz' && (action === 'generated' || action === 'completed')) {
        quizzesGenerated++;
      } else if (category === 'scenario' && (action === 'generation_completed' || action === 'completed')) {
        scenariosCompleted++;
      } else if (category === 'quiz' && action === 'algorithm_completed') {
        algorithmQuizzes++;
      }
    });

    return {
      protocolsUploaded,
      quizzesGenerated,
      scenariosCompleted,
      algorithmQuizzes
    };
  } catch (error) {
    console.warn('⚠️  Could not fetch monthly events:', error.message);
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
 */
async function getTotalUsersCount() {
  try {
    const snapshot = await db.collection('users').get();

    // Filter out dev user
    const realUsers = snapshot.docs.filter(doc => !doc.id.startsWith(DEV_USER_ID));

    return realUsers.length;
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
 * Main function - pull all stats
 */
async function pullStats() {
  console.log('📊 Pulling Firestore stats...\n');

  const monthKey = getMonthKey();
  const stats = {
    generatedAt: new Date().toISOString(),
    monthKey,
    activeUsers: await getActiveUsersCount(),
    totalUsers: await getTotalUsersCount(),
    monthly: await getMonthlyEvents(),
    uploadSuccessRate: await getUploadSuccessRate(),
    topProtocols: await getTopProtocols()
  };

  // Save to tmp directory
  await fs.mkdir('tmp', { recursive: true });
  await fs.writeFile('tmp/firestore-stats.json', JSON.stringify(stats, null, 2));

  console.log('✅ Stats pulled successfully:\n');
  console.log(`   Active Users (30d): ${stats.activeUsers || 'N/A'}`);
  console.log(`   Total Users: ${stats.totalUsers || 'N/A'}`);
  console.log(`   Protocols Uploaded (${monthKey}): ${stats.monthly.protocolsUploaded}`);
  console.log(`   Quizzes Generated: ${stats.monthly.quizzesGenerated}`);
  console.log(`   Scenarios Completed: ${stats.monthly.scenariosCompleted}`);
  console.log(`   Algorithm Quizzes: ${stats.monthly.algorithmQuizzes}`);
  console.log(`   Upload Success Rate: ${stats.uploadSuccessRate || 'N/A'}%`);
  console.log(`   Top Protocols: ${stats.topProtocols.join(', ') || 'N/A'}`);
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
