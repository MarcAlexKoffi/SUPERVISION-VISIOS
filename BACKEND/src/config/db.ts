import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import * as path from 'path';

dotenv.config();

// --- 1. CONFIGURATION MYSQL (Pour la migration uniquement - Optionnel) ---
// On ne crée le pool que si les variables sont définies pour éviter des erreurs sur Render
let pool: any = null;
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
  console.log('DB Config MySQL:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    db: process.env.DB_NAME
  });

  pool = mysql.createPool({
    host: process.env.DB_HOST?.trim(),
    user: process.env.DB_USER?.trim(),
    password: process.env.DB_PASSWORD?.trim(),
    database: process.env.DB_NAME?.trim(),
    port: parseInt(process.env.DB_PORT || '3306'),
    // Gérer dynamiquement SSL basé sur l'environnement
    ...(process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1' ? { ssl: { rejectUnauthorized: false } } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
} else {
  console.log('MySQL configuraton skipped (Variables not set). Using Firestore only.');
}

export { pool };

// --- 2. CONFIGURATION FIREBASE ADMIN (Pour la nouvelle version) ---
// Initialize Firebase Admin
if (!admin.apps.length) {
  // 1. Essayer avec la variable d'environnement (Production Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'supervision-visios'
      });
      console.log('Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT env var');
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var', e);
    }
  } 
  // 2. Si non initialisé, essayer le fichier local (Dev local)
  if (!admin.apps.length) {
    try {
      console.log('Tentative de chargement de serviceAccountKey.json depuis:', path.resolve(__dirname, '../../serviceAccountKey.json'));
      const serviceAccount = require(path.resolve(__dirname, '../../serviceAccountKey.json'));
      admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || 'supervision-visios'
      });
      console.log('Firebase Admin initialized with serviceAccountKey.json');
    } catch (error) {
      console.warn('serviceAccountKey.json non trouvé ou invalide.');
    }
  }

  // 3. Fallback (Cloud Functions default)
  if (!admin.apps.length) {
    console.log('Using default application credentials (Fallback)');
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'supervision-visios'
    });
  }
}

const db = admin.firestore();
const auth = admin.auth(); 

export { db, auth, admin };

