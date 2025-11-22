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

async function checkAllUsers() {
  console.log('Checking for user data across collections...\n');

  // Check events for unique userIds
  const events = await db.collection('events')
    .where(admin.firestore.FieldPath.documentId(), '>=', '2025-11_')
    .where(admin.firestore.FieldPath.documentId(), '<', '2025-11_\uf8ff')
    .get();

  const uniqueUsers = new Set();
  events.docs.forEach(doc => {
    const userId = doc.data().userId;
    if (userId) uniqueUsers.add(userId);
  });

  const devUsers = Array.from(uniqueUsers).filter(id => id.startsWith('UQLMSLQZ'));
  const realUsers = Array.from(uniqueUsers).filter(id => !id.startsWith('UQLMSLQZ'));

  console.log(`Unique userIds in November events: ${uniqueUsers.size}`);
  console.log(`  Dev users: ${devUsers.length}`);
  console.log(`  Real users: ${realUsers.length}`);

  // Check protocol uploads for unique users
  const uploads = await db.collection('protocol_uploads').get();
  const uploadUsers = new Set();
  uploads.docs.forEach(doc => {
    const userId = doc.data().userId;
    if (userId) uploadUsers.add(userId);
  });

  const uploadDev = Array.from(uploadUsers).filter(id => id.startsWith('UQLMSLQZ'));
  const uploadReal = Array.from(uploadUsers).filter(id => !id.startsWith('UQLMSLQZ'));

  console.log(`\nUnique userIds in protocol_uploads (all time): ${uploadUsers.size}`);
  console.log(`  Dev users: ${uploadDev.length}`);
  console.log(`  Real users: ${uploadReal.length}`);

  // All unique users ever
  const allUsers = new Set([...uniqueUsers, ...uploadUsers]);
  const allDev = Array.from(allUsers).filter(id => id.startsWith('UQLMSLQZ'));
  const allReal = Array.from(allUsers).filter(id => !id.startsWith('UQLMSLQZ'));

  console.log(`\nAll unique userIds (events + uploads): ${allUsers.size}`);
  console.log(`  Dev users: ${allDev.length}`);
  console.log(`  Real users: ${allReal.length}`);

  process.exit(0);
}

checkAllUsers().catch(console.error);
