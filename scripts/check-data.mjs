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

async function checkData() {
  // Check all events
  const events = await db.collection('events').get();

  let allQuizzes = 0;
  let novQuizzes = 0;
  let allProtocols = 0;
  let novProtocols = 0;

  events.docs.forEach(doc => {
    const data = doc.data();
    const userId = data.userId;

    // Skip dev user
    if (userId && userId.startsWith(DEV_USER_ID)) return;

    // Count quizzes
    if (data.category === 'quiz' && (data.action === 'quiz_completed' || data.action === 'quiz_started')) {
      allQuizzes++;
      if (doc.id.startsWith('2025-11_')) {
        novQuizzes++;
      }
    }

    // Count protocols
    if (data.category === 'protocol' && (data.action === 'upload_completed' || data.action === 'extraction_completed')) {
      allProtocols++;
      if (doc.id.startsWith('2025-11_')) {
        novProtocols++;
      }
    }
  });

  // Check protocol_uploads collection
  const uploads = await db.collection('protocol_uploads').get();
  const realUploads = uploads.docs.filter(doc => {
    const userId = doc.data().userId;
    return !userId || !userId.startsWith(DEV_USER_ID);
  });

  console.log('\n📊 Data Summary:\n');
  console.log('QUIZZES:');
  console.log(`  All-time: ${allQuizzes}`);
  console.log(`  November 2025: ${novQuizzes}`);

  console.log('\nPROTOCOLS (from events):');
  console.log(`  All-time: ${allProtocols}`);
  console.log(`  November 2025: ${novProtocols}`);

  console.log('\nPROTOCOL UPLOADS (from protocol_uploads collection):');
  console.log(`  Total docs: ${realUploads.length}`);

  process.exit(0);
}

checkData().catch(console.error);
