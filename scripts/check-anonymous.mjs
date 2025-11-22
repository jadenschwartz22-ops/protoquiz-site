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

async function checkAnonymous() {
  // Check events
  const events = await db.collection('events').get();
  const eventsWithoutUserId = events.docs.filter(doc => !doc.data().userId);
  const eventsWithUserId = events.docs.filter(doc => doc.data().userId);

  console.log('Events:');
  console.log(`  With userId: ${eventsWithUserId.length}`);
  console.log(`  Without userId: ${eventsWithoutUserId.length}`);

  // Check uploads
  const uploads = await db.collection('protocol_uploads').get();
  const uploadsWithoutUserId = uploads.docs.filter(doc => !doc.data().userId);
  const uploadsWithUserId = uploads.docs.filter(doc => doc.data().userId);

  console.log('\nProtocol Uploads:');
  console.log(`  With userId: ${uploadsWithUserId.length}`);
  console.log(`  Without userId: ${uploadsWithoutUserId.length}`);

  // Maybe deviceId instead?
  const devicesFromEvents = new Set();
  const devicesFromUploads = new Set();

  events.docs.forEach(doc => {
    const deviceId = doc.data().deviceId;
    if (deviceId) devicesFromEvents.add(deviceId);
  });

  uploads.docs.forEach(doc => {
    const deviceId = doc.data().deviceId;
    if (deviceId) devicesFromUploads.add(deviceId);
  });

  const allDevices = new Set([...devicesFromEvents, ...devicesFromUploads]);

  console.log('\nUnique deviceIds:');
  console.log(`  From events: ${devicesFromEvents.size}`);
  console.log(`  From uploads: ${devicesFromUploads.size}`);
  console.log(`  Total unique: ${allDevices.size}`);

  process.exit(0);
}

checkAnonymous().catch(console.error);
