
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { pool as dbPool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import { Pool } from 'mysql2/promise';

// Cast pool to correct type for TypeScript
const pool = dbPool as Pool;

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
        // Use setDoc with old_mysql_id converted to string to avoid duplicates
        await setDoc(doc(db, 'users', String(user.id)), {
            old_mysql_id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_id === 1 ? 'admin' : 'user',
            created_at: new Date()
        });
    }
    console.log(`✅ ${users.length} utilisateurs migrés.`);

    // B. Migrate Teachers
    console.log('👨‍🏫 Migration des enseignants...');
    const [teachers] = await pool.query<RowDataPacket[]>('SELECT * FROM teachers');
    for (const t of teachers) {
        await setDoc(doc(db, 'teachers', String(t.id)), {
            old_mysql_id: t.id,
            first_name: t.first_name,
            last_name: t.last_name,
            email: t.email,
            phone: t.phone || null
        });
    }
    console.log(`✅ ${teachers.length} enseignants migrés.`);

    // C. Migrate UEs
    console.log('📚 Migration des UEs...');
    const [ues] = await pool.query<RowDataPacket[]>('SELECT * FROM ues');
    for (const ue of ues) {
        await setDoc(doc(db, 'ues', String(ue.id)), {
            old_mysql_id: ue.id,
            code: ue.code,
            name: ue.name,
            description: ue.description || null
        });
    }
    console.log(`✅ ${ues.length} UEs migrées.`);

    // D. Migrate Parcours
    console.log('🎓 Migration des parcours...');
    const [parcours] = await pool.query<RowDataPacket[]>('SELECT * FROM parcours'); 
    for (const c of parcours) {
        await setDoc(doc(db, 'parcours', String(c.id)), {
            old_mysql_id: c.id,
            name: c.name,
            description: c.description || null
        });
    }
    console.log(`✅ ${parcours.length} parcours migrés.`);

    // E. Migrate Classes (Real Classes Table)
    console.log('🏫 Migration des classes...');
    // Check if table exists first to avoid error if it doesn't
    try {
        const [classes] = await pool.query<RowDataPacket[]>('SELECT c.*, p.name as parcours_name FROM classes c LEFT JOIN parcours p ON c.parcours_id = p.id');
        for (const c of classes) {
            await setDoc(doc(db, 'classes', String(c.id)), {
                old_mysql_id: c.id,
                name: c.name,
                effectif: c.effectif || 0,
                parcours: c.parcours_name || 'Inconnu',
                parcours_id: c.parcours_id ? String(c.parcours_id) : null
            });
        }
        console.log(`✅ ${classes.length} classes migrées.`);
    } catch (err: any) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
             console.log('⚠️ La table "classes" n\'existe pas dans MySQL, migration ignorée pour cette table.');
        } else {
             throw err;
        }
    }


    // F. Migrate Plannings
    console.log('📅 Migration des plannings...');
    const [plannings] = await pool.query<RowDataPacket[]>(`
        SELECT p.*, 
             u.code as ue_code, u.name as ue_name, 
             t.first_name as teacher_first_name, t.last_name as teacher_last_name, t.email as teacher_email
      FROM plannings p
      LEFT JOIN ues u ON p.ue_id = u.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
    `);

    for (const p of plannings) {
        await setDoc(doc(db, 'plannings', String(p.id)), {
            old_mysql_id: p.id,
            parcours: p.parcours, 
            date: p.date, 
            start_time: p.start_time,
            end_time: p.end_time,
            session_type: p.session_type,
            platform: p.platform || '',
            visio_link: p.visio_link || '',
            status: p.status || 'À superviser',
            title: p.title || null,
            description: p.description || null,
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


    // G. Migrate Supervisions (History)
    console.log('📝 Migration de l\'historique des supervisions...');
    const [supervisions] = await pool.query<RowDataPacket[]>(`
      SELECT s.*, 
             u.username as supervisor_username, u.email as supervisor_email,
             t.first_name as teacher_first_name, t.last_name as teacher_last_name, t.email as teacher_email,
             ue.code as ue_code, ue.name as ue_name
      FROM supervision_forms s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN ues ue ON s.ue_id = ue.id
    `);

    for (const s of supervisions) {
        await setDoc(doc(db, 'supervisions', String(s.id)), {
            old_mysql_id: s.id,
            visit_date: s.visit_date,
            start_time: s.start_time,
            end_time: s.end_time,
            
            supervisor: {
                id: s.user_id || null, 
                name: s.supervisor_name || s.supervisor_username || 'Inconnu',
                email: s.supervisor_email || null
            },
            teacher: {
                id: s.teacher_id || null,
                name: s.teacher_name || (s.teacher_first_name ? `${s.teacher_first_name} ${s.teacher_last_name}` : 'Inconnu'),
                email: s.teacher_email || null
            },
            ue: {
                id: s.ue_id || null,
                name: s.module || s.ue_name || 'Inconnu',
                code: s.ue_code || null
            },
            session: {
                level: s.level || null,
                number: s.session_number || null,
                platform: s.platform || null,
                students: {
                    present: s.present_count || 0,
                    total: s.total_students || 0
                }
            },
            evaluation: {
                technical: {
                    internet: s.tech_internet || null,
                    audio_video: s.tech_audio_video || null,
                    punctuality: s.tech_punctuality || null
                },
                pedagogical: {
                    objectives: s.ped_objectives || null,
                    mastery: s.ped_content_mastery || null,
                    interaction: s.ped_interaction || null,
                    tools: s.ped_tools_usage || null
                }
            },
            observations: s.observations || null,
            created_at: s.created_at || new Date()
        });
    }
    console.log(`✅ ${supervisions.length} fiches de supervision migrées.`);

    console.log('🎉 Migration terminée avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur pendant la migration:', error);
    process.exit(1);
  }
}

migrate();
