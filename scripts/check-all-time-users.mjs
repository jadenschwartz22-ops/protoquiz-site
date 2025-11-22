import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/tmp/firebase-key.json', 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ems-protoquiz-tracking'
  });
}

const db = admin.firestore();

async function checkAllTimeUsers() {
  console.log('Checking ALL-TIME unique users...\n');

  // Get ALL events (this might take a moment)
  console.log('Fetching all events...');
  const events = await db.collection('events').get();
  console.log(`Total events: ${events.size}`);

  const allEventUsers = new Set();
  events.docs.forEach(doc => {
    const userId = doc.data().userId;
    if (userId) allEventUsers.add(userId);
  });

  // Get protocol uploads
  console.log('Fetching all protocol uploads...');
  const uploads = await db.collection('protocol_uploads').get();
  console.log(`Total uploads: ${uploads.size}`);

  const uploadUsers = new Set();
  uploads.docs.forEach(doc => {
    const userId = doc.data().userId;
    if (userId) uploadUsers.add(userId);
  });

  // Combine
  const allUsers = new Set([...allEventUsers, ...uploadUsers]);
  const devUsers = Array.from(allUsers).filter(id => id.startsWith('UQLMSLQZ'));
  const realUsers = Array.from(allUsers).filter(id => !id.startsWith('UQLMSLQZ'));

  console.log(`\n=== RESULTS ===`);
  console.log(`All-time unique userIds (events): ${allEventUsers.size}`);
  console.log(`All-time unique userIds (uploads): ${uploadUsers.size}`);
  console.log(`\nCombined total unique users: ${allUsers.size}`);
  console.log(`  Dev users (UQLMSLQZ*): ${devUsers.length}`);
  console.log(`  Real users: ${realUsers.length}`);

  process.exit(0);
}

checkAllTimeUsers().catch(console.error);
