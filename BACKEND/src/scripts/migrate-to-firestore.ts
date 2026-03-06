
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, writeBatch, collection } from "firebase/firestore";
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

// Firebase Config (Matches Frontend)
const firebaseConfig = {
  apiKey: "AIzaSyBKgTwGI4DrDopUMGQkIgrGH50CtnicQyQ",
  authDomain: "supervision-visios.firebaseapp.com",
  projectId: "supervision-visios",
  storageBucket: "supervision-visios.firebasestorage.app",
  messagingSenderId: "72335250123",
  appId: "1:72335250123:web:69f86d84b33399790e814e",
  measurementId: "G-F67919H9GL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication Credentials (Admin)
const ADMIN_EMAIL = "koffimarcalex6@gmail.com";
const ADMIN_PASSWORD = "Marcalex29200311@";

async function migrate() {
  console.log('--- Démarrage de la migration ---');

  // 1. Connexion MySQL
  console.log('Connexion à MySQL...');
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supervision_db', // Default name inferred
    port: parseInt(process.env.DB_PORT || '3306')
  });
  console.log('Connecté à MySQL.');

  // 2. Connexion Firebase (via Auth)
  console.log('Authentification Firebase...');
  try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('Connecté à Firebase en tant que Admin.');
  } catch (e) {
      console.error("Erreur d'authentification Firebase:", e);
      process.exit(1);
  }

  try {
    // --- MIGRATION ROLES ---
    console.log('Récupération des rôles...');
    const [rolesRows] = await connection.query('SELECT * FROM roles');
    const roleMap = new Map(); // id -> name
    (rolesRows as any[]).forEach(r => roleMap.set(r.id, r.name));


    // --- MIGRATION UTILISATEURS ---
    console.log('Migration des utilisateurs...');
    const [usersRows] = await connection.query('SELECT * FROM users');
    let batch = writeBatch(db);
    let count = 0;

    for (const user of (usersRows as any[])) {
        // Use MySQL ID as Doc ID (converted to string) to preserve references temporarily
        const userRef = doc(db, "users", user.id.toString());
        
        const userData = {
            username: user.username,
            email: user.email,
            role: roleMap.get(user.role_id) || 'user',
            old_mysql_id: user.id,
            migrated_at: new Date().toISOString()
        };

        batch.set(userRef, userData, { merge: true });
        count++;
        if (count % 400 === 0) {
            await batch.commit();
            batch = writeBatch(db);
        }
    }
    await batch.commit();
    console.log(`${count} utilisateurs migrés.`);


    // --- MIGRATION ENSEIGNANTS ---
    console.log('Migration des enseignants...');
    const [teachersRows] = await connection.query('SELECT * FROM teachers');
    batch = writeBatch(db);
    count = 0;

    for (const teacher of (teachersRows as any[])) {
        const docRef = doc(db, "teachers", teacher.id.toString());
        batch.set(docRef, { ...teacher, id: teacher.id.toString() }, { merge: true });
        count++;
        if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
    }
    await batch.commit();
    console.log(`${count} enseignants migrés.`);


    // --- MIGRATION UES ---
    console.log('Migration des UEs...');
    const [uesRows] = await connection.query('SELECT * FROM ues');
    const uesMap = new Map(); // id -> UE object
    batch = writeBatch(db);
    count = 0;

    for (const ue of (uesRows as any[])) {
        const docRef = doc(db, "ues", ue.id.toString());
        // Clean null values
        const cleanUE = Object.fromEntries(Object.entries(ue).filter(([_, v]) => v != null));
        batch.set(docRef, { ...cleanUE, id: ue.id.toString() }, { merge: true });
        uesMap.set(ue.id, cleanUE);
        count++;
        if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
    }
    await batch.commit();
    console.log(`${count} UEs migrées.`);


    // --- MIGRATION PARCOURS ---
    console.log('Migration des Parcours...');
    let parcoursMap = new Map();
    try {
        const [parcoursRows] = await connection.query('SELECT * FROM parcours');
        batch = writeBatch(db);
        count = 0;
        for (const p of (parcoursRows as any[])) {
            const docRef = doc(db, "parcours", p.id.toString());
            batch.set(docRef, { ...p, id: p.id.toString() }, { merge: true });
            parcoursMap.set(p.id, p);
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        await batch.commit();
        console.log(`${count} parcours migrés.`);
    } catch (e) {
        console.warn("Table parcours introuvable ou vide, saut de l'étape.");
    }

    // --- MIGRATION CLASSES ---
    console.log('Migration des Classes...');
    try {
        const [classesRows] = await connection.query('SELECT * FROM classes');
        batch = writeBatch(db);
        count = 0;
        for (const c of (classesRows as any[])) {
            const docRef = doc(db, "classes", c.id.toString());
            // Add denormalized parcours name
            const parcours = parcoursMap.get(c.parcours_id);
            const data = {
                ...c,
                id: c.id.toString(),
                parcours_name: parcours ? parcours.name : null
            };
            batch.set(docRef, data, { merge: true });
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        await batch.commit();
        console.log(`${count} classes migrées.`);
    } catch (e) {
        console.warn("Table classes introuvable ou vide, saut de l'étape.");
    }


    // --- MIGRATION PLANNINGS ---
    console.log('Migration des Plannings...');
    // We need teachers map too
    const teachersMap = new Map();
    try {
        const [tRows] = await connection.query('SELECT * FROM teachers');
        (tRows as any[]).forEach(t => teachersMap.set(t.id, t));
    } catch (e) {}

    try {
        const [planningsRows] = await connection.query('SELECT * FROM plannings');
        batch = writeBatch(db);
        count = 0;
        for (const p of (planningsRows as any[])) {
            const docRef = doc(db, "plannings", p.id.toString());
            
            // Format dates
            const dateStr = p.date ? new Date(p.date).toISOString().split('T')[0] : null; // YYYY-MM-DD
            
            // Denormalization
            const ue = uesMap.get(p.ue_id);
            const teacher = teachersMap.get(p.teacher_id);
            
            const data = {
                ...p,
                id: p.id.toString(),
                ue_id: p.ue_id ? p.ue_id.toString() : null,
                teacher_id: p.teacher_id ? p.teacher_id.toString() : null,
                date: dateStr,
                ue_code: ue ? ue.code : null,
                ue_name: ue ? ue.name : null,
                teacher_first_name: teacher ? teacher.first_name : null,
                teacher_last_name: teacher ? teacher.last_name : null,
            };

            // Remove nulls
            const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v != null));

            batch.set(docRef, cleanData, { merge: true });
            count++;
            if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
        }
        await batch.commit();
        console.log(`${count} plannings migrés.`);
    } catch (e) {
         console.warn("Table plannings introuvable, saut de l'étape.", e);
    }


    // --- MIGRATION SUPERVISIONS ---
    console.log('Migration des Supervisions...');
    const [supRows] = await connection.query('SELECT * FROM supervision_forms');
    batch = writeBatch(db);
    count = 0;

    for (const sup of (supRows as any[])) {
        const docRef = doc(db, "supervisions", sup.id.toString());
        
        // Transform Dates
        const cleanSup = {
            ...sup,
            id: sup.id.toString(),
            user_id: sup.user_id ? sup.user_id.toString() : null,
            teacher_id: sup.teacher_id ? sup.teacher_id.toString() : null,
            ue_id: sup.ue_id ? sup.ue_id.toString() : null,
            visit_date: sup.visit_date ? new Date(sup.visit_date).toISOString() : null,
            created_at: sup.created_at ? new Date(sup.created_at).toISOString() : null,
            updated_at: sup.updated_at ? new Date(sup.updated_at).toISOString() : null,
        };
        
        // Remove nulls
        const finalSup = Object.fromEntries(Object.entries(cleanSup).filter(([_, v]) => v != null));

        batch.set(docRef, finalSup, { merge: true });
        count++;
        if (count % 400 === 0) { await batch.commit(); batch = writeBatch(db); }
    }
    await batch.commit();
    console.log(`${count} supervisions migrées.`);

    console.log('--- Migration terminée avec succès ---');
    process.exit(0);

  } catch (error) {
    console.error('Erreur pendant la migration:', error);
    process.exit(1);
  } finally {
      await connection.end();
  }
}

migrate();
