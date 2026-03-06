import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

// Charge les variables d'environnement depuis le fichier .env
dotenv.config();

async function initDB() {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log('Connexion à MySQL réussie.');

    // Création de la base de données
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    console.log(`Base de données '${process.env.DB_NAME}' vérifiée/créée.`);

    // Utilisation de la base de données
    await connection.changeUser({ database: process.env.DB_NAME });

    // 1. Table Rôles (Nouveau)
    const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE, -- ex: 'admin', 'supervisor', 'user'
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createRolesTable);
    console.log('Table "roles" vérifiée/créée.');

    // Insertion des rôles par défaut
    const roles = ['admin', 'supervisor', 'user', 'assistant', 'enseignant'];
    for (const role of roles) {
        await connection.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [role]);
    }
    console.log('Rôles par défaut insérés.');

    // 2. Table Utilisateurs (Modifiée avec relation vers Roles)
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
      );
    `;
    await connection.query(createUsersTable);
    console.log('Table "users" vérifiée/créée.');

    // 2. Table Enseignants (Nouveau)
    const createTeachersTable = `
      CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        department VARCHAR(100),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await connection.query(createTeachersTable);
    console.log('Table "teachers" vérifiée/créée.');

    // 3. Table des Unités d'Enseignement (UEs)
    const createUEsTable = `
      CREATE TABLE IF NOT EXISTS ues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        responsible VARCHAR(255),
        department VARCHAR(100),
        modules_count INT DEFAULT 0,
        level VARCHAR(50),
        semester VARCHAR(10),
        phase VARCHAR(50),
        user_id INT, -- Ref to users(id) to know who created it (optional if all can see)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `;
    await connection.query(createUEsTable);
    console.log('Table "ues" vérifiée/créée.');

    // 4. Table Fiches de Supervision (Restructurée)
    const createSupervisionTable = `
      CREATE TABLE IF NOT EXISTS supervision_forms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT, -- L'utilisateur qui a créé la fiche (superviseur)
        
        -- Nouvelles relations
        teacher_id INT,
        ue_id INT,

        -- On garde les anciens champs pour la compatibilité temporaire ou les infos "one-shot"
        teacher_name VARCHAR(255), 
        module VARCHAR(255),

        level VARCHAR(100),
        session_number VARCHAR(50),
        visit_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        platform VARCHAR(100), -- Pourrait être une table 'salles' ou ENUM
        present_count INT DEFAULT 0,
        total_students INT DEFAULT 0,
        
        -- Aspects Techniques
        tech_internet VARCHAR(50),
        tech_audio_video VARCHAR(50),
        tech_punctuality VARCHAR(50),
        
        -- Aspects Pédagogiques
        ped_objectives VARCHAR(50),
        ped_content_mastery VARCHAR(50),
        ped_interaction VARCHAR(50),
        ped_tools_usage VARCHAR(50),
        
        observations TEXT,
        supervisor_name VARCHAR(255),
        
        -- Signatures
        supervisor_signature LONGTEXT,
        teacher_signature LONGTEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
        FOREIGN KEY (ue_id) REFERENCES ues(id) ON DELETE SET NULL
      );
    `;
    await connection.query(createSupervisionTable);
    console.log('Table "supervision_forms" vérifiée/créée.');

    // 5. Table Parcours
    const createParcoursQuery = `
      CREATE TABLE IF NOT EXISTS parcours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createParcoursQuery);
    console.log('Table "parcours" vérifiée/créée.');

    // 6. Table Classes
    const createClassesQuery = `
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        effectif INT NOT NULL,
        parcours_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parcours_id) REFERENCES parcours(id) ON DELETE SET NULL
      )
    `;
    await connection.query(createClassesQuery);
    console.log('Table "classes" vérifiée/créée.');

    // 7. Table Plannings
    const createPlanningsQuery = `
      CREATE TABLE IF NOT EXISTS plannings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parcours VARCHAR(255) NOT NULL,
        ue_id INT,
        teacher_id INT,
        
        title VARCHAR(255),
        description TEXT,
        
        date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        
        session_type VARCHAR(50) DEFAULT 'CM',
        platform VARCHAR(50),
        visio_link TEXT,
        status ENUM('À superviser', 'Supervisé', 'Annulé') DEFAULT 'À superviser',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (ue_id) REFERENCES ues(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
      )
    `;
    await connection.query(createPlanningsQuery);
    console.log('Table "plannings" vérifiée/créée.');


    // Ajouter ou mettre à jour un admin par défaut
    // On récupère l'ID du rôle admin
    const [adminRoleRows] = await connection.query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = (adminRoleRows as any[])[0]?.id;

    if (adminRoleId) {
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if ((rows as any[]).length === 0) {
            // Création
            await connection.query(
                'INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)',
                ['admin', 'admin123', adminRoleId]
            );
            console.log('Compte admin créé : admin / admin123');
        } else {
            // Mise à jour si nécessaire
             await connection.query(
                'UPDATE users SET password = ?, role_id = ? WHERE username = ?',
                ['admin123', adminRoleId, 'admin']
            );
            console.log('Compte admin mis à jour.');
        }
    } else {
        console.error("Erreur critique: Le rôle 'admin' n'a pas été trouvé.");
    }

    console.log('Initialisation de la base de données terminée avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    await connection.end();
  }
}

initDB();
