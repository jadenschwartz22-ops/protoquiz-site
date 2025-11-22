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
const DEV_USER_ID = 'UQLMSLQZ';

async function checkEvents() {
  const snapshot = await db.collection('events')
    .where(admin.firestore.FieldPath.documentId(), '>=', '2025-11_')
    .where(admin.firestore.FieldPath.documentId(), '<', '2025-11_\uf8ff')
    .get();

  let uploadCompleted = 0;
  let extractionCompleted = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const userId = data.userId;

    if (userId && userId.startsWith(DEV_USER_ID)) return;

    if (data.category === 'protocol') {
      if (data.action === 'upload_completed') uploadCompleted++;
      if (data.action === 'extraction_completed') extractionCompleted++;
    }
  });

  console.log('Protocol events in November:');
  console.log(`  upload_completed: ${uploadCompleted}`);
  console.log(`  extraction_completed: ${extractionCompleted}`);
  console.log(`  Total (if counting both): ${uploadCompleted + extractionCompleted}`);
  console.log('\nSo each upload creates 2 events, we should only count one type!');

  process.exit(0);
}

checkEvents().catch(console.error);
