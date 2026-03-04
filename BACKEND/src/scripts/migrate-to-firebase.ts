
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

// 1. Configuration Firebase (copiée depuis votre message)
const firebaseConfig = {
  apiKey: "AIzaSyBKgTwGI4DrDopUMGQkIgrGH50CtnicQyQ",
  authDomain: "supervision-visios.firebaseapp.com",
  projectId: "supervision-visios",
  storageBucket: "supervision-visios.firebasestorage.app",
  messagingSenderId: "72335250123",
  appId: "1:72335250123:web:69f86d84b33399790e814e",
  measurementId: "G-F67919H9GL"
};

// 2. Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function migrate() {
  console.log('🚀 Démarrage de la migration vers Firebase...');

  try {
    // A. Migrate Users (Metadata only, Auth manual signup required later)
    console.log('👤 Migration des utilisateurs...');
    const [users] = await pool.query<RowDataPacket[]>('SELECT * FROM users');
    for (const user of users) {
        // We use setDoc with specific ID to easier mapping if needed, 
        // or just let Firestore auto-gen ID. 
        // Let's us username as ID or keep auto. 
        // Actually, we can't easily keep the same ID as MySQL (int vs string), 
        // but we can store the old ID.
        await addDoc(collection(db, 'users'), {
            old_mysql_id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_id === 1 ? 'admin' : 'user', // Basic role mapping, adjust if needed
            created_at: new Date()
        });
    }
    console.log(`✅ ${users.length} utilisateurs migrés (métadonnées).`);

    // B. Migrate Teachers
    console.log('👨‍🏫 Migration des enseignants...');
    const [teachers] = await pool.query<RowDataPacket[]>('SELECT * FROM teachers');
    for (const t of teachers) {
        // Create teacher document
        const ref = await addDoc(collection(db, 'teachers'), {
            old_mysql_id: t.id,
            first_name: t.first_name,
            last_name: t.last_name,
            email: t.email,
            phone: t.phone || null // Handle undefined phone
        });
        // We might need to map old ID to new ID for relations
    }
    console.log(`✅ ${teachers.length} enseignants migrés.`);

    // C. Migrate UEs
    console.log('📚 Migration des UEs...');
    const [ues] = await pool.query<RowDataPacket[]>('SELECT * FROM ues');
    for (const ue of ues) {
        await addDoc(collection(db, 'ues'), {
            old_mysql_id: ue.id,
            code: ue.code,
            name: ue.name,
            description: ue.description || null
        });
    }
    console.log(`✅ ${ues.length} UEs migrées.`);

    // D. Migrate Classes (Parcours)
    console.log('🎓 Migration des classes (parcours)...');
    const [classes] = await pool.query<RowDataPacket[]>('SELECT * FROM parcours'); // or 'classes' table if renamed? Assume 'parcours' based on routes
    for (const c of classes) {
        await addDoc(collection(db, 'parcours'), {
            old_mysql_id: c.id,
            name: c.name,
            description: c.description || null
        });
    }
    console.log(`✅ ${classes.length} classes migrées.`);

    // E. Migrate Plannings
    console.log('📅 Migration des plannings...');
    // We need to join to get semantic data because IDs will change
    // Or we fetch all new Firestore docs, create a map [oldId -> newId], then migrate plannings.
    // That's the robust way.
    
    // 1. Fetch all new teachers to map
    // We can't easily do this in one script run without keeping state or re-querying firestore.
    // For simplicity in this "Help me now" context, we will store the old IDs in the planning document too,
    // and when we display them in Angular, we might have issues joining if we rely on IDs.
    // BETTER: Store the copies of teacher/UE data IN the planning document (Denormalization - NoSQL way).
    
    const [plannings] = await pool.query<RowDataPacket[]>(`
        SELECT p.*, 
             u.code as ue_code, u.name as ue_name, 
             t.first_name as teacher_first_name, t.last_name as teacher_last_name, t.email as teacher_email
      FROM plannings p
      LEFT JOIN ues u ON p.ue_id = u.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
    `);

    for (const p of plannings) {
        await addDoc(collection(db, 'plannings'), {
            old_mysql_id: p.id,
            parcours: p.parcours, // This is a string name in MySQL usually, so it's fine
            date: p.date, // format YYYY-MM-DD
            start_time: p.start_time,
            end_time: p.end_time,
            session_type: p.session_type,
            platform: p.platform || '',
            visio_link: p.visio_link || '',
            status: p.status || 'À superviser',
            title: p.title || null,
            description: p.description || null,
            // Denormalized Data (NoSQL Best Practice)
            ue: p.ue_id ? {
                code: p.ue_code,
                name: p.ue_name
            } : null,
            teacher: {
                first_name: p.teacher_first_name,
                last_name: p.teacher_last_name,
                email: p.teacher_email
            }
        });
    }
    console.log(`✅ ${plannings.length} séances planifiées migrées.`);

    console.log('🎉 Migration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur pendant la migration:', error);
    process.exit(1);
  }
}

migrate();
