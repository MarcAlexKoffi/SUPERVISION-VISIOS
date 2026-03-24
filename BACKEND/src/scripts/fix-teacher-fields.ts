
import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialisation Firebase (copied from create-admin-firestore.ts)
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
    console.log('Using service account:', serviceAccountPath);
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function fixTeacherFields() {
  console.log('Starting migration of teacher fields (camelCase -> snake_case)...');
  const teachersRef = db.collection('teachers');
  const snapshot = await teachersRef.get();

  if (snapshot.empty) {
    console.log('No teachers found.');
    process.exit(0);
  }

  let updatedCount = 0;
  let batch = db.batch();
  let operationCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    let updates: any = {};

    // Check firstName -> first_name
    if (data.firstName && !data.first_name) {
      updates.first_name = data.firstName;
      updates.firstName = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    } else if (data.firstName && data.first_name) {
        // Redundant field, delete camelCase
        updates.firstName = admin.firestore.FieldValue.delete();
        needsUpdate = true;
    }

    // Check lastName -> last_name
    if (data.lastName && !data.last_name) {
      updates.last_name = data.lastName;
      updates.lastName = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    } else if (data.lastName && data.last_name) {
        // Redundant field, delete camelCase
        updates.lastName = admin.firestore.FieldValue.delete();
        needsUpdate = true;
    }

    if (needsUpdate) {
        console.log(`Migrating teacher ${doc.id} (${data.firstName || data.first_name} ${data.lastName || data.last_name})`);
        batch.update(doc.ref, updates);
        updatedCount++;
        operationCount++;

        // Batch limit is 500
        if (operationCount >= 400) {
            await batch.commit();
            batch = db.batch();
            operationCount = 0;
        }
    }
  }

  if (operationCount > 0) {
      await batch.commit();
  }

  console.log(`Migration complete. Updated ${updatedCount} teachers.`);
  process.exit(0);
}

fixTeacherFields().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
