
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

// Initialisation Firebase (copié de db.ts pour être autonome)
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
    console.log('Chargement de la clé depuis:', serviceAccountPath);
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Erreur init firebase:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function createLocalAdminUser() {
  const email = 'admin@local.test';
  const username = 'admin';
  const password = 'admin123'; 

  console.log(`Création de l'utilisateur Admin Local : ${username} / ${password} ...`);

  try {
    // 1. Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Créer l'objet utilisateur
    const newUser = {
      email,
      password: passwordHash, // On stocke le hash pour la méthode "locale" du backend
      username,
      role: 'admin',
      created_at: new Date(),
      uid: 'admin-local-test' // ID fixe pour le retrouver facilement
    };

    // 3. Sauvegarder dans Firestore (Collection 'users')
    // On utilise .set() avec merge: true pour écraser s'il existe déjà sans tout casser
    await db.collection('users').doc('admin_local').set(newUser);

    console.log('✅ Utilisateur Admin Local créé avec succès !');
    console.log(`Email : ${email}`);
    console.log(`Username : ${username}`);
    console.log(`Password : ${password}`);
    console.log('-------------------------------------------');
  } catch (error) {
    console.error('Erreur lors de la création:', error);
  }
}

createLocalAdminUser();
