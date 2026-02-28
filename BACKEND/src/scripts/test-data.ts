
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function generateTestData() {
  try {
    console.log('--- DÉBUT GÉNÉRATION DONNÉES DE TEST ---');

    // 1. Récupérer ou Créer un Utilisateur Admin
    let userId: number;
    const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', ['admin']);
    
    if (users.length > 0) {
      userId = users[0].id;
      console.log(`Utilisateur 'admin' trouvé (ID: ${userId})`);
    } else {
      console.log("Utilisateur 'admin' non trouvé. Création...");
      // Fetch role id for admin
        const [roles] = await pool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', ['admin']);
        let roleId = 1; // Fallback
        if (roles.length > 0) roleId = roles[0].id;

      // Note: Dans un vrai cas, on hasherait le mot de passe, ici c'est juste pour le test de FK
      const [res] = await pool.query<ResultSetHeader>('INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)', ['admin', 'admin123', roleId]);
      userId = res.insertId;
      console.log(`Utilisateur 'admin' créé (ID: ${userId})`);
    }

    // 2. Créer un Enseignant Test
    console.log("Création de l'enseignant test...");
    const [teacherRes] = await pool.query<ResultSetHeader>(`
      INSERT INTO teachers (first_name, last_name, email, department, status) 
      VALUES (?, ?, ?, ?, ?)
    `, ['Jean', 'DUPONT', `jean.dupont.${Date.now()}@test.com`, 'Informatique', 'active']);
    const teacherId = teacherRes.insertId;
    console.log(`Enseignant créé: Jean DUPONT (ID: ${teacherId})`);

    // 3. Créer une UE Test
    console.log("Création de l'UE test...");
    const ueCode = `INFO-${Date.now().toString().slice(-4)}`;
    const [ueRes] = await pool.query<ResultSetHeader>(`
      INSERT INTO ues (code, name, department, level, semester) 
      VALUES (?, ?, ?, ?, ?)
    `, [ueCode, 'Introduction à Angular', 'Informatique', 'Licence 3', 'S5']);
    const ueId = ueRes.insertId;
    console.log(`UE créée: ${ueCode} - Introduction à Angular (ID: ${ueId})`);

    // 4. Créer une Supervision Test liée
    console.log("Création de la supervision test...");
    const visitDate = new Date().toISOString().split('T')[0];
    const [supRes] = await pool.query<ResultSetHeader>(`
      INSERT INTO supervision_forms (
        user_id, teacher_id, ue_id, 
        visit_date, start_time, end_time, platform, 
        present_count, total_students, 
        observations, supervisor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, teacherId, ueId, 
      visitDate, '10:00:00', '12:00:00', 'Zoom', 
      25, 30, 
      'Test automatique de supervision avec relations.', 'Admin Système'
    ]);
    const supervisionId = supRes.insertId;
    console.log(`Supervision créée avec succès (ID: ${supervisionId})`);
    console.log(`Verification: Supervision #${supervisionId} -> Teacher #${teacherId} -> UE #${ueId}`);

    console.log('--- FIN GÉNÉRATION DONNÉES DE TEST ---');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la génération des données:', error);
    process.exit(1);
  }
}

generateTestData();
