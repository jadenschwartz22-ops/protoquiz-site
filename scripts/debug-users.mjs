import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/tmp/firebase-key.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ems-protoquiz-tracking'
});

const db = admin.firestore();

async function checkUsers() {
  console.log('Checking users collection...\n');

  // Get all users
  const snapshot = await db.collection('users').get();
  console.log(`Total documents in users collection: ${snapshot.size}`);

  // Check first 5 users structure
  console.log('\nFirst 5 users:');
  snapshot.docs.slice(0, 5).forEach(doc => {
    const data = doc.data();
    const lastActive = data.lastActive ? data.lastActive.toDate() : 'N/A';
    const createdAt = data.createdAt ? data.createdAt.toDate() : 'N/A';
    console.log(`- ${doc.id.substring(0, 8)}...: lastActive=${lastActive}, createdAt=${createdAt}`);
  });

  // Count dev users
  const devUsers = snapshot.docs.filter(doc => doc.id.startsWith('UQLMSLQZ'));
  console.log(`\nDev users (UQLMSLQZ*): ${devUsers.length}`);
  console.log(`Real users: ${snapshot.size - devUsers.length}`);

  // Check if there are users with lastActive field
  const withLastActive = snapshot.docs.filter(doc => doc.data().lastActive);
  console.log(`\nUsers with lastActive field: ${withLastActive.length}`);

  // Check 30-day active users
  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const activeUsers = snapshot.docs.filter(doc => {
    const lastActive = doc.data().lastActive;
    return lastActive && lastActive >= thirtyDaysAgo && !doc.id.startsWith('UQLMSLQZ');
  });
  console.log(`Active users (30d, excluding dev): ${activeUsers.length}`);

  process.exit(0);
}

checkUsers().catch(console.error);
